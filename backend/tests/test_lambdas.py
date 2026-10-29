"""Run from the repository root: python3 backend/tests/test_lambdas.py (standard library only)."""
import json
import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend" / "lambdas" / "compare_fields"))
import handler as compare_fields  # noqa: E402

sys.path.pop(0)
del sys.modules["handler"]
sys.path.insert(0, str(ROOT / "backend" / "lambdas" / "suggest_discrepancies"))
import handler as suggest  # noqa: E402

CASES = json.loads((ROOT / "backend" / "tests" / "fixtures" / "cases.json").read_text())


class CompareFieldsTest(unittest.TestCase):
    def test_shared_fixtures_match_prototype_engine(self):
        for c in CASES["fields"]:
            with self.subTest(c["name"]):
                issues = compare_fields.check_field(c["field"], c["actual"])
                self.assertEqual([i["type"] for i in issues], c["types"])
                if "severity" in c:
                    self.assertEqual(issues[0]["severity"], c["severity"])

    def test_gtin(self):
        for g in CASES["gtin"]["valid"]:
            self.assertTrue(compare_fields.valid_gtin(g), g)
        for g in CASES["gtin"]["invalid"]:
            self.assertFalse(compare_fields.valid_gtin(g), g)

    def test_handler(self):
        out = compare_fields.lambda_handler({"body": json.dumps({
            "review_id": "PL-1001",
            "spec": {"fields": [{"key": "q", "label": "Net quantity", "kind": "quantity", "value": "450 ml", "critical": True}]},
            "artwork": {"version": 3, "fields": {"q": "500 ml"}},
        })}, None)
        self.assertEqual(out["version"], 3)
        self.assertEqual(out["issues"][0]["severity"], "critical")


class SuggestTest(unittest.TestCase):
    payload = {"approved_claims": ["Made with whole oats", "High in fibre"], "artwork_claims": ["Made with wholegrain oats", "No added sugar"]}

    def test_rejects_identifying_input(self):
        with self.assertRaises(ValueError):
            suggest.check_input({**self.payload, "customer_id": "c-1"})
        with self.assertRaises(ValueError):
            suggest.check_input({"approved_claims": "x", "artwork_claims": []})

    def test_keeps_only_evidence_bound_suggestions(self):
        draft = {"suggestions": [
            {"type": "claim-wording", "artwork_quote": "Made with wholegrain oats", "approved_quote": "Made with whole oats", "explanation": "Wholegrain may not mean the same as whole oats."},
            {"type": "unapproved-claim", "artwork_quote": "No added sugar", "approved_quote": None, "explanation": "No approved claim covers sugar content."},
            {"type": "unapproved-claim", "artwork_quote": "Gluten free", "approved_quote": None, "explanation": "Invented quote."},
            {"type": "compliance-verdict", "artwork_quote": "High in fibre", "approved_quote": None, "explanation": "Not allowed."},
            {"type": "claim-wording", "artwork_quote": "No added sugar", "approved_quote": "Low sugar", "explanation": "Approved quote invented."},
        ]}
        kept, rejected = suggest.validate(draft, suggest.check_input(self.payload))
        self.assertEqual([k["artwork_quote"] for k in kept], ["Made with wholegrain oats", "No added sugar"])
        self.assertTrue(all(k["status"] == "Suggested · needs decision" for k in kept))
        self.assertEqual(len(rejected), 3)

    def test_malformed_output_fails_closed(self):
        self.assertEqual(suggest.validate(None, suggest.check_input(self.payload))[0], [])
        self.assertEqual(suggest.validate({"suggestions": "x"}, suggest.check_input(self.payload))[0], [])

    def test_prompt_contains_no_identifiers(self):
        prompt = suggest.build_prompt(suggest.check_input(self.payload))
        self.assertIn("Made with wholegrain oats", prompt)
        for key in suggest.FORBIDDEN_KEYS:
            self.assertNotIn(f'"{key}"', prompt)


if __name__ == "__main__":
    unittest.main()
