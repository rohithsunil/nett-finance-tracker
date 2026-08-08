DEFAULT_STATE = {
    "investment_value_aed": 63720,
    "accounts": [
        {"name": "Emirates NBD", "type": "Bank account", "currency": "AED", "balance": 62750, "verified": "Today", "color": "#d9c5ff"},
        {"name": "HDFC Savings", "type": "Bank account", "currency": "INR", "balance": 100000, "verified": "29 Jul 2026", "color": "#b7e5d0"},
        {"name": "USD wallet", "type": "Cash wallet", "currency": "USD", "balance": 1000, "verified": "31 Jul 2026", "color": "#ffe09a"},
        {"name": "Visa Signature", "type": "Credit card", "currency": "AED", "balance": -6300, "verified": "Today", "color": "#f8b8d8"},
    ],
    "transactions": [
        {"date": "Today", "name": "Salary", "category": "Income", "account": "Emirates NBD", "amount": 18475, "currency": "AED", "kind": "credit", "space": "Personal"},
        {"date": "Today", "name": "Grocery", "category": "Food", "account": "Emirates NBD", "amount": -247, "currency": "AED", "kind": "debit", "space": "Home"},
        {"date": "Yesterday", "name": "Car fuel", "category": "Transport", "account": "Emirates NBD", "amount": -180, "currency": "AED", "kind": "debit", "space": "Car"},
        {"date": "28 Jul", "name": "Transfer from HDFC", "category": "Internal transfer", "account": "Emirates NBD", "amount": 2200, "currency": "AED", "kind": "transfer", "space": "Personal"},
        {"date": "27 Jul", "name": "Alina repayment", "category": "Receivable", "account": "USD wallet", "amount": 500, "currency": "USD", "kind": "credit", "space": "Personal"},
    ],
    "debts": [
        {"name": "Visa Signature", "kind": "Mandatory", "outstanding": 6300, "currency": "AED", "due": "18 Aug 2026", "progress": 0.54},
        {"name": "Dad", "kind": "Flexible", "outstanding": 77500, "currency": "AED", "due": "Comfortable pace", "progress": 0.23},
        {"name": "Car loan", "kind": "Mandatory", "outstanding": 42000, "currency": "AED", "due": "05 Sep 2026", "progress": 0.68},
    ],
    "commitments": [
        {"name": "Car insurance", "date": "21 Aug 2026", "amount": 1850, "currency": "AED", "kind": "Mandatory", "reserved": 1200},
        {"name": "Studio software", "date": "01 Sep 2026", "amount": 620, "currency": "AED", "kind": "Mandatory", "reserved": 620},
        {"name": "Laptop replacement", "date": "15 Oct 2026", "amount": 5000, "currency": "AED", "kind": "Planned", "reserved": 1500},
    ],
    "snapshots": [
        {"month": "Mar", "net_worth": 71200},
        {"month": "Apr", "net_worth": 74600},
        {"month": "May", "net_worth": 75800},
        {"month": "Jun", "net_worth": 80600},
        {"month": "Jul", "net_worth": 84420},
        {"month": "Aug", "net_worth": 86240},
    ],
}


def format_money(value: float, currency: str = "AED", hidden: bool = False) -> str:
    if hidden:
        return "••••••"
    symbols = {"AED": "AED", "USD": "$", "INR": "₹"}
    symbol = symbols.get(currency, currency)
    if currency == "AED":
        return f"{symbol} {value:,.0f}"
    return f"{symbol}{value:,.0f}"


def signed_money(value: float, currency: str = "AED", hidden: bool = False) -> str:
    if hidden:
        return "••••••"
    prefix = "+" if value >= 0 else "-"
    return f"{prefix}{format_money(abs(value), currency)}"


def currency_factor(currency: str) -> float:
    return {"AED": 1.0, "USD": 3.67, "INR": 0.044}.get(currency, 1.0)


def to_aed(amount: float, currency: str) -> float:
    return amount * currency_factor(currency)


def from_aed(amount: float, currency: str) -> float:
    return amount / currency_factor(currency)


def get_total_cash(accounts: list[dict]) -> float:
    return sum(to_aed(account["balance"], account["currency"]) for account in accounts if account["balance"] > 0)


def get_mandatory_debt(debts: list[dict]) -> float:
    return sum(to_aed(debt["outstanding"], debt["currency"]) for debt in debts if debt["kind"] == "Mandatory")


def get_reserved(commitments: list[dict]) -> float:
    return sum(to_aed(item["reserved"], item["currency"]) for item in commitments)


def get_primary_net_worth(accounts: list[dict], debts: list[dict], investment_value_aed: float) -> float:
    return get_total_cash(accounts) + investment_value_aed - get_mandatory_debt(debts)


def get_safe_to_spend(accounts: list[dict], commitments: list[dict]) -> float:
    liquid_cash = get_total_cash(accounts)
    reserved = get_reserved(commitments)
    unfunded_mandatory = sum(
        to_aed(max(item["amount"] - item["reserved"], 0), item["currency"])
        for item in commitments
        if item["kind"] == "Mandatory"
    )
    return max(liquid_cash - reserved - unfunded_mandatory, 0)
