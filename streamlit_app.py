from copy import deepcopy

import streamlit as st

from nett_data import DEFAULT_STATE


st.set_page_config(
    page_title="Nett — personal finance OS",
    page_icon=":material/account_balance_wallet:",
    layout="wide",
    initial_sidebar_state="expanded",
)


def inject_styles() -> None:
    st.html(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600&display=swap');

        :root {
            --nett-ink: #171719;
            --nett-muted: #77777f;
            --nett-line: #e9e9ed;
            --nett-soft: #f7f7f9;
            --nett-lilac: #a784ef;
            --nett-shadow: 0 10px 30px rgba(30, 24, 52, .06);
        }

        html, body, [class*="css"] { font-family: 'DM Sans', sans-serif; }
        h1, h2, h3 { letter-spacing: -0.04em; }
        h1 { font-weight: 600; }
        .block-container { padding: 2.25rem 3rem 3.5rem; max-width: 1320px; }
        [data-testid="stSidebar"] { border-right: 1px solid var(--nett-line); background: rgba(250,250,252,.96); }
        [data-testid="stSidebar"] > div:first-child { padding-top: 1.25rem; height: 100vh; overflow-y: auto; }
        [data-testid="stSidebarNavLink"][aria-current="page"] { background: #ece7fb; border-radius: 12px; font-weight: 700; }
        [data-testid="stSidebar"] .stRadio label { padding: .35rem .5rem; border-radius: 10px; }
        [data-testid="stSidebar"] .stRadio label:hover { background: #f3f1ff; }
        [data-testid="stMetric"] { background: var(--nett-soft); border: 1px solid var(--nett-line); border-radius: 18px; padding: 1rem 1.1rem; }
        [data-testid="stMetricLabel"] { color: var(--nett-muted); }
        [data-testid="stMetricValue"] { letter-spacing: -0.05em; }
        .stButton button, .stDownloadButton button { border-radius: 999px; min-height: 2.55rem; font-weight: 600; }
        .stButton button[kind="primary"] { background: var(--nett-ink); border-color: var(--nett-ink); }
        .stTextInput input, .stNumberInput input, .stSelectbox [data-baseweb="select"] > div { border-radius: 12px; }
        .nett-logo { font-size: 1.65rem; font-weight: 700; letter-spacing: -.07em; margin-bottom: 1.75rem; }
        .nett-logo span { color: #a784ef; }
        .nett-kicker { color: var(--nett-muted); font-size: .78rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
        [data-testid="stVerticalBlockBorderWrapper"] { border-radius: 20px; box-shadow: 0 1px 0 rgba(23,23,25,.02); }
        [data-testid="stDataFrame"] { border-radius: 18px; overflow: hidden; }
        [data-testid="stTabs"] [role="tablist"] { gap: .25rem; background: var(--nett-soft); padding: .28rem; border-radius: 999px; width: fit-content; }
        [data-testid="stTabs"] button[role="tab"] { border-radius: 999px !important; padding: .45rem .85rem !important; }
        [data-testid="stTabs"] button[role="tab"][aria-selected="true"] { background: white !important; box-shadow: 0 2px 8px rgba(23,23,25,.08); }
        [data-testid="stTabs"] [data-baseweb="tab-highlight"] { display:none; }
        .nett-card { border: 1px solid var(--nett-line); border-radius: 24px; padding: 1.3rem 1.4rem; background: white; min-height: 9.1rem; box-shadow: var(--nett-shadow); }
        .nett-card.soft { background: var(--nett-soft); }
        .nett-card.gradient { background: linear-gradient(135deg, #ffe2ef 0%, #e7ddff 52%, #d8f1c6 100%); border-color: transparent; }
        .nett-card.dark { background: var(--nett-ink); color: white; border-color: var(--nett-ink); }
        .nett-card h3 { margin: .25rem 0 .75rem; font-size: 1.05rem; }
        .nett-value { font-size: clamp(2.2rem, 4vw, 4rem); line-height: 1; font-weight: 600; letter-spacing: -.07em; }
        .nett-value.small { font-size: 1.9rem; }
        .nett-muted { color: var(--nett-muted); font-size: .86rem; }
        .nett-card.dark .nett-muted { color: #bcbcc4; }
        .nett-chip { display: inline-block; padding: .3rem .6rem; border-radius: 999px; background: rgba(255,255,255,.65); font-size: .72rem; font-weight: 600; }
        .nett-row { display:flex; justify-content:space-between; gap:1rem; align-items:center; }
        .nett-section-title { display:flex; justify-content:space-between; align-items:baseline; gap:1rem; margin: 1.7rem 0 .65rem; font-size: 1.05rem; font-weight: 700; letter-spacing: -.03em; }
        .nett-section-meta { color:var(--nett-muted); font-size:.78rem; font-weight:500; letter-spacing:0; white-space:nowrap; }
        .nett-transaction { display:flex; justify-content:space-between; align-items:center; padding: .8rem 0; border-bottom: 1px solid var(--nett-line); }
        .nett-transaction:last-child { border-bottom: 0; }
        .nett-icon { width: 2.35rem; height: 2.35rem; border-radius: 12px; display:inline-flex; align-items:center; justify-content:center; background:#f1eefb; margin-right:.7rem; }
        .nett-pill { display:inline-block; border-radius:999px; padding:.28rem .55rem; font-size:.72rem; font-weight:600; background:#f1f1f4; }
        .nett-pill.green { background:#e8f7d5; color:#4e732d; }
        .nett-pill.amber { background:#fff1c9; color:#7c5d15; }
        .nett-pill.pink { background:#ffe4f0; color:#9b4774; }
        .nett-status-dot { display:inline-block; width:.48rem; height:.48rem; border-radius:50%; background:#7ebf55; box-shadow:0 0 0 4px #edf8df; margin-right:.45rem; }
        .nett-account-dot { display:inline-block; width:.7rem; height:.7rem; border-radius:50%; margin-right:.55rem; vertical-align:middle; }
        .nett-empty { padding: 2.25rem 1rem; text-align:center; color:var(--nett-muted); border:1px dashed var(--nett-line); border-radius:18px; }
        .st-key-mobile_activity_list { display:none; }
        .desktop-context { margin: .75rem 0 1.15rem; padding: .8rem .9rem; border: 1px solid var(--nett-line); border-radius: 16px; background: linear-gradient(135deg, #faf8ff, #fff7fb); }
        .desktop-context-title { color: var(--nett-muted); font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; }
        .desktop-context-value { display:flex; justify-content:space-between; align-items:center; margin-top:.35rem; font-size:.88rem; font-weight:600; }
        .desktop-context-progress { height: 4px; border-radius: 999px; background: #ece8fa; overflow:hidden; margin-top:.65rem; }
        .desktop-context-progress span { display:block; width:82%; height:100%; border-radius:999px; background: linear-gradient(90deg, #c7a9f7, #f0a5c9); }
        .mobile-topbar, .st-key-mobile_nav { display: none; }
        #MainMenu, footer, [data-testid="stToolbar"], [data-testid="stDecoration"] { visibility: hidden; height: 0; }
        @media (max-width: 800px) {
            .block-container { padding: 1.15rem 1rem 7.5rem; max-width: 100%; }
            [data-testid="stSidebar"] { display: none; }
            [data-testid="stSidebarCollapsedControl"] { display: none; }
            [data-testid="stHorizontalBlock"] { flex-direction: column; gap: .8rem; }
            [data-testid="stHorizontalBlock"] > [data-testid="stColumn"] { width: 100% !important; flex: 1 1 100% !important; min-width: 100% !important; }
            .st-key-mobile_nav [data-testid="stHorizontalBlock"] { flex-direction: row; gap: 0; }
            .st-key-mobile_nav [data-testid="stColumn"] { width: auto !important; min-width: 0 !important; flex: 1 1 0 !important; }
            .mobile-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.1rem; }
            .mobile-topbar-logo { font-size: 1.35rem; font-weight: 700; letter-spacing: -.08em; }
            .mobile-topbar-logo span { color: #a784ef; }
            .mobile-topbar-meta { display: flex; align-items: center; gap: .45rem; color: var(--nett-muted); font-size: .72rem; }
            .mobile-topbar-dot { width: .42rem; height: .42rem; border-radius: 50%; background: #a9d77a; box-shadow: 0 0 0 4px #edf8df; }
            .nett-card { border-radius: 20px; padding: 1.1rem 1.15rem; }
            .nett-value { font-size: 2.7rem; }
            .nett-value.small { font-size: 2.1rem; }
            .nett-section-title { margin-top: 1.3rem; }
            .st-key-mobile_nav { display: flex !important; flex-direction: row !important; align-items: center; position: fixed; z-index: 1000; left: 1rem; width: calc(100% - 2rem) !important; box-sizing: border-box; bottom: max(.9rem, env(safe-area-inset-bottom)); padding: .35rem; border: 1px solid rgba(230,230,237,.92); border-radius: 999px; background: rgba(255,255,255,.88); box-shadow: 0 12px 32px rgba(25, 22, 48, .15); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
            .st-key-mobile_nav > [data-testid="stElementContainer"] { flex: 1 1 0 !important; width: auto !important; min-width: 0 !important; }
            .st-key-mobile_nav [data-testid="stPageLink"] { width: 100%; }
            .st-key-mobile_nav [data-testid="stPageLink-NavLink"] { min-height: 3rem; padding: .35rem .15rem; border-radius: 999px; justify-content: center; color: #85838d; font-size: .62rem; font-weight: 600; gap: .08rem; text-decoration: none; white-space: nowrap; overflow: visible; }
            .st-key-mobile_nav [data-testid="stPageLink-NavLink"] p { font-size: .62rem; white-space: nowrap; letter-spacing: -.015em; }
            .st-key-mobile_nav [data-testid="stPageLink-NavLink"]:hover { background: #f7f5ff; color: #171719; }
            .st-key-mobile_nav [data-testid="stPageLink-NavLink"] svg { width: 1.05rem; height: 1.05rem; }
            .st-key-mobile_nav [data-testid="stPageLink-NavLink"]:nth-of-type(3) { background: #171719; color: white; box-shadow: 0 6px 14px rgba(23,23,25,.18); }
        }
        @media (min-width: 1025px) {
            [data-testid="stSidebar"] { transform: translateX(0) !important; min-width: 17.5rem !important; width: 17.5rem !important; flex-shrink: 0 !important; }
            [data-testid="stSidebarCollapseButton"], [data-testid="stSidebarCollapsedControl"] { display:none !important; }
            [data-testid="stSidebarContent"] { display:flex; flex-direction:column; }
            [data-testid="stSidebarHeader"] { order:0; }
            [data-testid="stSidebarUserContent"] { order:1; }
            [data-testid="stSidebarNav"] { order:2; margin-top:1rem; padding-top:.85rem; border-top:1px solid var(--nett-line); }
        }
        @media (min-width: 801px) and (max-width: 1024px) {
            .block-container { padding: 1.5rem 2rem 7.5rem; max-width: 100%; }
            [data-testid="stSidebar"], [data-testid="stSidebarCollapsedControl"] { display:none !important; }
            .mobile-topbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.1rem; }
            .mobile-topbar-logo { font-size:1.35rem; font-weight:700; letter-spacing:-.08em; }
            .mobile-topbar-logo span { color:var(--nett-lilac); }
            .mobile-topbar-meta { display:flex; align-items:center; gap:.45rem; color:var(--nett-muted); font-size:.72rem; }
            .mobile-topbar-dot { width:.42rem; height:.42rem; border-radius:50%; background:#a9d77a; box-shadow:0 0 0 4px #edf8df; }
            .st-key-mobile_nav { display:flex !important; flex-direction:row !important; align-items:center; position:fixed; z-index:1000; left:1rem; width:calc(100% - 2rem) !important; box-sizing:border-box; bottom:max(.9rem, env(safe-area-inset-bottom)); padding:.35rem; border:1px solid rgba(230,230,237,.92); border-radius:999px; background:rgba(255,255,255,.9); box-shadow:0 12px 32px rgba(25,22,48,.15); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); }
            .st-key-mobile_nav > [data-testid="stElementContainer"] { flex:1 1 0 !important; width:auto !important; min-width:0 !important; }
            .st-key-mobile_nav [data-testid="stPageLink"] { width:100%; }
            .st-key-mobile_nav [data-testid="stPageLink-NavLink"] { min-height:3rem; padding:.35rem .15rem; border-radius:999px; justify-content:center; color:#85838d; font-size:.62rem; font-weight:600; gap:.08rem; text-decoration:none; white-space:nowrap; }
            .st-key-mobile_nav [data-testid="stPageLink-NavLink"] p { font-size:.62rem; white-space:nowrap; }
        }
        @media (max-width: 1024px) {
            .st-key-mobile_nav [data-testid="stPageLink-NavLink"] { background:transparent; color:#85838d; box-shadow:none; }
            .st-key-mobile_nav [data-testid="stPageLink-NavLink"][aria-current="page"] { background:#171719; color:white; box-shadow:0 6px 14px rgba(23,23,25,.18); }
        }
        @media (max-width: 700px) {
            .block-container { padding:1rem 1rem 7.5rem; }
            [data-testid="stHorizontalBlock"] { flex-direction:column; gap:.8rem; }
            [data-testid="stHorizontalBlock"] > [data-testid="stColumn"] { width:100% !important; flex:1 1 100% !important; min-width:100% !important; }
            .st-key-mobile_nav { flex-direction:row !important; }
            .nett-card { min-height:auto; }
            .st-key-desktop_activity_table { display:none; }
            .st-key-mobile_activity_list { display:block; }
            .st-key-privacy_toggle button { width:100%; }
        }
        </style>
        """
    )


def init_state() -> None:
    for key, value in DEFAULT_STATE.items():
        st.session_state.setdefault(key, deepcopy(value))
    st.session_state.setdefault("display_currency", "AED")
    st.session_state.setdefault("workspace", "Everything")
    st.session_state.setdefault("show_balances", True)
    st.session_state.setdefault("last_checkin", "31 Jul 2026")
    st.session_state.setdefault("checkin_progress", 0.82)
    st.session_state.setdefault("monthly_reminders", True)
    st.session_state.setdefault("include_flexible_debt", True)


inject_styles()
init_state()

with st.sidebar:
    st.markdown('<div class="nett-logo">ne<span>tt</span></div>', unsafe_allow_html=True)
    st.caption("Personal finance operating system")
    st.space("small")
    st.selectbox(
        "Workspace",
        ["Everything", "Personal", "8px Studio"],
        key="workspace",
        help="Switch between your combined view and separate workspaces.",
    )
    st.selectbox("Display currency", ["AED", "USD", "INR"], key="display_currency")
    progress = int(st.session_state.checkin_progress * 100)
    freshness = "All fresh" if progress == 100 else "Mostly fresh"
    st.html(
        f'''<div class="desktop-context"><div class="desktop-context-title">August check-in</div><div class="desktop-context-value"><span>{freshness}</span><span>{progress}%</span></div><div class="desktop-context-progress"><span style="width:{progress}%"></span></div></div>'''
    )
    st.space("small")

    pages = [
        st.Page("app_pages/home.py", title="Home", icon=":material/home:"),
        st.Page("app_pages/accounts.py", title="Accounts", icon=":material/account_balance:"),
        st.Page("app_pages/activity.py", title="Activity", icon=":material/receipt_long:"),
        st.Page("app_pages/plan.py", title="Plan", icon=":material/event_note:"),
        st.Page("app_pages/more.py", title="More", icon=":material/more_horiz:"),
    ]

navigation = st.navigation(pages, position="sidebar")

with st.container(horizontal=True, key="mobile_nav"):
    st.page_link("app_pages/home.py", label="Home", icon=":material/home:")
    st.page_link("app_pages/accounts.py", label="Wallet", icon=":material/account_balance:")
    st.page_link("app_pages/activity.py", label="Log", icon=":material/receipt_long:")
    st.page_link("app_pages/plan.py", label="Plan", icon=":material/event_note:")
    st.page_link("app_pages/more.py", label="More", icon=":material/more_horiz:")

navigation.run()
