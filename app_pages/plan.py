import streamlit as st

from nett_data import from_aed, format_money, get_safe_to_spend, to_aed
from nett_ui import page_heading, safe_text, section_title


@st.dialog("Add debt")
def add_debt_dialog() -> None:
    with st.form("add_debt_dialog_form"):
        name = st.text_input("Who or what is it?", placeholder="e.g. Friend loan")
        kind = st.segmented_control("Debt type", ["Mandatory", "Flexible"], default="Mandatory")
        c1, c2 = st.columns(2)
        amount = c1.number_input("Outstanding", min_value=0.0, value=1000.0, step=100.0)
        currency = c2.selectbox("Currency", ["AED", "USD", "INR"])
        due = st.text_input("Due date or pace", placeholder="e.g. 30 Sep 2026 or Comfortable pace")
        submitted = st.form_submit_button("Save debt", type="primary", icon=":material/check:")
    if submitted:
        if not name.strip():
            st.error("Enter a debt name.", icon=":material/error:")
        else:
            st.session_state.debts.append(
                {
                    "name": name.strip(),
                    "kind": kind,
                    "outstanding": amount,
                    "currency": currency,
                    "due": due.strip() or "Set later",
                    "progress": 0,
                }
            )
            st.toast("Debt added", icon=":material/check_circle:")
            st.rerun()


@st.dialog("Add commitment")
def add_commitment_dialog() -> None:
    with st.form("add_commitment_dialog_form"):
        name = st.text_input("Commitment", placeholder="e.g. Visa renewal")
        kind = st.segmented_control("Importance", ["Mandatory", "Planned", "Optional"], default="Mandatory")
        date = st.text_input("Due date", placeholder="e.g. 20 Dec 2026")
        c1, c2 = st.columns(2)
        amount = c1.number_input("Amount", min_value=0.0, value=1000.0, step=100.0)
        reserved = c2.number_input("Already reserved", min_value=0.0, value=0.0, step=100.0)
        currency = st.selectbox("Currency", ["AED", "USD", "INR"])
        submitted = st.form_submit_button("Save commitment", type="primary", icon=":material/check:")
    if submitted:
        if not name.strip() or not date.strip():
            st.error("Enter a name and due date.", icon=":material/error:")
        elif reserved > amount:
            st.error("Reserved money cannot exceed the commitment amount.", icon=":material/error:")
        else:
            st.session_state.commitments.append(
                {
                    "name": name.strip(),
                    "date": date.strip(),
                    "amount": amount,
                    "currency": currency,
                    "kind": kind,
                    "reserved": reserved,
                }
            )
            st.toast("Commitment added", icon=":material/check_circle:")
            st.rerun()


page_heading(
    "Future money matters",
    "Plan",
    "Debts, reserves and commitments shape what you can safely use today.",
)

currency = st.session_state.display_currency
hidden = not st.session_state.show_balances
mandatory_aed = sum(to_aed(debt["outstanding"], debt["currency"]) for debt in st.session_state.debts if debt["kind"] == "Mandatory")
flexible_aed = sum(to_aed(debt["outstanding"], debt["currency"]) for debt in st.session_state.debts if debt["kind"] == "Flexible")
reserved_aed = sum(to_aed(item["reserved"], item["currency"]) for item in st.session_state.commitments)

summary1, summary2, summary3 = st.columns(3)
summary1.metric("Mandatory debt", format_money(from_aed(mandatory_aed, currency), currency, hidden), "Reduces primary net worth", delta_color="off")
summary2.metric("Flexible debt", format_money(from_aed(flexible_aed, currency), currency, hidden), "Shown separately by default", delta_color="off")
summary3.metric("Reserved", format_money(from_aed(reserved_aed, currency), currency, hidden), "Protected from spending", delta_color="off")

tab1, tab2, tab3 = st.tabs(["Debts", "Commitments", "What if?"])

with tab1:
    with st.container(horizontal=True, vertical_alignment="bottom"):
        debt_filter = st.segmented_control("Show", ["All", "Mandatory", "Flexible"], default="All", label_visibility="collapsed")
        if st.button("Add debt", type="primary", icon=":material/add:"):
            add_debt_dialog()
    filtered_debts = [debt for debt in st.session_state.debts if debt_filter == "All" or debt["kind"] == debt_filter]
    section_title("Debt overview", f"{len(filtered_debts)} shown")
    for debt in filtered_debts:
        with st.container(border=True):
            left, mid, right = st.columns([2.4, 1.5, 1.2], vertical_alignment="center")
            tone = "pink" if debt["kind"] == "Mandatory" else "amber"
            left.markdown(
                f"**{safe_text(debt['name'])}**  \n<span class='nett-pill {tone}'>{safe_text(debt['kind'])}</span> <span class='nett-muted'>{safe_text(debt['due'])}</span>",
                unsafe_allow_html=True,
            )
            mid.markdown(
                f"<div style='font-size:1.3rem;font-weight:600'>{safe_text(format_money(debt['outstanding'], debt['currency'], hidden))}</div><span class='nett-muted'>Outstanding</span>",
                unsafe_allow_html=True,
            )
            right.progress(debt["progress"])
            right.caption(f"{int(debt['progress'] * 100)}% repaid")

with tab2:
    with st.container(horizontal=True, horizontal_alignment="right"):
        if st.button("Add commitment", type="primary", icon=":material/add:"):
            add_commitment_dialog()
    section_title("Upcoming obligations", f"{len(st.session_state.commitments)} scheduled")
    for item in st.session_state.commitments:
        with st.container(border=True):
            left, mid, right = st.columns([2.3, 1.3, 1], vertical_alignment="center")
            left.markdown(
                f"**{safe_text(item['name'])}**  \n<span class='nett-muted'>{safe_text(item['date'])} · {safe_text(item['kind'])}</span>",
                unsafe_allow_html=True,
            )
            mid.markdown(
                f"<div style='font-size:1.25rem;font-weight:600'>{safe_text(format_money(item['amount'], item['currency'], hidden))}</div><span class='nett-muted'>{safe_text(format_money(item['reserved'], item['currency'], hidden))} reserved</span>",
                unsafe_allow_html=True,
            )
            funded = min(item["reserved"] / item["amount"], 1) if item["amount"] else 1
            right.progress(funded)
            right.caption(f"{int(funded * 100)}% funded")

with tab3:
    st.markdown("**Try a decision before it becomes a transaction.**")
    with st.container(border=True):
        current_safe_aed = get_safe_to_spend(st.session_state.accounts, st.session_state.commitments)
        purchase = st.number_input(
            f"Hypothetical purchase ({currency})",
            min_value=0,
            value=2500,
            step=250,
            key="what_if_purchase",
        )
        months = st.slider("When would it happen?", 0, 6, 1, format="in %d month(s)")
        projected_aed = current_safe_aed - to_aed(purchase, currency)
        projected_display = from_aed(projected_aed, currency)
        protected_buffer_aed = 5000
        comfortable = projected_aed >= protected_buffer_aed
        c1, c2 = st.columns(2)
        c1.metric(
            "Safe to spend after",
            format_money(projected_display, currency, hidden),
            f"in {months} month(s)",
            delta_color="off",
        )
        c2.metric(
            "Decision",
            "Comfortable" if comfortable else "Review first",
            f"Protected buffer: {format_money(from_aed(protected_buffer_aed, currency), currency)}",
            delta_color="normal" if comfortable else "inverse",
        )
        remaining_ratio = max(min(projected_aed / current_safe_aed, 1), 0) if current_safe_aed else 0
        st.progress(remaining_ratio)
        st.caption("Shows the immediate effect on Safe to Spend. Forecasted income and future debt payments come in the full MVP model.")
