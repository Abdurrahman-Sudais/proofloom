"""AI-assisted discrepancy suggestions (AWS Lambda + Amazon Bedrock).

Scope: judgements that exact rules handle badly, e.g. whether a reworded claim on the artwork means
the same as an approved claim. Quantities, codes, barcodes, allergens and required wording are
NOT sent here; compare_fields handles them deterministically.

Safeguards enforced in code:
  * Input minimisation: only claim/statement text is sent. Customer, product, user and file
    identifiers are rejected (FORBIDDEN_KEYS) so they cannot reach the model.
  * Evidence-bound output: every suggestion must quote text that appears verbatim in the supplied
    approved or artwork text. Suggestions whose quotes cannot be found are discarded.
  * Suggestions are stored as "Suggested · needs decision". Nothing here changes a finding's
    status or approves artwork; a reviewer must confirm or dismiss each one.
  * Provenance: model id and prompt version are returned for storage with each suggestion.

Environment: BEDROCK_MODEL_ID, GUARDRAIL_ID (optional), GUARDRAIL_VERSION (optional), MAX_SUGGESTIONS.
"""
import json
import os

PROMPT_VERSION = "2026-10-v1"
FORBIDDEN_KEYS = {"customer", "customer_id", "tenant_id", "user", "user_id", "email", "file_key", "s3_key", "product_code", "gtin"}
ALLOWED_TYPES = {"unapproved-claim", "claim-wording", "statement-wording"}

SYSTEM = (
    "You compare packaging artwork text with an approved specification for a human reviewer. "
    "Report only differences in meaning between artwork claims or statements and the approved ones. "
    "Quote exact text from the inputs as evidence. Do not judge legal or regulatory compliance. "
    "Do not invent text. Output ONLY JSON matching the schema."
)

SCHEMA = {
    "suggestions": [{
        "type": "unapproved-claim | claim-wording | statement-wording",
        "artwork_quote": "exact text from artwork_claims or artwork_statements",
        "approved_quote": "exact text from approved_claims or approved_statements, or null",
        "explanation": "one or two plain sentences for the reviewer",
    }]
}


def check_input(req):
    bad = FORBIDDEN_KEYS.intersection(req)
    if bad:
        raise ValueError(f"forbidden keys in model input: {sorted(bad)}")
    for key in ("approved_claims", "artwork_claims"):
        if not isinstance(req.get(key), list):
            raise ValueError(f"{key} must be a list of strings")
    return {k: req.get(k, []) for k in ("approved_claims", "artwork_claims", "approved_statements", "artwork_statements")}


def build_prompt(payload):
    return (
        "Approved and artwork text follow as JSON. Identify artwork claims or statements whose meaning is not "
        "supported by an approved one. If an artwork claim is a reworded approved claim, say whether the meaning "
        f"may differ.\nInput: {json.dumps(payload, ensure_ascii=False)}\nSchema: {json.dumps(SCHEMA)}"
    )


def validate(draft, payload, limit=10):
    """Keep only well-formed, evidence-bound suggestions. Returns (kept, rejected_reasons)."""
    artwork_text = payload["artwork_claims"] + payload.get("artwork_statements", [])
    approved_text = payload["approved_claims"] + payload.get("approved_statements", [])
    kept, rejected = [], []
    items = draft.get("suggestions") if isinstance(draft, dict) else None
    if not isinstance(items, list):
        return [], ["output is not {suggestions: [...]}"]
    for s in items[:limit]:
        if not isinstance(s, dict) or s.get("type") not in ALLOWED_TYPES:
            rejected.append("unknown type")
            continue
        aq, pq, why = s.get("artwork_quote"), s.get("approved_quote"), str(s.get("explanation", "")).strip()
        if not aq or not any(aq in t for t in artwork_text):
            rejected.append("artwork quote not found in input")
            continue
        if pq is not None and not any(pq in t for t in approved_text):
            rejected.append("approved quote not found in input")
            continue
        if not why or len(why) > 400:
            rejected.append("missing or overlong explanation")
            continue
        kept.append({"type": s["type"], "artwork_quote": aq, "approved_quote": pq, "explanation": why,
                     "source": "ai", "status": "Suggested · needs decision"})
    return kept, rejected


def lambda_handler(event, _context):  # pragma: no cover - needs AWS
    import boto3

    req = json.loads(event["body"]) if isinstance(event.get("body"), str) else event
    payload = check_input(req)
    params = {
        "modelId": os.environ["BEDROCK_MODEL_ID"],
        "system": [{"text": SYSTEM}],
        "messages": [{"role": "user", "content": [{"text": build_prompt(payload)}]}],
        "inferenceConfig": {"maxTokens": 1500, "temperature": 0},
    }
    if os.environ.get("GUARDRAIL_ID"):
        params["guardrailConfig"] = {"guardrailIdentifier": os.environ["GUARDRAIL_ID"], "guardrailVersion": os.environ.get("GUARDRAIL_VERSION", "DRAFT")}
    resp = boto3.client("bedrock-runtime").converse(**params)
    text = resp["output"]["message"]["content"][0]["text"]
    try:
        draft = json.loads(text)
    except json.JSONDecodeError:
        draft = None
    kept, rejected = validate(draft, payload, int(os.environ.get("MAX_SUGGESTIONS", "10")))
    return {"suggestions": kept, "rejected": len(rejected), "model_id": params["modelId"], "prompt_version": PROMPT_VERSION}
