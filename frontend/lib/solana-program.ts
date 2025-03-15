import * as anchor from "@coral-xyz/anchor"
import { Program, BN, type Idl } from "@coral-xyz/anchor"
import { PublicKey, type Connection } from "@solana/web3.js"
import { getAssociatedTokenAddress } from "@solana/spl-token"
import { sha256 } from "js-sha256"
import { toast } from "@/hooks/use-toast"

// Program ID from environment variable
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "EDvhvdnYVX2JsuAXvJXvBN3jd79ceNYMMnw11JSvzCPo",
)

// Constants for PDAs
const LEND_AUCTION_SEED = "lend_auction"
const SHARD_POOL_SEED = "shard_pool"
const LOAN_POOL_SEED = "loan_pool"

// Import IDL (assuming it's in a separate file)
import idl from "./idl.json"

// Helper function to compute shard ID based on token mint and rate
export function computeShardId(tokenMint: PublicKey, rate: number, shardCount: number): BN {
  const data = Buffer.concat([tokenMint.toBuffer(), Buffer.from([rate])])
  const hash = sha256(data)
  const hashNum = new BN(hash.slice(0, 16), 16) // Convert first 8 bytes to BN
  return hashNum.mod(new BN(shardCount))
}

export class SolanaProgram {
  private program: Program
  private connection: Connection
  private wallet: anchor.Wallet

  constructor(connection: Connection, wallet: anchor.Wallet) {
    this.connection = connection
    this.wallet = wallet

    // Create provider
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" })

    // Create program
    this.program = new Program(idl as Idl, PROGRAM_ID, provider)
  }

  // Get the lend_auction PDA
  async getLendAuctionPDA(): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync([Buffer.from(LEND_AUCTION_SEED)], this.program.programId)
  }

  // Get the shard_pool PDA
  async getShardPoolPDA(shardId: BN): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SHARD_POOL_SEED), shardId.toArrayLike(Buffer, "le", 8)],
      this.program.programId,
    )
  }

  // Get the loan_pool PDA
  async getLoanPoolPDA(shardId: BN): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(LOAN_POOL_SEED), shardId.toArrayLike(Buffer, "le", 8)],
      this.program.programId,
    )
  }

  // Get contract state
  async getContractState() {
    try {
      const [lendAuctionPDA] = await this.getLendAuctionPDA()
      const lendAuction = await this.program.account.lendAuction.fetch(lendAuctionPDA)

      return {
        admin: lendAuction.admin,
        shardCount: lendAuction.shardCount.toNumber(),
        totalLoans: lendAuction.totalLoans.toNumber(),
        supportedTokens: lendAuction.supportedTokens,
      }
    } catch (error) {
      console.error("Error fetching contract state:", error)
      toast({
        title: "Error fetching contract state",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
      return null
    }
  }

  // Submit a bid (lend)
  async submitBid(amount: number, minRate: number, durationSlots: number, tokenMint: PublicKey): Promise<string> {
    try {
      const contractState = await this.getContractState()
      if (!contractState) {
        throw new Error("Contract not initialized")
      }

      // Compute shard ID
      const shardCount = contractState.shardCount
      const shardId = computeShardId(tokenMint, minRate, shardCount)

      // Get PDAs
      const [lendAuctionPDA] = await this.getLendAuctionPDA()
      const [shardPoolPDA] = await this.getShardPoolPDA(shardId)
      const [loanPoolPDA] = await this.getLoanPoolPDA(shardId)

      // Get token accounts
      const bidderTokenAccount = await getAssociatedTokenAddress(tokenMint, this.wallet.publicKey)

      // For simplicity, we'll use the bidder's token account as the borrower's token account
      const borrowerTokenAccount = bidderTokenAccount

      // Get vault token account
      const vaultTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        lendAuctionPDA,
        true, // Allow PDA as owner
      )

      // Submit bid
      const tx = await this.program.methods
        .submitBid(new BN(amount), minRate, new BN(durationSlots))
        .accounts({
          lendAuction: lendAuctionPDA,
          shardPool: shardPoolPDA,
          loanPool: loanPoolPDA,
          bidder: this.wallet.publicKey,
          bidderTokenAccount,
          borrowerTokenAccount,
          vaultTokenAccount,
          tokenMint,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc()

      return tx
    } catch (error) {
      console.error("Error submitting bid:", error)
      toast({
        title: "Error submitting bid",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
      throw error
    }
  }

  // Submit an ask (borrow)
  async submitAsk(
    amount: number,
    maxRate: number,
    collateral: number,
    tokenMint: PublicKey,
    collateralMint: PublicKey,
  ): Promise<string> {
    try {
      const contractState = await this.getContractState()
      if (!contractState) {
        throw new Error("Contract not initialized")
      }

      // Compute shard ID
      const shardCount = contractState.shardCount
      const shardId = computeShardId(tokenMint, maxRate, shardCount)

      // Get PDAs
      const [lendAuctionPDA] = await this.getLendAuctionPDA()
      const [shardPoolPDA] = await this.getShardPoolPDA(shardId)
      const [loanPoolPDA] = await this.getLoanPoolPDA(shardId)

      // Get token accounts
      const askerCollateralAccount = await getAssociatedTokenAddress(collateralMint, this.wallet.publicKey)

      const borrowerTokenAccount = await getAssociatedTokenAddress(tokenMint, this.wallet.publicKey)

      // Get vault accounts
      const vaultTokenAccount = await getAssociatedTokenAddress(tokenMint, lendAuctionPDA, true)

      const vaultCollateralAccount = await getAssociatedTokenAddress(collateralMint, lendAuctionPDA, true)

      // Submit ask
      const tx = await this.program.methods
        .submitAsk(new BN(amount), maxRate, new BN(collateral))
        .accounts({
          lendAuction: lendAuctionPDA,
          shardPool: shardPoolPDA,
          loanPool: loanPoolPDA,
          asker: this.wallet.publicKey,
          askerCollateralAccount,
          borrowerTokenAccount,
          vaultTokenAccount,
          vaultCollateralAccount,
          tokenMint,
          collateralMint,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc()

      return tx
    } catch (error) {
      console.error("Error submitting ask:", error)
      toast({
        title: "Error submitting ask",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
      throw error
    }
  }

  // Repay a loan
  async repayLoan(
    loanIdx: number,
    rate: number,
    tokenMint: PublicKey,
    collateralMint: PublicKey,
    lenderPublicKey: PublicKey,
  ): Promise<string> {
    try {
      const contractState = await this.getContractState()
      if (!contractState) {
        throw new Error("Contract not initialized")
      }

      // Compute shard ID
      const shardCount = contractState.shardCount
      const shardId = computeShardId(tokenMint, rate, shardCount)

      // Get PDAs
      const [lendAuctionPDA] = await this.getLendAuctionPDA()
      const [loanPoolPDA] = await this.getLoanPoolPDA(shardId)

      // Get token accounts
      const borrowerTokenAccount = await getAssociatedTokenAddress(tokenMint, this.wallet.publicKey)

      const borrowerCollateralAccount = await getAssociatedTokenAddress(collateralMint, this.wallet.publicKey)

      const lenderTokenAccount = await getAssociatedTokenAddress(tokenMint, lenderPublicKey)

      // Get vault collateral account
      const vaultCollateralAccount = await getAssociatedTokenAddress(collateralMint, lendAuctionPDA, true)

      // Repay loan
      const tx = await this.program.methods
        .repay(new BN(loanIdx), rate)
        .accounts({
          lendAuction: lendAuctionPDA,
          loanPool: loanPoolPDA,
          borrower: this.wallet.publicKey,
          borrowerTokenAccount,
          borrowerCollateralAccount,
          lenderTokenAccount,
          vaultCollateralAccount,
          tokenMint,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .rpc()

      return tx
    } catch (error) {
      console.error("Error repaying loan:", error)
      toast({
        title: "Error repaying loan",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
      throw error
    }
  }

  // Cleanup stale bids and asks
  async cleanup(shardId: BN): Promise<string> {
    try {
      // Get PDAs
      const [lendAuctionPDA] = await this.getLendAuctionPDA()
      const [shardPoolPDA] = await this.getShardPoolPDA(shardId)

      // Get token accounts (these would need to be determined based on the specific tokens in the shard)
      // For simplicity, we're using placeholder accounts
      const bidderTokenAccount = await getAssociatedTokenAddress(
        new PublicKey("So11111111111111111111111111111111111111112"), // SOL mint
        this.wallet.publicKey,
      )

      const askerCollateralAccount = await getAssociatedTokenAddress(
        new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC mint
        this.wallet.publicKey,
      )

      // Get vault accounts
      const vaultTokenAccount = await getAssociatedTokenAddress(
        new PublicKey("So11111111111111111111111111111111111111112"),
        lendAuctionPDA,
        true,
      )

      const vaultCollateralAccount = await getAssociatedTokenAddress(
        new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
        lendAuctionPDA,
        true,
      )

      // Fee vault accounts
      const feeVault = vaultTokenAccount // Same as vault token account for simplicity
      const feeVaultCollateral = vaultCollateralAccount // Same as vault collateral account for simplicity

      // Cleanup
      const tx = await this.program.methods
        .cleanup(shardId)
        .accounts({
          lendAuction: lendAuctionPDA,
          shardPool: shardPoolPDA,
          bidderTokenAccount,
          askerCollateralAccount,
          vaultTokenAccount,
          vaultCollateralAccount,
          feeVault,
          feeVaultCollateral,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc()

      return tx
    } catch (error) {
      console.error("Error cleaning up:", error)
      toast({
        title: "Error cleaning up",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
      throw error
    }
  }

  // Get all loans in a shard
  async getLoans(shardId: BN) {
    try {
      const [loanPoolPDA] = await this.getLoanPoolPDA(shardId)
      const loanPool = await this.program.account.loanPool.fetch(loanPoolPDA)
      return loanPool.loans
    } catch (error) {
      console.error("Error fetching loans:", error)
      toast({
        title: "Error fetching loans",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
      return []
    }
  }

  // Get all bids in a shard
  async getBids(shardId: BN) {
    try {
      const [shardPoolPDA] = await this.getShardPoolPDA(shardId)
      const shardPool = await this.program.account.shardPool.fetch(shardPoolPDA)
      return shardPool.bids
    } catch (error) {
      console.error("Error fetching bids:", error)
      toast({
        title: "Error fetching bids",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
      return []
    }
  }

  // Get all asks in a shard
  async getAsks(shardId: BN) {
    try {
      const [shardPoolPDA] = await this.getShardPoolPDA(shardId)
      const shardPool = await this.program.account.shardPool.fetch(shardPoolPDA)
      return shardPool.asks
    } catch (error) {
      console.error("Error fetching asks:", error)
      toast({
        title: "Error fetching asks",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
      return []
    }
  }

  // Get all user loans (both as lender and borrower)
  async getUserLoans() {
    try {
      const contractState = await this.getContractState()
      if (!contractState) {
        return []
      }

      const shardCount = contractState.shardCount
      const userLoans = []

      // Iterate through all shards
      for (let i = 0; i < shardCount; i++) {
        const shardId = new BN(i)
        const loans = await this.getLoans(shardId)

        // Filter loans where user is either lender or borrower
        const userLoanInShard = loans.filter(
          (loan) => loan.lender.equals(this.wallet.publicKey) || loan.borrower.equals(this.wallet.publicKey),
        )

        userLoans.push(...userLoanInShard)
      }

      return userLoans
    } catch (error) {
      console.error("Error fetching user loans:", error)
      toast({
        title: "Error fetching user loans",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
      return []
    }
  }

  // Get all user bids
  async getUserBids() {
    try {
      const contractState = await this.getContractState()
      if (!contractState) {
        return []
      }

      const shardCount = contractState.shardCount
      const userBids = []

      // Iterate through all shards
      for (let i = 0; i < shardCount; i++) {
        const shardId = new BN(i)
        const bids = await this.getBids(shardId)

        // Filter bids where user is the lender
        const userBidsInShard = bids.filter((bid) => bid.lender.equals(this.wallet.publicKey))

        userBids.push(...userBidsInShard)
      }

      return userBids
    } catch (error) {
      console.error("Error fetching user bids:", error)
      toast({
        title: "Error fetching user bids",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
      return []
    }
  }

  // Get all user asks
  async getUserAsks() {
    try {
      const contractState = await this.getContractState()
      if (!contractState) {
        return []
      }

      const shardCount = contractState.shardCount
      const userAsks = []

      // Iterate through all shards
      for (let i = 0; i < shardCount; i++) {
        const shardId = new BN(i)
        const asks = await this.getAsks(shardId)

        // Filter asks where user is the borrower
        const userAsksInShard = asks.filter((ask) => ask.borrower.equals(this.wallet.publicKey))

        userAsks.push(...userAsksInShard)
      }

      return userAsks
    } catch (error) {
      console.error("Error fetching user asks:", error)
      toast({
        title: "Error fetching user asks",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
      return []
    }
  }
}

