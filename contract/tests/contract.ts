import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Contract } from "../target/types/contract";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, Signer } from "@solana/web3.js";
import { assert } from "chai";
import { createAccount, createMint, getAccount, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { sha256 } from "js-sha256";

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe("contract", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Contract as Program<Contract>;

  const admin = Keypair.generate();
  const adminSig: Signer = {
    publicKey: admin.publicKey,
    secretKey: admin.secretKey
  }

  // Generate keypairs for mock supported tokens
  let tokenMint: PublicKey;
  let collateralMint: PublicKey;

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(admin.publicKey, 10 * LAMPORTS_PER_SOL),
      "confirmed"
    );
    tokenMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
    collateralMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
  });

  it("Is initialized!", async () => {

    // Derive the lend_auction PDA
    const [lendAuctionPda, lendAuctionBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("lend_auction")],
      program.programId
    );

    await program.provider.connection.confirmTransaction(
      await program.provider.connection.requestAirdrop(
        admin.publicKey,
        3 * LAMPORTS_PER_SOL
      ),
      "confirmed"
    );

    await program.provider.connection.confirmTransaction(
      await program.provider.connection.requestAirdrop(
        program.provider.publicKey,
        3 * LAMPORTS_PER_SOL
      ),
      "confirmed"
    );
    
    // Parameters for initialization
    const shardCount = new anchor.BN(1);
    const supportedTokens = [tokenMint, collateralMint];

    const info = await program.provider.connection.getAccountInfo(lendAuctionPda);
    if (!info) {
       // Execute the initialize instruction
      const tx = await program.methods
        .initialize(shardCount, supportedTokens)
        .accounts({
          admin: admin.publicKey,
        })
        .signers([adminSig])
        .rpc();


      // Fetch the lend_auction account data
      const lendAuctionAccount = await program.account.lendAuction.fetch(lendAuctionPda);

      // Verify account data
      assert.equal(
        lendAuctionAccount.admin.toBase58(),
        admin.publicKey.toBase58(),
        "Admin should match the provider's public key"
      );

      assert.equal(
        lendAuctionAccount.shardCount.toString(),
        shardCount.toString(),
        "Shard count should match input"
      );
      assert.equal(
        lendAuctionAccount.totalLoans.toString(),
        "0",
        "Total loans should be initialized to 0"
      );
      assert.deepEqual(
        lendAuctionAccount.supportedTokens.map((pubkey: PublicKey) => pubkey.toBase58()),
        supportedTokens.map((pubkey) => pubkey.toBase58()),
        "Supported tokens should match input"
      );

      // Verify the emitted event
      // Fetch transaction details with retry logic
      let signature;
      for (let i = 0; i < 5; i++) {
        signature = await provider.connection.getTransaction(tx, { commitment: "confirmed" });
        if (signature) break;
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
      }

      if (!signature) {
        throw new Error("Failed to fetch transaction after retries");
      }

      // Verify the emitted event
      const eventParser = new anchor.EventParser(program.programId, new anchor.BorshCoder(program.idl));
      const events = eventParser.parseLogs(signature.meta.logMessages);

      let auctionInitializedEvent = null;
      for (const event of events) {
        if (event.name === "auctionInitialized") {
          auctionInitializedEvent = event;
          break;
        }
      }

      assert.ok(auctionInitializedEvent, "AuctionInitialized event should be emitted");
      assert.equal(
        auctionInitializedEvent.data.admin.toBase58(),
        admin.publicKey.toBase58(),
        "Event admin should match"
      );
      assert.equal(
        auctionInitializedEvent.data.shardCount.toString(),
        shardCount.toString(),
        "Event shard count should match"
      );
      assert.deepEqual(
        auctionInitializedEvent.data.supportedTokens.map((pubkey: PublicKey) => pubkey.toBase58()),
        supportedTokens.map((pubkey) => pubkey.toBase58()),
        "Event supported tokens should match"
      );
    }
  });

  function computeShardId(tokenMint: PublicKey, rate: number, shardCount: number): anchor.BN {
    const data = Buffer.concat([tokenMint.toBuffer(), Buffer.from([rate])]);
    const hash = sha256(data); // Call sha256 as a function to get hex string
    const hashNum = new anchor.BN(hash.slice(0, 16), "hex"); // Convert first 8 bytes (16 hex chars) to BN
    return hashNum.mod(new anchor.BN(shardCount));
  }

  // it("Cleans up stale bids and asks with refunds and fees", async () => {
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(admin.publicKey, 10 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );

  //   const [lendAuctionPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("lend_auction")],
  //     program.programId
  //   );

  //   const info = await program.provider.connection.getAccountInfo(lendAuctionPda);
  //   if (!info) {
  //     await program.methods
  //       .initialize(new anchor.BN(1), [tokenMint, collateralMint])
  //       .accounts({
  //         admin: admin.publicKey,
  //       })
  //       .signers([admin])
  //       .rpc();
  //   }

  //   const shardCount = 1;
  //   const bidMinRate = 5;
  //   const askMaxRate = 20;
  //   const bidShardId = computeShardId(tokenMint, bidMinRate, shardCount);
  //   const askShardId = computeShardId(tokenMint, askMaxRate, shardCount);

  //   const [bidShardPoolPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("shard_pool"), bidShardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );
  //   const [bidLoanPoolPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("loan_pool"), bidShardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );
  //   const [askShardPoolPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("shard_pool"), askShardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );
  //   const [askLoanPoolPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("loan_pool"), askShardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );

  //   const bidder = Keypair.generate();
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(bidder.publicKey, 2 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );
  //   const bidderTokenAccount = anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: bidder.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(
  //     provider.connection,
  //     admin,
  //     tokenMint,
  //     bidder.publicKey,
  //   );
  //   await mintTo(provider.connection, admin, tokenMint, bidderTokenAccount, admin, 1000000);

  //   const asker = Keypair.generate();
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(asker.publicKey, 2 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );
  //   const askerCollateralAccount = anchor.utils.token.associatedAddress({
  //     mint: collateralMint,
  //     owner: asker.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(
  //     provider.connection,
  //     admin,
  //     collateralMint,
  //     asker.publicKey,
  //   );
  //   await mintTo(provider.connection, admin, collateralMint, askerCollateralAccount, admin, 2000000);

  //   // Create ATAs for vault and fee accounts owned by lend_auction
  //   const vaultTokenAccount = await anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: lendAuctionPda,
  //   });
  //   await getOrCreateAssociatedTokenAccount(
  //     provider.connection,
  //     admin,
  //     tokenMint,
  //     lendAuctionPda,
  //     true
  //   );

  //   const vaultCollateralAccount = anchor.utils.token.associatedAddress({
  //     mint: collateralMint,
  //     owner: lendAuctionPda,
  //   });
  //   await getOrCreateAssociatedTokenAccount(
  //     provider.connection,
  //     admin,
  //     collateralMint,
  //     lendAuctionPda,
  //     true
  //   );

  //   const feeVaultAccount = anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: lendAuctionPda,
  //   });
  //   await getOrCreateAssociatedTokenAccount(
  //     provider.connection,
  //     admin,
  //     tokenMint,
  //     lendAuctionPda,
  //     true
  //   );

  //   const feeVaultCollateralAccount = anchor.utils.token.associatedAddress({
  //     mint: collateralMint,
  //     owner: lendAuctionPda,
  //   });
  //   await getOrCreateAssociatedTokenAccount(
  //     provider.connection,
  //     admin,
  //     collateralMint,
  //     lendAuctionPda,
  //     true
  //   );

  //   // SubmitBid
  //   const bidTx = await program.methods
  //     .submitBid(new anchor.BN(1000000), bidMinRate, new anchor.BN(1000))
  //     .accounts({
  //       shardPool: bidShardPoolPda,
  //       loanPool: bidLoanPoolPda,
  //       bidder: bidder.publicKey,
  //       bidderTokenAccount: bidderTokenAccount,
  //       borrowerTokenAccount: bidderTokenAccount,
  //       vaultTokenAccount: vaultTokenAccount, // ATA
  //       tokenMint: tokenMint,
  //     })
  //     .signers([bidder])
  //     .rpc();

  //   const askTx = await program.methods
  //     .submitAsk(new anchor.BN(500000), askMaxRate, new anchor.BN(2000000))
  //     .accounts({
  //       shardPool: askShardPoolPda,
  //       loanPool: askLoanPoolPda,
  //       asker: asker.publicKey,
  //       askerCollateralAccount: askerCollateralAccount,
  //       borrowerTokenAccount: bidderTokenAccount,
  //       vaultTokenAccount: vaultTokenAccount, // ATA
  //       vaultCollateralAccount: vaultCollateralAccount, // ATA
  //       tokenMint: tokenMint,
  //       collateralMint: collateralMint,
  //     })
  //     .signers([asker])
  //     .rpc();
    
  //   const askShardPoolAfterAsk = await program.account.shardPool.fetch(askShardPoolPda);

  //   await sleep(6000)
   
  //   // Cleanup for bid shard
  //   const tx1 = await program.methods
  //     .cleanup(bidShardId)
  //     .accounts({
  //       vaultTokenAccount,
  //       vaultCollateralAccount,
  //       feeVault: feeVaultAccount,
  //       feeVaultCollateral: feeVaultCollateralAccount,
  //       bidderTokenAccount: bidderTokenAccount,
  //       askerCollateralAccount: askerCollateralAccount,
  //     })
  //     .rpc();

  //   await provider.connection.confirmTransaction(tx1, "confirmed");

  //   const bidderBalance = await getAccount(provider.connection, bidderTokenAccount);
  //   const askerBalance = await getAccount(provider.connection, askerCollateralAccount);
  //   const feeVaultBalance = await getAccount(provider.connection, feeVaultAccount);
  //   const feeVaultCollateralBalance = await getAccount(provider.connection, feeVaultCollateralAccount);

  //   assert.equal(Number(bidderBalance.amount), 995000, "Bidder should receive 99.5% refund");
  //   assert.equal(Number(askerBalance.amount), 1990000, "Asker should receive 99.5% refund");
  //   assert.equal(Number(feeVaultBalance.amount), 5000, "Fee vault should receive 0.5% fees");
  //   assert.equal(Number(feeVaultCollateralBalance.amount), 10000, "Fee vault (collateral) should receive 0.5% fee from ask");

  //   const updatedBidShardPool = await program.account.shardPool.fetch(bidShardPoolPda);
  //   const updatedAskShardPool = await program.account.shardPool.fetch(askShardPoolPda);
  //   assert.equal(updatedBidShardPool.bids.length, 0, "All stale bids should be removed");
  //   assert.equal(updatedAskShardPool.asks.length, 0, "All stale asks should be removed");

  //   let signature1, signature2;
  //   for (let i = 0; i < 5; i++) {
  //     signature1 = await provider.connection.getTransaction(tx1, { commitment: "confirmed" });
  //     // signature2 = await provider.connection.getTransaction(tx2, { commitment: "confirmed" });
  //     if (signature1 && signature2) break;
  //     await new Promise((resolve) => setTimeout(resolve, 1000));
  //   }

  //   if (!signature1 
  //     // || !signature2
  //   ) throw new Error("Failed to fetch transaction after retries");

  //   const eventParser = new anchor.EventParser(program.programId, new anchor.BorshCoder(program.idl));
  //   const events1 = eventParser.parseLogs(signature1.meta.logMessages);
  //   // const events2 = eventParser.parseLogs(signature2.meta.logMessages);

  //   let bidExpiredEvent = null;
  //   let askExpiredEvent = null;
  //   for (const event of events1) {
  //     if (event.name === "bidExpired") bidExpiredEvent = event;
  //   }
  //   for (const event of events1) {
  //     if (event.name === "askExpired") askExpiredEvent = event;
  //   }

  //   assert.ok(bidExpiredEvent, "BidExpired event should be emitted");
  //   assert.equal(bidExpiredEvent.data.lender.toBase58(), bidder.publicKey.toBase58());
  //   assert.equal(bidExpiredEvent.data.amount.toString(), "1000000");
  //   assert.equal(bidExpiredEvent.data.refundAmount.toString(), "995000");
  //   assert.equal(bidExpiredEvent.data.feeAmount.toString(), "5000");

  //   assert.ok(askExpiredEvent, "AskExpired event should be emitted");
  //   assert.equal(askExpiredEvent.data.borrower.toBase58(), asker.publicKey.toBase58());
  //   assert.equal(askExpiredEvent.data.amount.toString(), "500000");
  //   assert.equal(askExpiredEvent.data.refundAmount.toString(), "1990000");
  //   assert.equal(askExpiredEvent.data.feeAmount.toString(), "10000");
  // });

  // it("Submits a bid without matching asks", async () => {
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(admin.publicKey, 10 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );

  //   const [lendAuctionPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("lend_auction")],
  //     program.programId
  //   );

  //   const info = await provider.connection.getAccountInfo(lendAuctionPda);
  //   if (!info) {
  //     await program.methods
  //       .initialize(new anchor.BN(1), [tokenMint])
  //       .accounts({
  //         admin: admin.publicKey,
  //       })
  //       .signers([admin])
  //       .rpc();
  //   }

  //   const shardCount = 1;
  //   const minRate = 5;
  //   const shardId = computeShardId(tokenMint, minRate, shardCount);

  //   const [shardPoolPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("shard_pool"), shardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );
  //   const [loanPoolPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("loan_pool"), shardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );

  //   const bidder = Keypair.generate();
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(bidder.publicKey, 2 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );
  //   const bidderTokenAccount = await anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: bidder.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(
  //     provider.connection,
  //     admin,
  //     tokenMint,
  //     bidder.publicKey
  //   );
  //   await mintTo(provider.connection, admin, tokenMint, bidderTokenAccount, admin, 1000000);

  //   const vaultTokenAccount = await anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: lendAuctionPda,
  //   });
  //   await getOrCreateAssociatedTokenAccount(
  //     provider.connection,
  //     admin,
  //     tokenMint,
  //     lendAuctionPda,
  //     true
  //   );

  //   const borrowerTokenAccount = bidderTokenAccount; // For simplicity, reuse bidder's account

  //   const tx = await program.methods
  //     .submitBid(new anchor.BN(1000000), minRate, new anchor.BN(1000))
  //     .accounts({
  //       shardPool: shardPoolPda,
  //       loanPool: loanPoolPda,
  //       bidder: bidder.publicKey,
  //       bidderTokenAccount: bidderTokenAccount,
  //       borrowerTokenAccount: borrowerTokenAccount,
  //       vaultTokenAccount: vaultTokenAccount,
  //       tokenMint: tokenMint,
  //     })
  //     .signers([bidder])
  //     .rpc();

  //   await provider.connection.confirmTransaction(tx, "confirmed");

  //   // Verify token transfer
  //   const bidderBalance = await getAccount(provider.connection, bidderTokenAccount);
  //   const vaultBalance = await getAccount(provider.connection, vaultTokenAccount);
  //   assert.equal(Number(bidderBalance.amount), 0, "Bidder should have transferred all tokens");
  //   assert.equal(Number(vaultBalance.amount), 1500000, "Vault should have received bid amount");

  //   // Verify shard_pool state
  //   const shardPool = await program.account.shardPool.fetch(shardPoolPda);
  //   assert.equal(shardPool.bids.length, 1, "One bid should be added");
  //   assert.equal(shardPool.bids[0].lender.toBase58(), bidder.publicKey.toBase58());
  //   assert.equal(shardPool.bids[0].amount.toString(), "1000000");
  //   assert.equal(shardPool.bids[0].minRate, minRate);
  //   assert.equal(shardPool.bids[0].tokenMint.toBase58(), tokenMint.toBase58());

  //   // Verify event
  //   let signature;
  //   for (let i = 0; i < 5; i++) {
  //     signature = await provider.connection.getTransaction(tx, { commitment: "confirmed" });
  //     if (signature) break;
  //     await new Promise((resolve) => setTimeout(resolve, 1000));
  //   }
  //   if (!signature) throw new Error("Failed to fetch transaction");

  //   const eventParser = new anchor.EventParser(program.programId, new anchor.BorshCoder(program.idl));
  //   const events = eventParser.parseLogs(signature.meta.logMessages);
  //   let bidSubmittedEvent = null;
  //   for (const event of events) {
  //     if (event.name === "bidSubmitted") bidSubmittedEvent = event;
  //   }

  //   assert.ok(bidSubmittedEvent, "BidSubmitted event should be emitted");
  //   assert.equal(bidSubmittedEvent.data.lender.toBase58(), bidder.publicKey.toBase58());
  //   assert.equal(bidSubmittedEvent.data.amount.toString(), "1000000");
  //   assert.equal(bidSubmittedEvent.data.minRate, minRate);
  //   assert.equal(bidSubmittedEvent.data.shardId.toString(), shardId.toString());
  //   assert.equal(bidSubmittedEvent.data.tokenMint.toBase58(), tokenMint.toBase58());
  // });

  // it("Submits a bid with matching ask and issues a loan", async () => {
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(admin.publicKey, 10 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );

  //   const [lendAuctionPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("lend_auction")],
  //     program.programId
  //   );

  //   const info = await provider.connection.getAccountInfo(lendAuctionPda);
  //   if (!info) {
  //     await program.methods
  //       .initialize(new anchor.BN(1), [tokenMint, collateralMint])
  //       .accounts({
  //         admin: admin.publicKey,
  //       })
  //       .signers([admin])
  //       .rpc();
  //   }

  //   const shardCount = 1;
  //   const minRate = 5;
  //   const shardId = computeShardId(tokenMint, minRate, shardCount);

  //   const [shardPoolPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("shard_pool"), shardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );
  //   const [loanPoolPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("loan_pool"), shardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );

  //   const asker = Keypair.generate();
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(asker.publicKey, 2 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );
  //   const askerCollateralAccount = await anchor.utils.token.associatedAddress({
  //     mint: collateralMint,
  //     owner: asker.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(
  //     provider.connection,
  //     admin,
  //     collateralMint,
  //     asker.publicKey
  //   );
  //   await mintTo(provider.connection, admin, collateralMint, askerCollateralAccount, admin, 2000000);

  //   const vaultTokenAccount = await anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: lendAuctionPda,
  //   });
  //   await getOrCreateAssociatedTokenAccount(
  //     provider.connection,
  //     admin,
  //     tokenMint,
  //     lendAuctionPda,
  //     true
  //   );

  //   const vaultCollateralAccount = await anchor.utils.token.associatedAddress({
  //     mint: collateralMint,
  //     owner: lendAuctionPda,
  //   });
  //   await getOrCreateAssociatedTokenAccount(
  //     provider.connection,
  //     admin,
  //     collateralMint,
  //     lendAuctionPda,
  //     true
  //   );

  //   const borrowerTokenAccount = await anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: asker.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(
  //     provider.connection,
  //     admin,
  //     tokenMint,
  //     asker.publicKey
  //   );

  //   // Pre-populate an ask (assuming SubmitAsk exists with similar structure)
  //   await program.methods
  //     .submitAsk(new anchor.BN(500000), minRate, new anchor.BN(750000)) // Collateral = 1.5x amount
  //     .accounts({
  //       shardPool: shardPoolPda,
  //       loanPool: loanPoolPda,
  //       asker: asker.publicKey,
  //       askerCollateralAccount: askerCollateralAccount,
  //       borrowerTokenAccount: borrowerTokenAccount,
  //       vaultTokenAccount: vaultTokenAccount,
  //       vaultCollateralAccount: vaultCollateralAccount,
  //       tokenMint: tokenMint,
  //       collateralMint: collateralMint,
  //     })
  //     .signers([asker])
  //     .rpc();

  //   const bidder = Keypair.generate();
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(bidder.publicKey, 2 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );
  //   const bidderTokenAccount = await anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: bidder.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(
  //     provider.connection,
  //     admin,
  //     tokenMint,
  //     bidder.publicKey
  //   );
  //   await mintTo(provider.connection, admin, tokenMint, bidderTokenAccount, admin, 1000000);

  //   // Get loan count
  //   const loanPoolBefore = await program.account.loanPool.fetch(loanPoolPda);
  //   const loanCount = loanPoolBefore.loans.length; 
  //   const tx = await program.methods
  //     .submitBid(new anchor.BN(500000), minRate, new anchor.BN(1000))
  //     .accounts({
  //       shardPool: shardPoolPda,
  //       loanPool: loanPoolPda,
  //       bidder: bidder.publicKey,
  //       bidderTokenAccount: bidderTokenAccount,
  //       borrowerTokenAccount: borrowerTokenAccount,
  //       vaultTokenAccount: vaultTokenAccount,
  //       tokenMint: tokenMint,
  //     })
  //     .signers([bidder])
  //     .rpc();

  //   await provider.connection.confirmTransaction(tx, "confirmed");

  //   // Verify token transfers
  //   const bidderBalance = await getAccount(provider.connection, bidderTokenAccount);
  //   const vaultBalance = await getAccount(provider.connection, vaultTokenAccount);
  //   const borrowerBalance = await getAccount(provider.connection, borrowerTokenAccount);
  //   assert.equal(Number(bidderBalance.amount), 500000, "Bidder should have remaining tokens");
  //   assert.equal(Number(vaultBalance.amount), 1500000, "Vault should be empty after loan");
  //   assert.equal(Number(borrowerBalance.amount), 500000, "Borrower should receive loan amount");

  //   // Verify loan_pool state
  //   const loanPoolAfter = await program.account.loanPool.fetch(loanPoolPda);
  //   assert.equal(loanPoolAfter.loans.length, loanCount+1, "One loan should be issued");
  //   assert.equal(loanPoolAfter.loans[loanPoolAfter.loans.length-1].lender.toBase58(), bidder.publicKey.toBase58());
  //   assert.equal(loanPoolAfter.loans[loanPoolAfter.loans.length-1].borrower.toBase58(), asker.publicKey.toBase58());
  //   assert.equal(loanPoolAfter.loans[loanPoolAfter.loans.length-1].amount.toString(), "500000");
  //   assert.equal(loanPoolAfter.loans[loanPoolAfter.loans.length-1].rate, minRate);
  //   assert.equal(loanPoolAfter.loans[loanPoolAfter.loans.length-1].collateral.toString(), "750000");

  //   // Verify lend_auction total_loans
  //   const lendAuction = await program.account.lendAuction.fetch(lendAuctionPda);
  //   assert.equal(lendAuction.totalLoans.toString(), loanPoolAfter.loans.length.toString(), "Total loans should increment");

  //   // Verify event
  //   let signature;
  //   for (let i = 0; i < 5; i++) {
  //     signature = await provider.connection.getTransaction(tx, { commitment: "confirmed" });
  //     if (signature) break;
  //     await new Promise((resolve) => setTimeout(resolve, 1000));
  //   }
  //   if (!signature) throw new Error("Failed to fetch transaction");

  //   const eventParser = new anchor.EventParser(program.programId, new anchor.BorshCoder(program.idl));
  //   const events = eventParser.parseLogs(signature.meta.logMessages);
  //   let loanIssuedEvent = null;
  //   for (const event of events) {
  //     if (event.name === "loanIssued") loanIssuedEvent = event;
  //   }

  //   assert.ok(loanIssuedEvent, "LoanIssued event should be emitted");
  //   assert.equal(loanIssuedEvent.data.lender.toBase58(), bidder.publicKey.toBase58());
  //   assert.equal(loanIssuedEvent.data.borrower.toBase58(), asker.publicKey.toBase58());
  //   assert.equal(loanIssuedEvent.data.amount.toString(), "500000");
  //   assert.equal(loanIssuedEvent.data.rate, minRate);
  //   assert.equal(loanIssuedEvent.data.shardId.toString(), shardId.toString());
  //   assert.equal(loanIssuedEvent.data.tokenMint.toBase58(), tokenMint.toBase58());
  //   assert.equal(loanIssuedEvent.data.collateralMint.toBase58(), collateralMint.toBase58());
  // });

  // it("Submits an ask without matching bids", async () => {
  //   const [lendAuctionPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("lend_auction")],
  //     program.programId
  //   );
  
  //   // Initialize lend_auction if not already done
  //   const info = await program.provider.connection.getAccountInfo(lendAuctionPda);
  //   if (!info) {
  //     await program.methods
  //       .initialize(new anchor.BN(1), [tokenMint, collateralMint])
  //       .accounts({
  //         admin: admin.publicKey,
  //       })
  //       .signers([admin])
  //       .rpc();
  //   }
  
  //   const shardCount = 1;
  //   const maxRate = 10;
  //   const shardId = computeShardId(tokenMint, maxRate, shardCount);
  
  //   const [shardPoolPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("shard_pool"), shardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );
  //   const [loanPoolPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("loan_pool"), shardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );
  
  //   const asker = Keypair.generate();
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(asker.publicKey, 2 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );
  //   const askerCollateralAccount = anchor.utils.token.associatedAddress({
  //     mint: collateralMint,
  //     owner: asker.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, collateralMint, asker.publicKey);
  //   await mintTo(provider.connection, admin, collateralMint, askerCollateralAccount, admin, 2000000);
  
  //   const borrowerTokenAccount = anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: asker.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, tokenMint, asker.publicKey);
  
  //   const vaultTokenAccount = anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: lendAuctionPda,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, tokenMint, lendAuctionPda, true);
  
  //   const vaultCollateralAccount = anchor.utils.token.associatedAddress({
  //     mint: collateralMint,
  //     owner: lendAuctionPda,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, collateralMint, lendAuctionPda, true);
  
  //   // SubmitAsk
  //   const amount = 500000;
  //   const collateral = 2000000;
  //   const tx = await program.methods
  //     .submitAsk(new anchor.BN(amount), maxRate, new anchor.BN(collateral))
  //     .accounts({
  //       shardPool: shardPoolPda,
  //       loanPool: loanPoolPda,
  //       asker: asker.publicKey,
  //       askerCollateralAccount: askerCollateralAccount,
  //       borrowerTokenAccount: borrowerTokenAccount,
  //       vaultTokenAccount: vaultTokenAccount,
  //       vaultCollateralAccount: vaultCollateralAccount,
  //       tokenMint: tokenMint,
  //       collateralMint: collateralMint,
  //     })
  //     .signers([asker])
  //     .rpc();
  
  //   await provider.connection.confirmTransaction(tx, "confirmed");
  
  //   // Verify token transfer
  //   const askerCollateralBalance = await getAccount(provider.connection, askerCollateralAccount);
  //   const vaultCollateralBalance = await getAccount(provider.connection, vaultCollateralAccount);
  //   assert.equal(
  //     Number(askerCollateralBalance.amount),
  //     0,
  //     "Asker should have transferred all collateral"
  //   );
  //   assert.equal(
  //     Number(vaultCollateralBalance.amount),
  //     collateral,
  //     "Vault should have received the collateral"
  //   );
  
  //   // Verify shard_pool state
  //   const shardPool = await program.account.shardPool.fetch(shardPoolPda);
  //   assert.equal(shardPool.asks.length, 1, "One ask should be added");
  //   assert.equal(shardPool.asks[0].borrower.toBase58(), asker.publicKey.toBase58(), "Borrower should match");
  //   assert.equal(shardPool.asks[0].amount.toString(), amount.toString(), "Amount should match");
  //   assert.equal(shardPool.asks[0].maxRate, maxRate, "Max rate should match");
  //   assert.equal(shardPool.asks[0].collateral.toString(), collateral.toString(), "Collateral should match");
  //   assert.equal(shardPool.asks[0].tokenMint.toBase58(), tokenMint.toBase58(), "Token mint should match");
  //   assert.equal(
  //     shardPool.asks[0].collateralMint.toBase58(),
  //     collateralMint.toBase58(),
  //     "Collateral mint should match"
  //   );
  
  //   // Verify event
  //   let signature;
  //   for (let i = 0; i < 5; i++) {
  //     signature = await provider.connection.getTransaction(tx, { commitment: "confirmed" });
  //     if (signature) break;
  //     await new Promise((resolve) => setTimeout(resolve, 1000));
  //   }
  //   if (!signature) throw new Error("Failed to fetch transaction");
  
  //   const eventParser = new anchor.EventParser(program.programId, new anchor.BorshCoder(program.idl));
  //   const events = eventParser.parseLogs(signature.meta.logMessages);
  //   let askSubmittedEvent = null;
  //   for (const event of events) {
  //     if (event.name === "askSubmitted") askSubmittedEvent = event;
  //   }
  
  //   assert.ok(askSubmittedEvent, "AskSubmitted event should be emitted");
  //   assert.equal(askSubmittedEvent.data.borrower.toBase58(), asker.publicKey.toBase58(), "Event borrower should match");
  //   assert.equal(askSubmittedEvent.data.amount.toString(), amount.toString(), "Event amount should match");
  //   assert.equal(askSubmittedEvent.data.maxRate, maxRate, "Event max rate should match");
  //   assert.equal(askSubmittedEvent.data.shardId.toString(), shardId.toString(), "Event shard ID should match");
  //   assert.equal(askSubmittedEvent.data.tokenMint.toBase58(), tokenMint.toBase58(), "Event token mint should match");
  //   assert.equal(
  //     askSubmittedEvent.data.collateralMint.toBase58(),
  //     collateralMint.toBase58(),
  //     "Event collateral mint should match"
  //   );
  // });

  // it("Repays a loan successfully", async () => {
  //   // Admin Setup and Airdrop
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(admin.publicKey, 10 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );

  //   const [lendAuctionPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("lend_auction")],
  //     program.programId
  //   );

  //   const info = await program.provider.connection.getAccountInfo(lendAuctionPda);
  //   if (!info) {
  //     await program.methods
  //       .initialize(new anchor.BN(1), [tokenMint, collateralMint])
  //       .accounts({
  //         admin: admin.publicKey,
  //       })
  //       .signers([admin])
  //       .rpc();
  //   }

  //   // Define Shard IDs and PDAs
  //   const shardCount = 1;
  //   const rate = 10;
  //   const shardId = computeShardId(tokenMint, rate, shardCount);

  //   const [shardPoolPda, _a] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("shard_pool"), shardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );
  //   const [loanPoolPda, _b] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("loan_pool"), shardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );

  //   // Setup Bidder and Borrower
  //   const bidder = Keypair.generate();
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(bidder.publicKey, 2 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );
  //   const bidderTokenAccount = anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: bidder.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, tokenMint, bidder.publicKey);
  //   await mintTo(provider.connection, admin, tokenMint, bidderTokenAccount, admin, 10_000_000);

  //   const borrower = Keypair.generate();
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(borrower.publicKey, 2 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );
  //   const borrowerTokenAccount = anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: borrower.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, tokenMint, borrower.publicKey);
  //   const borrowerCollateralAccount = anchor.utils.token.associatedAddress({
  //     mint: collateralMint,
  //     owner: borrower.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, collateralMint, borrower.publicKey);
  //   await mintTo(provider.connection, admin, collateralMint, borrowerCollateralAccount, admin, 20_000_000);

  //   // Setup Vault Accounts
  //   const vaultTokenAccount = anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: lendAuctionPda,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, tokenMint, lendAuctionPda, true);
  //   await mintTo(provider.connection, admin, tokenMint, vaultTokenAccount, admin, 10_000_000);

  //   const vaultCollateralAccount = anchor.utils.token.associatedAddress({
  //     mint: collateralMint,
  //     owner: lendAuctionPda,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, collateralMint, lendAuctionPda, true);

  //   // Submit Bid
  //   const bidTx = await program.methods
  //     .submitBid(new anchor.BN(1_000_000), rate, new anchor.BN(1000))
  //     .accounts({
  //       shardPool: shardPoolPda,
  //       loanPool: loanPoolPda,
  //       bidder: bidder.publicKey,
  //       bidderTokenAccount: bidderTokenAccount,
  //       borrowerTokenAccount: borrowerTokenAccount,
  //       vaultTokenAccount: vaultTokenAccount,
  //       tokenMint: tokenMint,
  //     })
  //     .signers([bidder])
  //     .rpc();

  //   const shardPoolAfterBid = await program.account.shardPool.fetch(shardPoolPda);

  //   // Submit Ask
  //   const askTx = await program.methods
  //     .submitAsk(new anchor.BN(1_000_000), rate, new anchor.BN(2_000_000))
  //     .accounts({
  //       shardPool: shardPoolPda,
  //       loanPool: loanPoolPda,
  //       asker: borrower.publicKey,
  //       askerCollateralAccount: borrowerCollateralAccount,
  //       borrowerTokenAccount: borrowerTokenAccount,
  //       vaultTokenAccount: vaultTokenAccount,
  //       vaultCollateralAccount: vaultCollateralAccount,
  //       tokenMint: tokenMint,
  //       collateralMint: collateralMint,
  //     })
  //     .signers([borrower])
  //     .rpc();

  //   // Verify loan creation
  //   const loanPoolAfterAsk = await program.account.loanPool.fetch(loanPoolPda);
  //   assert.equal(loanPoolAfterAsk.loans.length, 1, "Loan should be created");

  //   const loan = loanPoolAfterAsk.loans[0];
  //   assert.equal(loan.amount.toString(), "1000000", "Loan amount should be 1M");
  //   assert.equal(loan.collateral.toString(), "2000000", "Collateral should be 2M");
  //   assert.equal(loan.rate, rate, "Rate should be 10");
  //   assert.equal(loan.repaid, false, "Loan should not be repaid yet");

  //   // Fund Borrower for Repayment and Repay
  //   const durationSlots = 1000;
  //   const elapsedSlots = 100;
  //   const interestFactor = (elapsedSlots * loan.rate) / (durationSlots);
  //   const interest = Math.floor((loan.amount.toNumber() * interestFactor) / 100);
  //   const repaymentAmount = loan.amount.toNumber() + interest;

  //   await mintTo(provider.connection, admin, tokenMint, borrowerTokenAccount, admin, repaymentAmount);

  //   const repayTx = await program.methods
  //     .repay(new anchor.BN(0), rate)
  //     .accounts({
  //       loanPool: loanPoolPda,
  //       borrower: borrower.publicKey,
  //       borrowerTokenAccount: borrowerTokenAccount,
  //       borrowerCollateralAccount: borrowerCollateralAccount,
  //       lenderTokenAccount: bidderTokenAccount,
  //       vaultCollateralAccount,    
  //       tokenMint    
  //     })
  //     .signers([borrower])
  //     .rpc();

  //   // Verify Results
  //   const updatedLoanPool = await program.account.loanPool.fetch(loanPoolPda);
  //   assert.equal(updatedLoanPool.loans[0].repaid, true, "Loan should be marked as repaid");
  // });

  // it("Repays a loan and withdraws fees successfully", async () => {
  //   // Admin Setup and Airdrop
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(admin.publicKey, 10 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );

  //   const [lendAuctionPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("lend_auction")],
  //     program.programId
  //   );

  //   const info = await program.provider.connection.getAccountInfo(lendAuctionPda);
  //   if (!info) {
  //     await program.methods
  //       .initialize(new anchor.BN(1), [tokenMint, collateralMint])
  //       .accounts({
  //         admin: admin.publicKey,
  //       })
  //       .signers([admin])
  //       .rpc();
  //   }

  //   const shardCount = 1;
  //   const rate = 10;
  //   const shardId = computeShardId(tokenMint, rate, shardCount);

  //   const [shardPoolPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("shard_pool"), shardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );
  //   const [loanPoolPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("loan_pool"), shardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );

  //   // Setup Bidder and Borrower
  //   const bidder = Keypair.generate();
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(bidder.publicKey, 2 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );
  //   const bidderTokenAccount = anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: bidder.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, tokenMint, bidder.publicKey);
  //   await mintTo(provider.connection, admin, tokenMint, bidderTokenAccount, admin, 10_000_000);

  //   const borrower = Keypair.generate();
  //   await provider.connection.confirmTransaction(
  //     await provider.connection.requestAirdrop(borrower.publicKey, 2 * LAMPORTS_PER_SOL),
  //     "confirmed"
  //   );
  //   const borrowerTokenAccount = anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: borrower.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, tokenMint, borrower.publicKey);
  //   const borrowerCollateralAccount = anchor.utils.token.associatedAddress({
  //     mint: collateralMint,
  //     owner: borrower.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, collateralMint, borrower.publicKey);
  //   await mintTo(provider.connection, admin, collateralMint, borrowerCollateralAccount, admin, 20_000_000);

  //   // Setup Vault Accounts
  //   const vaultTokenAccount = anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: lendAuctionPda,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, tokenMint, lendAuctionPda, true);
  //   await mintTo(provider.connection, admin, tokenMint, vaultTokenAccount, admin, 10_000_000);

  //   const vaultCollateralAccount = anchor.utils.token.associatedAddress({
  //     mint: collateralMint,
  //     owner: lendAuctionPda,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, collateralMint, lendAuctionPda, true);

  //   // Submit Bid
  //   const bidTx = await program.methods
  //     .submitBid(new anchor.BN(1_000_000), rate, new anchor.BN(1000))
  //     .accounts({
  //       shardPool: shardPoolPda,
  //       loanPool: loanPoolPda,
  //       bidder: bidder.publicKey,
  //       bidderTokenAccount: bidderTokenAccount,
  //       borrowerTokenAccount: borrowerTokenAccount,
  //       vaultTokenAccount: vaultTokenAccount,
  //       tokenMint: tokenMint,
  //     })
  //     .signers([bidder])
  //     .rpc();

  //   const shardPoolAfterBid = await program.account.shardPool.fetch(shardPoolPda);

  //   // Submit Ask
  //   const askTx = await program.methods
  //     .submitAsk(new anchor.BN(1_000_000), rate, new anchor.BN(2_000_000))
  //     .accounts({
  //       shardPool: shardPoolPda,
  //       loanPool: loanPoolPda,
  //       asker: borrower.publicKey,
  //       askerCollateralAccount: borrowerCollateralAccount,
  //       borrowerTokenAccount: borrowerTokenAccount,
  //       vaultTokenAccount: vaultTokenAccount,
  //       vaultCollateralAccount: vaultCollateralAccount,
  //       tokenMint: tokenMint,
  //       collateralMint: collateralMint,
  //     })
  //     .signers([borrower])
  //     .rpc();

  //   const loanPoolAfterAsk = await program.account.loanPool.fetch(loanPoolPda);
  //   const loan = loanPoolAfterAsk.loans[0];
  //   assert.equal(loanPoolAfterAsk.loans.length, 1, "Loan should be created");

  //   // Fund Borrower for Repayment and Repay
  //   const durationSlots = 1000;
  //   const elapsedSlots = 100;
  //   const interestFactor = (elapsedSlots * loan.rate) / (durationSlots * 100); // 0.01
  //   const interest = Math.floor(loan.amount.toNumber() * interestFactor / 100); // 100
  //   const repaymentAmount = loan.amount.toNumber() + interest; // 1,000,100
  //   await mintTo(provider.connection, admin, tokenMint, borrowerTokenAccount, admin, repaymentAmount);

  //   const repayTx = await program.methods
  //     .repay(new anchor.BN(0), rate)
  //     .accounts({
  //       loanPool: loanPoolPda,
  //       borrower: borrower.publicKey,
  //       borrowerTokenAccount,
  //       borrowerCollateralAccount,
  //       lenderTokenAccount: bidderTokenAccount,
  //       vaultCollateralAccount,
  //       tokenMint
  //     })
  //     .signers([borrower])
  //     .rpc();

  //   const updatedLoanPool = await program.account.loanPool.fetch(loanPoolPda);
  //   assert.equal(updatedLoanPool.loans[0].repaid, true, "Loan should be marked as repaid");

  //   // Setup and Test Withdraw Fees
  //   const [feeVaultPda] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("fee_vault"), shardId.toArrayLike(Buffer, "le", 8)],
  //     program.programId
  //   );

  //   const feeVaultAccount = anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: lendAuctionPda,
  //   });
  //   // Create and fund fee_vault
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, tokenMint, lendAuctionPda, true);
  //   await mintTo(provider.connection, admin, tokenMint, feeVaultAccount, admin, 500_000); // Fund with 500,000 tokens

  //   const adminTokenAccount = anchor.utils.token.associatedAddress({
  //     mint: tokenMint,
  //     owner: admin.publicKey,
  //   });
  //   await getOrCreateAssociatedTokenAccount(provider.connection, admin, tokenMint, admin.publicKey);

  //   const initialAdminBalance = await getAccount(provider.connection, adminTokenAccount);

  //   const withdrawAmount = 200_000;
  //   const withdrawTx = await program.methods
  //     .withdrawFees(shardId, new anchor.BN(withdrawAmount))
  //     .accounts({
  //       admin: admin.publicKey,
  //       feeVault: feeVaultAccount,
  //       adminTokenAccount,
  //       tokenMint
  //     })
  //     .signers([admin])
  //     .rpc();
  // });
});
