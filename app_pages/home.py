import altair as alt
import pandas as pd
import streamlit as st

from nett_data import (
    from_aed,
    format_money,
    get_primary_net_worth,
    get_safe_to_spend,
    get_total_cash,
    signed_money,
    to_aed,
)
from nett_ui import mobile_topbar, safe_text, section_title


currency = st.session_state.display_currency
hidden = not st.session_state.show_balances
accounts = st.session_state.accounts
debts = st.session_state.debts
commitments = st.session_state.commitments
transactions = st.session_state.transactions

mobile_topbar("Fresh today" if st.session_state.checkin_progress == 1 else "Mostly fresh")
header_left, header_right = st.columns([5, 1.15], vertical_alignment="bottom")
with header_left:
    st.markdown('<div class="nett-kicker">Friday, 08 August 2026 · monthly cockpit</div>', unsafe_allow_html=True)
    st.title("Good evening, Rohith.")
    st.caption(f"Your data is {'fully up to date' if st.session_state.checkin_progress == 1 else 'mostly fresh'} · Last check-in: {st.session_state.last_checkin}")
with header_right:
    with st.container(key="privacy_toggle"):
        privacy_label = "Hide balances" if st.session_state.show_balances else "Show balances"
        privacy_icon = ":material/visibility:" if st.session_state.show_balances else ":material/visibility_off:"
        if st.button(privacy_label, icon=privacy_icon, width="stretch"):
            st.session_state.show_balances = not st.session_state.show_balances
            st.rerun()

cash = get_total_cash(accounts)
primary_net_worth = get_primary_net_worth(accounts, debts, st.session_state.investment_value_aed)
safe_to_spend = get_safe_to_spend(accounts, commitments)
display_net_worth = from_aed(primary_net_worth, currency)
display_safe_to_spend = from_aed(safe_to_spend, currency)
display_cash = from_aed(cash, currency)

st.space("small")
card1, card2, card3 = st.columns([1.35, 1, 1], gap="medium")
with card1:
    st.html(
        f'''<div class="nett-card gradient"><div class="nett-row"><span class="nett-kicker">Primary net worth</span><span class="nett-chip">+7.4% this month</span></div><div class="nett-value">{format_money(display_net_worth, currency, hidden)}</div><div class="nett-muted">Cash + investments − mandatory debt</div></div>'''
    )
with card2:
    st.html(
        f'''<div class="nett-card dark"><div class="nett-kicker">Safe to spend</div><div class="nett-value small">{format_money(display_safe_to_spend, currency, hidden)}</div><div class="nett-muted">After reserves and unfunded essentials</div></div>'''
    )
with card3:
    cash_accounts = sum(1 for account in accounts if account["balance"] > 0)
    currencies = len({account["currency"] for account in accounts if account["balance"] > 0})
    st.html(
        f'''<div class="nett-card soft"><div class="nett-kicker">Liquid cash</div><div class="nett-value small">{format_money(display_cash, currency, hidden)}</div><div class="nett-muted">Across {cash_accounts} accounts · {currencies} currencies</div></div>'''
    )

left, right = st.columns([1.65, 1], gap="large")
with left:
    section_title("Net worth trend", "6 verified snapshots")
    month_numbers = {"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12}
    chart_data = pd.DataFrame(st.session_state.snapshots)
    chart_data["date"] = pd.to_datetime(chart_data["month"].map(lambda month: f"2026-{month_numbers[month]:02d}-01"))
    month_order = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"]
    chart = (
        alt.Chart(chart_data)
        .mark_area(
            line={"color": "#8f6fd8", "strokeWidth": 2.5},
            color=alt.Gradient(
                gradient="linear",
                stops=[
                    alt.GradientStop(color="#a784ef", offset=0),
                    alt.GradientStop(color="#eadffd", offset=1),
                ],
                x1=1,
                x2=1,
                y1=1,
                y2=0,
            ),
        )
        .encode(
            x=alt.X("month:N", title=None, sort=month_order, axis=alt.Axis(labelAngle=0, grid=False)),
            y=alt.Y("net_worth:Q", title="Net worth (AED)", scale=alt.Scale(zero=False)),
            tooltip=[alt.Tooltip("date:T", title="Month", format="%B %Y"), alt.Tooltip("net_worth:Q", title="Net worth", format=",.0f")],
        )
        .properties(height=250)
    )
    st.altair_chart(chart)
    st.caption("Historical snapshots stay unchanged when exchange rates change.")

    section_title("Recent activity", "Latest 4")
    for item in transactions[:4]:
        direction = "+" if item["amount"] >= 0 else "−"
        amount = signed_money(item["amount"], item["currency"], hidden)
        st.html(
            f'''<div class="nett-transaction"><div><span class="nett-icon">{direction}</span><strong>{safe_text(item["name"])}</strong><div class="nett-muted" style="margin-left:3.15rem">{safe_text(item["category"])} · {safe_text(item["date"])}</div></div><div style="text-align:right"><strong>{safe_text(amount)}</strong><div class="nett-muted">{safe_text(item["account"])}</div></div></div>'''
        )
with right:
    section_title("Monthly check-in", f"{int(st.session_state.checkin_progress * 100)}% complete")
    with st.container(border=True):
        st.markdown("**Your August snapshot is nearly ready**" if st.session_state.checkin_progress < 1 else "**August snapshot is ready**")
        st.progress(st.session_state.checkin_progress)
        if st.session_state.checkin_progress < 1:
            st.caption("Verify 1 account and review 2 future obligations before saving.")
            if st.button("Finish check-in", type="primary", icon=":material/task_alt:", width="stretch"):
                for account in st.session_state.accounts:
                    account["verified"] = "Today"
                st.session_state.checkin_progress = 1.0
                st.session_state.last_checkin = "08 Aug 2026"
                st.toast("August check-in is ready", icon=":material/check_circle:")
                st.rerun()
        else:
            st.caption("All balances and obligations have been reviewed.")
            st.badge("Ready to save", color="green", icon=":material/check:")

    section_title("Coming up", "Next 90 days")
    with st.container(border=True):
        for item in commitments:
            tone = "pink" if item["kind"] == "Mandatory" else "amber"
            funded = min(int(item["reserved"] / item["amount"] * 100), 100) if item["amount"] else 100
            st.html(
                f'''<div class="nett-transaction"><div><strong>{safe_text(item["name"])}</strong><div class="nett-muted">{safe_text(item["date"])} · {safe_text(item["kind"])}</div></div><div style="text-align:right"><strong>{safe_text(format_money(item["amount"], item["currency"], hidden))}</strong><div class="nett-pill {tone}">{funded}% funded</div></div></div>'''
            )

    section_title("Flexible obligations")
    flexible = sum(to_aed(debt["outstanding"], debt["currency"]) for debt in debts if debt["kind"] == "Flexible")
    flexible_display = from_aed(flexible, currency)
    st.html(
        f'''<div class="nett-card soft"><div class="nett-kicker">Outside primary net worth</div><div class="nett-value small">{format_money(flexible_display, currency, hidden)}</div><div class="nett-muted">Visible for planning, excluded from your primary number by default.</div></div>'''
    )
