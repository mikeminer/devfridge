import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
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
      const feeAta = await createAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        mint,
        burnAuthority,
        undefined,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
        true
      );
      const pastaMint = new PublicKey("39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump");
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
          pastaMint,
          feeAta,
          pastaAta: getAssociatedTokenAddressSync(
            pastaMint,
            burnAuthority,
            true,
            TOKEN_2022_PROGRAM_ID
          ),
          jupiterProgram: new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
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

  const PASTA = new PublicKey("39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump");
  const JUPITER = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
  const ROUTE_DISC = Buffer.from([229, 23, 203, 151, 122, 227, 173, 42]);

  async function maturedLock() {
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
    const lockId = new anchor.BN(Date.now());
    const unlockAt = new anchor.BN(Math.floor(Date.now() / 1000) + 2);
    const [lockPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("lock"),
        wallet.publicKey.toBuffer(),
        mint.toBuffer(),
        lockId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    const [burnAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("burn")],
      program.programId
    );
    const vault = getAssociatedTokenAddressSync(mint, lockPda, true, TOKEN_2022_PROGRAM_ID);
    const feeAta = await createAssociatedTokenAccount(
      provider.connection,
      wallet.payer,
      mint,
      burnAuthority,
      undefined,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      true
    );
    const pastaAta = getAssociatedTokenAddressSync(
      PASTA,
      burnAuthority,
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
    await new Promise((resolve) => setTimeout(resolve, 3500));
    return { mint, ata, lockPda, vault, burnAuthority, feeAta, pastaAta };
  }

  function claimAccounts(lock: {
    mint: PublicKey;
    ata: PublicKey;
    lockPda: PublicKey;
    vault: PublicKey;
    burnAuthority: PublicKey;
    feeAta: PublicKey;
    pastaAta: PublicKey;
  }) {
    return {
      depositor: wallet.publicKey,
      mint: lock.mint,
      depositorAta: lock.ata,
      lock: lock.lockPda,
      vault: lock.vault,
      burnAuthority: lock.burnAuthority,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      pastaMint: PASTA,
      feeAta: lock.feeAta,
      pastaAta: lock.pastaAta,
      jupiterProgram: JUPITER,
    };
  }

  it("rejects a claim that routes the fee to the depositor", async () => {
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
    const lockId = new anchor.BN(7);
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
    const [burnAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("burn")],
      program.programId
    );
    const vault = getAssociatedTokenAddressSync(mint, lockPda, true, TOKEN_2022_PROGRAM_ID);
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

    const pastaAta = getAssociatedTokenAddressSync(
      PASTA,
      burnAuthority,
      true,
      TOKEN_2022_PROGRAM_ID
    );
    try {
      await program.methods
        .claim(ROUTE_DISC, new anchor.BN(1))
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
          pastaMint: PASTA,
          feeAta: ata,
          pastaAta,
          jupiterProgram: JUPITER,
        })
        .rpc();
      assert.fail("fee routed to the depositor should fail");
    } catch (err: unknown) {
      const message = String(err).toLowerCase();
      assert.ok(
        message.includes("constraint") || message.includes("associated") || message.includes("token"),
        message
      );
    }
    const vaultAcc = await getAccount(provider.connection, vault, undefined, TOKEN_2022_PROGRAM_ID);
    assert.equal(Number(vaultAcc.amount), 500_000);
  });

  it("rejects a matured claim whose jupiter route pays the depositor", async () => {
    const lock = await maturedLock();
    const before = await getAccount(provider.connection, lock.vault, undefined, TOKEN_2022_PROGRAM_ID);
    try {
      await program.methods
        .claim(ROUTE_DISC, new anchor.BN(1))
        .accounts(claimAccounts(lock))
        .remainingAccounts([
          { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: lock.burnAuthority, isSigner: false, isWritable: false },
          { pubkey: lock.feeAta, isSigner: false, isWritable: true },
          { pubkey: lock.ata, isSigner: false, isWritable: true },
          { pubkey: JUPITER, isSigner: false, isWritable: false },
          { pubkey: PASTA, isSigner: false, isWritable: false },
          { pubkey: JUPITER, isSigner: false, isWritable: false },
          { pubkey: PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], JUPITER)[0], isSigner: false, isWritable: false },
          { pubkey: JUPITER, isSigner: false, isWritable: false },
        ])
        .rpc();
      assert.fail("attacker destination should fail");
    } catch (err: unknown) {
      assert.notInclude(String(err).toLowerCase(), "success");
    }
    const after = await getAccount(provider.connection, lock.vault, undefined, TOKEN_2022_PROGRAM_ID);
    assert.equal(Number(after.amount), Number(before.amount));
  });

  it("rejects a permissionless crank of the boost vault", async () => {
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
    const lockId = new anchor.BN(9);
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
    const vaultToken = getAssociatedTokenAddressSync(mint, lockPda, true, TOKEN_2022_PROGRAM_ID);
    await program.methods
      .createLock(new anchor.BN(500_000), unlockAt, lockId)
      .accounts({
        depositor: wallet.publicKey,
        mint,
        depositorAta: ata,
        lock: lockPda,
        vault: vaultToken,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const [boost] = PublicKey.findProgramAddressSync(
      [Buffer.from("boost"), mint.toBuffer()],
      program.programId
    );
    const [solVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("boost_vault")],
      program.programId
    );
    await program.methods
      .boost(0)
      .accounts({
        payer: wallet.publicKey,
        mint,
        lock: lockPda,
        boost,
        vault: solVault,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const before = await provider.connection.getBalance(solVault);
    const [burnAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("burn")],
      program.programId
    );
    try {
      await program.methods
        .crankBuyback(new anchor.BN(before), ROUTE_DISC, new anchor.BN(1))
        .accounts({
          cranker: wallet.publicKey,
          vault: solVault,
          wsolMint: new PublicKey("So11111111111111111111111111111111111111112"),
          wsolAta: getAssociatedTokenAddressSync(
            new PublicKey("So11111111111111111111111111111111111111112"),
            burnAuthority,
            true
          ),
          pastaMint: PASTA,
          pastaAta: getAssociatedTokenAddressSync(PASTA, burnAuthority, true, TOKEN_2022_PROGRAM_ID),
          burnAuthority,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          wsolTokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          jupiterProgram: JUPITER,
        })
        .rpc();
      assert.fail("permissionless crank should fail");
    } catch (err: unknown) {
      assert.notEqual(String(err), "");
    }
    assert.equal(await provider.connection.getBalance(solVault), before);
  });
});
