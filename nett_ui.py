from html import escape

import streamlit as st


def safe_text(value: object) -> str:
    return escape(str(value), quote=True)


def mobile_topbar(status: str = "Fresh today") -> None:
    st.markdown(
        f'''<div class="mobile-topbar"><div class="mobile-topbar-logo">ne<span>tt</span></div><div class="mobile-topbar-meta"><span class="mobile-topbar-dot"></span>{safe_text(status)}</div></div>''',
        unsafe_allow_html=True,
    )


def page_heading(kicker: str, title: str, description: str) -> None:
    mobile_topbar()
    st.markdown(f'<div class="nett-kicker">{safe_text(kicker)}</div>', unsafe_allow_html=True)
    st.title(title)
    st.caption(description)


def section_title(title: str, meta: str | None = None) -> None:
    suffix = f'<span class="nett-section-meta">{safe_text(meta)}</span>' if meta else ""
    st.markdown(
        f'<div class="nett-section-title">{safe_text(title)}{suffix}</div>',
        unsafe_allow_html=True,
    )
