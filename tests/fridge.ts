import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

// Integration tests for a local validator. Run after `anchor test`.
describe("fridge", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Fridge as Program;
  const wallet = provider.wallet as anchor.Wallet;

  it("creates a lock and rejects early claim", async () => {
    const mint = await createMint(
      provider.connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    const ata = await createAssociatedTokenAccount(
      provider.connection,
      wallet.payer,
      mint,
      wallet.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    await mintTo(
      provider.connection,
      wallet.payer,
      mint,
      ata,
      wallet.publicKey,
      1_000_000,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    const lockId = new anchor.BN(1);
    const unlockAt = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
    const [lockPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("lock"),
        wallet.publicKey.toBuffer(),
        mint.toBuffer(),
        lockId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    const vault = getAssociatedTokenAddressSync(
      mint,
      lockPda,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    await program.methods
      .createLock(new anchor.BN(500_000), unlockAt, lockId)
      .accounts({
        depositor: wallet.publicKey,
        mint,
        depositorAta: ata,
        lock: lockPda,
        vault,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const lock = await program.account.lock.fetch(lockPda);
    assert.equal(lock.depositor.toBase58(), wallet.publicKey.toBase58());
    assert.equal(Number(lock.amount), 500_000);

    try {
      const [burnAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("burn")],
        program.programId
      );
      await program.methods
        .claim(Buffer.from([]), new anchor.BN(0))
        .accounts({
          depositor: wallet.publicKey,
          mint,
          depositorAta: ata,
          lock: lockPda,
          vault,
          burnAuthority,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("early claim should fail");
    } catch (err: unknown) {
      const message = String(err);
      assert.include(message.toLowerCase(), "unlock");
    }

    const vaultAcc = await getAccount(
      provider.connection,
      vault,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    assert.equal(Number(vaultAcc.amount), 500_000);
  });
});
