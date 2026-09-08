import unittest
from unittest.mock import patch

import refresh


class RefreshTests(unittest.TestCase):
    def test_failed_refresh_retains_last_success_without_changing_timestamp(self):
        previous = {"status": "ok", "source": "https://example.com", "fetched_at": "2026-09-01T00:00:00Z", "data": {"supply": "123"}}
        def fail():
            raise RuntimeError("https://provider.test/secret-must-not-leak")
        result = refresh.observed(previous, "https://example.com", fail, "2026-09-08T00:00:00Z")
        self.assertEqual(result["status"], "stale")
        self.assertEqual(result["fetched_at"], previous["fetched_at"])
        self.assertEqual(result["data"], previous["data"])
        self.assertNotIn("secret", str(result))
        self.assertEqual(previous["status"], "ok")

    def test_first_failure_is_unknown_not_zero(self):
        result = refresh.observed(None, "https://example.com", lambda: 1 / 0, "2026-09-08T00:00:00Z")
        self.assertEqual(result["status"], "unavailable")
        self.assertNotIn("data", result)
        self.assertNotIn("fetched_at", result)

    def test_network_identity_and_solana_case_are_preserved(self):
        self.assertEqual(refresh.asset_id("robinhood", "0xABC"), "robinhood:0xabc")
        self.assertEqual(refresh.asset_id("solana", "AbC"), "solana:AbC")

    def test_removal_of_pinned_mint_is_rejected(self):
        with self.assertRaises(ValueError):
            refresh.validate_assets([], ["solana:" + refresh.PASTA])

    def test_duplicate_identity_is_rejected(self):
        a = {"id": "solana:" + refresh.PASTA, "chain": "solana", "address": refresh.PASTA, "name": "PASTA", "symbol": "PASTA"}
        with self.assertRaises(ValueError):
            refresh.validate_assets([a, a], [a["id"]])

    def test_scripts_are_excluded_from_docs_and_javascript_links_are_inert(self):
        node = refresh.Document('<article><h1>Title</h1><p>Evidence <a href="javascript:evil()">text</a></p><script>INJECTION</script></article>').root
        text = refresh.markdown(node, "https://docs.devfridge.cool")
        self.assertNotIn("INJECTION", text)
        self.assertNotIn("javascript:", text)
        self.assertIn("Evidence", text)

    def test_solana_mint_controls_are_observations_not_assumptions(self):
        response = {"context": {"slot": 42}, "value": {"owner": "OtherTokenProgram", "data": {"parsed": {"type": "mint", "info": {"supply": "123000000", "decimals": 6, "mintAuthority": "controller", "freezeAuthority": None}}}}}
        with patch.object(refresh, "rpc", return_value=response):
            result = refresh.solana_state("https://example.com", refresh.PASTA)
        self.assertFalse(result["token_2022"])
        self.assertEqual(result["mint_authority"], "controller")
        self.assertIsNone(result["freeze_authority"])

    def test_market_pairs_for_other_mints_are_excluded(self):
        pairs = '[{"chainId":"solana","baseToken":{"address":"wrong"},"priceUsd":"100"}]'
        with patch.object(refresh, "request", return_value=pairs):
            result = refresh.market_state({"chain": "solana", "address": refresh.PASTA})
        self.assertEqual(result["pairs"], [])

    def test_empty_rpc_account_is_not_safe_mint(self):
        with patch.object(refresh, "rpc", return_value={"context": {"slot": 42}, "value": None}):
            with self.assertRaises(ValueError):
                refresh.solana_state("https://example.com", refresh.PASTA)

    def test_inline_markup_preserves_word_boundaries(self):
        node = refresh.Document('<p>Keep at least <strong>500,000</strong> tokens in <a href="/fridge">a lock</a> today.</p>').root
        text = refresh.markdown(node, "https://docs.devfridge.cool")
        self.assertIn("at least 500,000 tokens", text)
        self.assertIn("[a lock](https://docs.devfridge.cool/fridge) today", text)


if __name__ == "__main__":
    unittest.main()
