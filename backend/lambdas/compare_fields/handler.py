"""Deterministic field checks (AWS Lambda).

Same rules as the prototype engine (src/app/engine.mjs). Both are tested against
backend/tests/fixtures/cases.json so they cannot drift apart silently.

Trigger: Step Functions / SQS message after Textract extraction has been confirmed by a reviewer.
Input:  {"review_id", "spec": {"fields": [...]}, "artwork": {"version": n, "fields": {...}}}
Output: {"review_id", "version", "issues": [...]}. Findings are written by the caller so that
        reconciliation with earlier versions happens in one transaction (see docs/architecture.md).

No AI is involved here: exact checks must stay exact, whether or not AI suggestions are enabled.
"""
import json
import re
import unicodedata

UNITS = {"ml": ("volume", 1), "cl": ("volume", 10), "l": ("volume", 1000), "g": ("mass", 1), "kg": ("mass", 1000)}
QTY = re.compile(r"(\d+(?:[.,]\d+)?)\s*(ml|cl|kg|g|l)\b")


def parse_quantity(text):
    m = QTY.search(str(text or "").lower())
    if not m:
        return None
    dimension, factor = UNITS[m.group(2)]
    return {"value": round(float(m.group(1).replace(",", ".")) * factor * 1000) / 1000, "dimension": dimension}


def valid_gtin(code):
    digits = re.sub(r"\s", "", str(code or ""))
    if not re.fullmatch(r"\d{8}|\d{12}|\d{13}|\d{14}", digits):
        return False
    body = [int(d) for d in digits[:-1]]
    total, weight = 0, 3
    for d in reversed(body):
        total += d * weight
        weight = 1 if weight == 3 else 3
    return (10 - total % 10) % 10 == int(digits[-1])


def normalise(text):
    # Keep letters, digits and % (matches the JS \p{L}\p{N}% class); everything else separates words.
    out = []
    for ch in str(text or "").lower():
        cat = unicodedata.category(ch)
        out.append(ch if cat[0] in ("L", "N") or ch == "%" else " ")
    return " ".join("".join(out).split())


def words(text):
    return [w for w in normalise(text).split(" ") if w]


def list_of(value):
    items = value if isinstance(value, list) else re.split(r"[,;\n]", str(value or ""))
    return [s.strip() for s in items if s.strip()]


def _issue(field, type_, severity, expected, actual, detail):
    return {"key": field["key"], "label": field["label"], "kind": field["kind"], "type": type_,
            "severity": severity, "expected": expected, "actual": actual, "detail": detail}


def check_field(field, actual):
    expected = field["value"]
    critical = bool(field.get("critical"))
    if actual is None:
        actual = ""
    if field["kind"] == "list":
        want, have = list_of(expected), list_of(actual)
        want_n, have_n = [normalise(x) for x in want], [normalise(x) for x in have]
        out = [_issue(field, "missing-item", "critical" if critical else "major", x, "Not present",
                      f"“{x}” is in the approved {field['label'].lower()} but not on the artwork.")
               for x in want if normalise(x) not in have_n]
        out += [_issue(field, "extra-item", "major", "Not in specification", x,
                       f"“{x}” appears on the artwork but not in the approved {field['label'].lower()}.")
                for x in have if normalise(x) not in want_n]
        return out
    blank = not ("".join(actual) if isinstance(actual, list) else str(actual)).strip()
    if blank:
        return [_issue(field, "missing", "critical" if critical else "major", expected, "Not present",
                       f"{field['label']} is required by the specification and was not found on the artwork.")]
    kind = field["kind"]
    if kind == "quantity":
        e, a = parse_quantity(expected), parse_quantity(actual)
        if not a:
            return [_issue(field, "unreadable", "major", expected, actual, f"Could not read a quantity and unit from “{actual}”.")]
        if e["dimension"] != a["dimension"]:
            return [_issue(field, "mismatch", "critical", expected, actual,
                           f"Unit type differs: specification is {e['dimension']}, artwork is {a['dimension']}.")]
        if e["value"] != a["value"]:
            return [_issue(field, "mismatch", "critical", expected, actual,
                           f"Quantity differs: {expected} in the specification, {actual} on the artwork.")]
        return []
    if kind == "gtin":
        out = []
        if not valid_gtin(actual):
            out.append(_issue(field, "invalid-gtin", "critical", expected, actual, "The artwork barcode number fails the GS1 check-digit test."))
        if re.sub(r"\s", "", actual) != re.sub(r"\s", "", str(expected)):
            out.append(_issue(field, "mismatch", "critical", expected, actual, "The artwork barcode number differs from the specification."))
        return out
    if kind == "code":
        n = lambda s: re.sub(r"\s", "", str(s).upper())  # noqa: E731
        return [] if n(expected) == n(actual) else [
            _issue(field, "mismatch", "major", expected, actual, f"Code differs: {expected} expected, {actual} found.")]
    # text
    if normalise(expected) == normalise(actual):
        return []
    e_words, a_words = words(expected), words(actual)
    missing = [w for w in e_words if w not in a_words]
    added = [w for w in a_words if w not in e_words]
    parts = "; ".join(p for p in [missing and f"missing “{' '.join(missing)}”", added and f"adds “{' '.join(added)}”"] if p)
    return [_issue(field, "wording", "major" if critical else "minor", expected, actual,
                   f"Wording differs from the approved text ({parts}).")]


def compare(spec, artwork_fields):
    return [i for f in spec["fields"] for i in check_field(f, artwork_fields.get(f["key"]))]


def lambda_handler(event, _context):
    body = json.loads(event["body"]) if isinstance(event.get("body"), str) else event
    issues = compare(body["spec"], body["artwork"]["fields"])
    return {"review_id": body["review_id"], "version": body["artwork"]["version"], "issues": issues}
