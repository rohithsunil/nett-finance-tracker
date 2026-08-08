import pandas as pd
import streamlit as st

from nett_data import signed_money
from nett_ui import page_heading, safe_text, section_title


@st.dialog("Add transaction")
def add_transaction_dialog() -> None:
    st.caption("Use transfers from Accounts so they never count as income or spending.")
    with st.form("add_transaction_dialog_form"):
        flow = st.segmented_control("Type", ["Money out", "Money in"], default="Money out")
        name = st.text_input("Description", placeholder="e.g. Client payment")
        categories = ["Food", "Transport", "Home", "Business", "Shopping", "Other"] if flow == "Money out" else ["Income", "Receivable", "Refund", "Other"]
        category = st.selectbox("Category", categories)
        c1, c2 = st.columns(2)
        amount = c1.number_input("Amount", min_value=0.0, value=100.0, step=10.0)
        currency = c2.selectbox("Currency", ["AED", "USD", "INR"])
        account = st.selectbox("Account", [account["name"] for account in st.session_state.accounts if account["type"] != "Credit card"])
        space = st.selectbox("Space", ["Personal", "Home", "Car", "8px Studio"])
        submitted = st.form_submit_button("Save transaction", type="primary", icon=":material/check:")
    if submitted:
        if not name.strip():
            st.error("Enter a description.", icon=":material/error:")
        elif amount <= 0:
            st.error("Enter an amount greater than zero.", icon=":material/error:")
        else:
            is_income = flow == "Money in"
            st.session_state.transactions.insert(
                0,
                {
                    "date": "Today",
                    "name": name.strip(),
                    "category": category,
                    "account": account,
                    "amount": amount if is_income else -amount,
                    "currency": currency,
                    "kind": "credit" if is_income else "debit",
                    "space": space,
                },
            )
            st.toast("Transaction added", icon=":material/check_circle:")
            st.rerun()


page_heading(
    "Selective tracking, not bookkeeping",
    "Activity",
    "Log the moments that matter. Transfers remain separate from income and spending.",
)

with st.container(horizontal=True, vertical_alignment="bottom"):
    search = st.text_input(
        "Search activity",
        placeholder="Search by description, category or account",
        label_visibility="collapsed",
        key="activity_search",
    )
    flow_filter = st.segmented_control(
        "Flow",
        ["All", "Money in", "Money out", "Transfers"],
        default="All",
        label_visibility="collapsed",
        key="activity_flow_filter",
    )
    if st.button("Add transaction", type="primary", icon=":material/add:"):
        add_transaction_dialog()

filtered = list(st.session_state.transactions)
if search:
    query = search.lower()
    filtered = [item for item in filtered if query in f"{item['name']} {item['category']} {item['account']} {item['space']}".lower()]
if flow_filter == "Money in":
    filtered = [item for item in filtered if item["kind"] == "credit"]
elif flow_filter == "Money out":
    filtered = [item for item in filtered if item["kind"] == "debit"]
elif flow_filter == "Transfers":
    filtered = [item for item in filtered if item["kind"] == "transfer"]

section_title("Transaction history", f"{len(filtered)} entries")
if not filtered:
    st.html('<div class="nett-empty"><strong>No matching activity</strong><br><span>Try a different search or flow filter.</span></div>')
else:
    with st.container(key="mobile_activity_list"):
        for item in filtered:
            amount = signed_money(item["amount"], item["currency"], not st.session_state.show_balances)
            direction = "↔" if item["kind"] == "transfer" else ("+" if item["amount"] >= 0 else "−")
            st.html(
                f'''<div class="nett-transaction"><div><span class="nett-icon">{direction}</span><strong>{safe_text(item["name"])}</strong><div class="nett-muted" style="margin-left:3.15rem">{safe_text(item["category"])} · {safe_text(item["date"])} · {safe_text(item["space"])}</div></div><div style="text-align:right"><strong>{safe_text(amount)}</strong><div class="nett-muted">{safe_text(item["account"])}</div></div></div>'''
            )

    with st.container(key="desktop_activity_table"):
        rows = [
            {
                "Date": item["date"],
                "Description": item["name"],
                "Category": item["category"],
                "Space": item["space"],
                "Account": item["account"],
                "Amount": signed_money(item["amount"], item["currency"], not st.session_state.show_balances),
            }
            for item in filtered
        ]
        st.dataframe(
            pd.DataFrame(rows),
            hide_index=True,
            width="stretch",
            height=420,
            column_config={
                "Description": st.column_config.TextColumn("Description", pinned=True),
                "Amount": st.column_config.TextColumn("Amount", width="small"),
            },
            key="activity_table",
        )

st.caption("Original currency values are preserved. Demo changes last for this session only.")
