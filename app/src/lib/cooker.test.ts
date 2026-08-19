import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateMemeFields } from "./cooker";

describe("validateMemeFields", () => {
  it("trims and uppercases the ticker", () => {
    const out = validateMemeFields("  Fridge Coin ", " frdg ");
    assert.equal(out.name, "Fridge Coin");
    assert.equal(out.symbol, "FRDG");
  });

  it("rejects short names and symbols", () => {
    assert.throws(() => validateMemeFields("x", "FRDG"), /2–32/);
    assert.throws(() => validateMemeFields("Fridge", "F"), /2–10/);
  });

  it("rejects punctuation in tickers", () => {
    assert.throws(() => validateMemeFields("Fridge", "FR-DG"), /A–Z/);
  });
});
