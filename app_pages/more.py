import json

import pandas as pd
import streamlit as st

from nett_ui import page_heading, safe_text, section_title


def sync_workspace() -> None:
    st.session_state.workspace = st.session_state.more_workspace


def sync_currency() -> None:
    st.session_state.display_currency = st.session_state.more_currency


st.session_state.setdefault("more_workspace", st.session_state.workspace)
st.session_state.setdefault("more_currency", st.session_state.display_currency)
if st.session_state.more_workspace != st.session_state.workspace:
    st.session_state.more_workspace = st.session_state.workspace
if st.session_state.more_currency != st.session_state.display_currency:
    st.session_state.more_currency = st.session_state.display_currency

page_heading(
    "Control, portability and trust",
    "Settings & data",
    "Manage how Nett looks at your money and keep a portable copy of your data.",
)

left, right = st.columns([1.35, 1], gap="large")
with left:
    section_title("Snapshot history", f"{len(st.session_state.snapshots)} saved")
    latest = st.session_state.snapshots[-1]
    previous = st.session_state.snapshots[-2]
    change = latest["net_worth"] - previous["net_worth"]
    st.metric(
        "Latest primary net worth",
        f"AED {latest['net_worth']:,.0f}",
        f"AED {change:,.0f} since {previous['month']}",
        chart_data=[snapshot["net_worth"] for snapshot in st.session_state.snapshots],
        chart_type="line",
        border=True,
    )
    for snapshot in reversed(st.session_state.snapshots):
        with st.container(border=True):
            c1, c2 = st.columns([1, 1], vertical_alignment="center")
            c1.markdown(
                f"**{safe_text(snapshot['month'])} 2026**  \n<span class='nett-muted'>Verified monthly snapshot</span>",
                unsafe_allow_html=True,
            )
            c2.markdown(
                f"<div style='font-size:1.3rem;font-weight:600'>AED {snapshot['net_worth']:,.0f}</div><span class='nett-muted'>Primary net worth</span>",
                unsafe_allow_html=True,
            )

    section_title("Export your data", "No lock-in")
    full_payload = json.dumps(
        {
            "accounts": st.session_state.accounts,
            "transactions": st.session_state.transactions,
            "debts": st.session_state.debts,
            "commitments": st.session_state.commitments,
            "snapshots": st.session_state.snapshots,
        },
        indent=2,
    )
    transactions_csv = pd.DataFrame(st.session_state.transactions).to_csv(index=False)
    with st.container(horizontal=True):
        st.download_button(
            "Full JSON backup",
            full_payload,
            file_name="nett-demo-backup.json",
            mime="application/json",
            icon=":material/download:",
        )
        st.download_button(
            "Transactions CSV",
            transactions_csv,
            file_name="nett-transactions.csv",
            mime="text/csv",
            icon=":material/table_view:",
        )

with right:
    section_title("View preferences")
    with st.container(border=True):
        st.selectbox(
            "Workspace",
            ["Everything", "Personal", "8px Studio"],
            key="more_workspace",
            on_change=sync_workspace,
        )
        st.selectbox(
            "Display currency",
            ["AED", "USD", "INR"],
            key="more_currency",
            on_change=sync_currency,
        )
        st.toggle("Monthly check-in reminders", key="monthly_reminders")
        st.toggle("Include flexible debt in the all-debt view", key="include_flexible_debt")
        st.caption("These preferences affect this demo session immediately.")

    section_title("Data & privacy")
    with st.container(border=True):
        st.badge("Local demo", color="violet", icon=":material/shield:")
        st.markdown("### Your data stays in this session")
        st.write("This prototype does not have accounts or cloud storage connected. Nothing entered here is shared with another Nett user.")
        st.caption("For the MVP, authentication, encrypted storage and row-level access controls will protect every user-owned record.")

    section_title("About this build")
    with st.container(border=True):
        st.markdown("**Nett product prototype**")
        st.caption("Version 0.1 · Product experience preview")
        st.write("Designed around monthly verification, multi-currency life and a clear distinction between mandatory and flexible obligations.")
