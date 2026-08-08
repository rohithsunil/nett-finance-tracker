import streamlit as st

from nett_data import from_aed, format_money, get_total_cash, to_aed
from nett_ui import page_heading, safe_text, section_title


@st.dialog("Add account")
def add_account_dialog() -> None:
    st.caption("Add the balance you want Nett to include in your monthly check-in.")
    with st.form("add_account_dialog_form"):
        name = st.text_input("Account name", placeholder="e.g. Wise wallet")
        account_type = st.selectbox("Type", ["Bank account", "Cash wallet", "Credit card"])
        currency = st.selectbox("Currency", ["AED", "USD", "INR"])
        balance_label = "Outstanding balance" if account_type == "Credit card" else "Current balance"
        balance = st.number_input(balance_label, min_value=0.0, value=0.0, step=100.0)
        submitted = st.form_submit_button("Save account", type="primary", icon=":material/check:")
    if submitted:
        if not name.strip():
            st.error("Enter an account name.", icon=":material/error:")
        elif any(account["name"].casefold() == name.strip().casefold() for account in st.session_state.accounts):
            st.error("An account with this name already exists.", icon=":material/error:")
        else:
            stored_balance = -balance if account_type == "Credit card" else balance
            st.session_state.accounts.append(
                {
                    "name": name.strip(),
                    "type": account_type,
                    "currency": currency,
                    "balance": stored_balance,
                    "verified": "Today",
                    "color": "#ded7ff",
                }
            )
            st.toast(f"{name.strip()} added", icon=":material/check_circle:")
            st.rerun()


@st.dialog("Transfer between accounts")
def transfer_dialog() -> None:
    eligible = [account for account in st.session_state.accounts if account["type"] != "Credit card"]
    if len(eligible) < 2:
        st.warning("Add at least two cash accounts before creating a transfer.")
        return
    names = [account["name"] for account in eligible]
    with st.form("transfer_dialog_form"):
        source_name = st.selectbox("From", names)
        destination_name = st.selectbox("To", names, index=1)
        source = next(account for account in eligible if account["name"] == source_name)
        destination = next(account for account in eligible if account["name"] == destination_name)
        source_amount = st.number_input(f"Amount sent ({source['currency']})", min_value=0.0, value=500.0, step=50.0)
        received_amount = st.number_input(f"Amount received ({destination['currency']})", min_value=0.0, value=500.0, step=50.0)
        fee = st.number_input(f"Fee ({source['currency']})", min_value=0.0, value=0.0, step=5.0)
        submitted = st.form_submit_button("Save transfer", type="primary", icon=":material/swap_horiz:")
    if submitted:
        if source_name == destination_name:
            st.error("Choose two different accounts.", icon=":material/error:")
        elif source_amount + fee > source["balance"]:
            st.error("The source account does not have enough available balance.", icon=":material/error:")
        elif source_amount <= 0 or received_amount <= 0:
            st.error("Enter both the sent and received amounts.", icon=":material/error:")
        else:
            source["balance"] -= source_amount + fee
            destination["balance"] += received_amount
            st.session_state.transactions.insert(
                0,
                {
                    "date": "Today",
                    "name": f"Transfer to {destination_name}",
                    "category": "Internal transfer",
                    "account": source_name,
                    "amount": -source_amount,
                    "currency": source["currency"],
                    "kind": "transfer",
                    "space": "Personal",
                },
            )
            st.toast("Transfer saved without counting as spending", icon=":material/check_circle:")
            st.rerun()


@st.dialog("Account details")
def account_details_dialog(account: dict) -> None:
    is_card = account["type"] == "Credit card"
    amount = abs(account["balance"]) if is_card else account["balance"]
    st.caption(f"{account['type']} · {account['currency']}")
    st.metric("Outstanding" if is_card else "Current balance", format_money(amount, account["currency"], not st.session_state.show_balances))
    st.write(f"Last verified: **{account['verified']}**")
    if st.button("Verify this balance", type="primary", icon=":material/verified:", width="stretch"):
        account["verified"] = "Today"
        st.toast("Balance marked as verified", icon=":material/check_circle:")
        st.rerun()


page_heading(
    "One source, many views",
    "Accounts",
    "Original currencies are preserved. Conversion is used only for combined totals.",
)

with st.container(horizontal=True):
    if st.button("Add account", type="primary", icon=":material/add:"):
        add_account_dialog()
    if st.button("Transfer", icon=":material/swap_horiz:"):
        transfer_dialog()
    if st.button("Verify all", icon=":material/verified:"):
        for item in st.session_state.accounts:
            item["verified"] = "Today"
        st.session_state.checkin_progress = 1.0
        st.toast("All account balances are verified", icon=":material/check_circle:")
        st.rerun()

currency = st.session_state.display_currency
cash_total = get_total_cash(st.session_state.accounts)
credit_outstanding = sum(abs(to_aed(account["balance"], account["currency"])) for account in st.session_state.accounts if account["type"] == "Credit card")
currency_count = len({account["currency"] for account in st.session_state.accounts})

st.space("small")
m1, m2, m3 = st.columns(3)
m1.metric("Combined cash", format_money(from_aed(cash_total, currency), currency, not st.session_state.show_balances), "+4.8% this month")
m2.metric("Card outstanding", format_money(from_aed(credit_outstanding, currency), currency, not st.session_state.show_balances), "Included in mandatory debt", delta_color="off")
stale_count = sum(1 for account in st.session_state.accounts if account["verified"] != "Today")
m3.metric("Freshness", "All fresh" if stale_count == 0 else "Mostly fresh", "No review needed" if stale_count == 0 else f"{stale_count} need review", delta_color="off")

section_title("All accounts", f"{len(st.session_state.accounts)} accounts · {currency_count} currencies")
for account in st.session_state.accounts:
    is_card = account["type"] == "Credit card"
    amount = abs(account["balance"]) if is_card else account["balance"]
    balance_label = "Outstanding" if is_card else "Available"
    status_tone = "green" if account["verified"] == "Today" else "amber"
    with st.container(border=True):
        left, mid, right = st.columns([3, 2, 1], vertical_alignment="center")
        left.markdown(
            f"<span class='nett-account-dot' style='background:{safe_text(account['color'])}'></span>**{safe_text(account['name'])}**  \n<span class='nett-muted'>{safe_text(account['type'])} · {safe_text(account['currency'])}</span>",
            unsafe_allow_html=True,
        )
        mid.markdown(
            f"<div style='font-size:1.3rem;font-weight:600'>{safe_text(format_money(amount, account['currency'], not st.session_state.show_balances))}</div><span class='nett-muted'>{balance_label} · </span><span class='nett-pill {status_tone}'>{safe_text(account['verified'])}</span>",
            unsafe_allow_html=True,
        )
        if right.button("Details", key=f"open_{account['name']}", icon=":material/chevron_right:"):
            account_details_dialog(account)
