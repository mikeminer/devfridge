import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatSendError, validateMemeFields } from "./cooker";

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

describe("formatSendError", () => {
  it("prefers the program Error log over the simulation wrapper", async () => {
    const err = {
      message: "Simulation failed. Message: Transaction simulation failed",
      logs: [
        "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb success",
        "Program log: Error: InvalidAccountData",
        "Program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb failed: invalid account data for instruction",
      ],
    };
    const text = await formatSendError(err);
    assert.match(text, /InvalidAccountData|invalid account data/i);
    assert.doesNotMatch(text, /Simulation failed/);
  });
});
