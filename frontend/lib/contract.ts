import * as anchor from "@coral-xyz/anchor"
import { Program, BN, type Idl } from "@coral-xyz/anchor"
import { PublicKey, type Connection } from "@solana/web3.js"
import { getAssociatedTokenAddress } from "@solana/spl-token"
import { sha256 } from "js-sha256"
import { toast } from "@/hooks/use-toast"

// Program ID - replace with the actual deployed program ID
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "EDvhvdnYVX2JsuAXvJXvBN3jd79ceNYMMnw11JSvzCPo",
)

// Constants
const LEND_AUCTION_SEED = "lend_auction"
const SHARD_POOL_SEED = "shard_pool"
const LOAN_POOL_SEED = "loan_pool"

// Import IDL
import idl from "./idl.json"

export interface ContractState {
  admin: PublicKey
  shardCount: number
  totalLoans: number
  supportedTokens: PublicKey[]
}

export interface Bid {
  lender: PublicKey
  amount: BN
  minRate: number
  slot: BN
  tokenMint: PublicKey
  durationSlots: BN
}

export interface Ask {
  borrower: PublicKey
  amount: BN
  maxRate: number
  collateral: BN
  slot: BN
  tokenMint: PublicKey
  collateralMint: PublicKey
}

export interface Loan {
  lender: PublicKey
  borrower: PublicKey
  amount: BN
  rate: number
  collateral: BN
  repaid: boolean
  shardId: BN
  tokenMint: PublicKey
  collateralMint: PublicKey
  startSlot: BN
  durationSlots: BN
}

export interface ShardPool {
  shardId: BN
  bids: Bid[]
  asks: Ask[]
}

export interface LoanPool {
  shardId: BN
  loans: Loan[]
}

export function computeShardId(tokenMint: PublicKey, rate: number, shardCount: number): BN {
  const data = Buffer.concat([tokenMint.toBuffer(), Buffer.from([rate])])
  const hash = sha256(data)
  const hashNum = new BN(hash.slice(0, 16), 16) // Convert first 8 bytes to BN
  return hashNum.mod(new BN(shardCount))
}

export class ContractClient {
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
  async getContractState(): Promise<ContractState | null> {
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
      return null
    }
  }

  // Get shard pool
  async getShardPool(shardId: BN): Promise<ShardPool | null> {
    try {
      const [shardPoolPDA] = await this.getShardPoolPDA(shardId)
      const shardPool = await this.program.account.shardPool.fetch(shardPoolPDA)

      return {
        shardId: shardPool.shardId,
        bids: shardPool.bids || [],
        asks: shardPool.asks || [],
      }
    } catch (error) {
      console.error("Error fetching shard pool:", error)
      return null
    }
  }

  // Get loan pool
  async getLoanPool(shardId: BN): Promise<LoanPool | null> {
    try {
      const [loanPoolPDA] = await this.getLoanPoolPDA(shardId)
      const loanPool = await this.program.account.loanPool.fetch(loanPoolPDA)

      return {
        shardId: loanPool.shardId,
        loans: loanPool.loans || [],
      }
    } catch (error) {
      console.error("Error fetching loan pool:", error)
      return null
    }
  }

  // Submit a bid
  async submitBid(amount: number, minRate: number, durationSlots: number, tokenMint: PublicKey): Promise<string> {
    try {
      const contractState = await this.getContractState()
      if (!contractState) {
        throw new Error("Contract not initialized")
      }

      // Compute shard ID
      const shardId = computeShardId(tokenMint, minRate, contractState.shardCount)

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
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  // Submit an ask
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
      const shardId = computeShardId(tokenMint, maxRate, contractState.shardCount)

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
        description: error.message,
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
      const shardId = computeShardId(tokenMint, rate, contractState.shardCount)

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
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  // Get all loans for a user (both as lender and borrower)
  async getUserLoans(userPublicKey: PublicKey): Promise<Loan[]> {
    try {
      const contractState = await this.getContractState()
      if (!contractState) {
        return []
      }

      const loans: Loan[] = []

      // Iterate through all possible shards
      for (let i = 0; i < contractState.shardCount; i++) {
        const shardId = new BN(i)
        const loanPool = await this.getLoanPool(shardId)

        if (loanPool && loanPool.loans && loanPool.loans.length > 0) {
          // Filter loans where user is either lender or borrower
          const userLoans = loanPool.loans.filter(
            (loan) => loan.lender.equals(userPublicKey) || loan.borrower.equals(userPublicKey),
          )

          loans.push(...userLoans)
        }
      }

      return loans
    } catch (error) {
      console.error("Error fetching user loans:", error)
      return []
    }
  }

  // Get all bids for a user
  async getUserBids(userPublicKey: PublicKey): Promise<Bid[]> {
    try {
      const contractState = await this.getContractState()
      if (!contractState) {
        return []
      }

      const bids: Bid[] = []

      // Iterate through all possible shards
      for (let i = 0; i < contractState.shardCount; i++) {
        const shardId = new BN(i)
        const shardPool = await this.getShardPool(shardId)

        if (shardPool && shardPool.bids && shardPool.bids.length > 0) {
          // Filter bids where user is the lender
          const userBids = shardPool.bids.filter((bid) => bid.lender.equals(userPublicKey))

          bids.push(...userBids)
        }
      }

      return bids
    } catch (error) {
      console.error("Error fetching user bids:", error)
      return []
    }
  }

  // Get all asks for a user
  async getUserAsks(userPublicKey: PublicKey): Promise<Ask[]> {
    try {
      const contractState = await this.getContractState()
      if (!contractState) {
        return []
      }

      const asks: Ask[] = []

      // Iterate through all possible shards
      for (let i = 0; i < contractState.shardCount; i++) {
        const shardId = new BN(i)
        const shardPool = await this.getShardPool(shardId)

        if (shardPool && shardPool.asks && shardPool.asks.length > 0) {
          // Filter asks where user is the borrower
          const userAsks = shardPool.asks.filter((ask) => ask.borrower.equals(userPublicKey))

          asks.push(...userAsks)
        }
      }

      return asks
    } catch (error) {
      console.error("Error fetching user asks:", error)
      return []
    }
  }
}

