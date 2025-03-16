"use client"

import * as anchor from "@coral-xyz/anchor"
import { Program, BN } from "@coral-xyz/anchor"
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js"
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { sha256 } from "js-sha256"
import { toast } from "@/hooks/use-toast"
import { useWallet } from "@solana/wallet-adapter-react"

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "EDvhvdnYVX2JsuAXvJXvBN3jd79ceNYMMnw11JSvzCPo",
)

const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://mainnet.helius-rpc.com/?api-key=d1e0db78-2d9b-411a-b40e-c879d96bf3e4"

// Constants
const LEND_AUCTION_SEED = "lend_auction"
const SHARD_POOL_SEED = "shard_pool"
const LOAN_POOL_SEED = "loan_pool"

export const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112")
export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")

// Import IDL
import idl from "../../contract/target/idl/contract.json"

// Type the IDL explicitly
type ContractIdl = typeof idl & anchor.Idl;

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

export const useContractClient = () => {
  const { publicKey, signTransaction, connected, sendTransaction } = useWallet()
  const connection = new Connection(RPC_ENDPOINT, 'confirmed')

  const getProvider = () => {
    if (!connected || !publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }
  
    return new anchor.AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction,
        signAllTransactions: async <T extends Transaction | VersionedTransaction>(
          txs: T[]
        ): Promise<T[]> => {
          const signedTransactions = await Promise.all(
            txs.map((tx) => signTransaction(tx))
          );
          return signedTransactions as T[];
        },
      },
      { commitment: "confirmed" }
    );
  };

  const getProgram = () => {
    const provider = getProvider()
    return new Program(idl as ContractIdl, PROGRAM_ID, provider)
  }

  const getLendAuctionPDA = async (): Promise<[PublicKey, number]> => {
    return PublicKey.findProgramAddressSync([Buffer.from(LEND_AUCTION_SEED)], PROGRAM_ID)
  }

  const getShardPoolPDA = async (shardId: BN): Promise<[PublicKey, number]> => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SHARD_POOL_SEED), shardId.toArrayLike(Buffer, "le", 8)],
      PROGRAM_ID
    )
  }

  const getLoanPoolPDA = async (shardId: BN): Promise<[PublicKey, number]> => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(LOAN_POOL_SEED), shardId.toArrayLike(Buffer, "le", 8)],
      PROGRAM_ID
    )
  }

  const getContractState = async (): Promise<ContractState | null> => {
    if (!connected) return null
    try {
      const program = getProgram()
      const [lendAuctionPDA] = await getLendAuctionPDA()
      const lendAuction = await program.account.lendAuction.fetch(lendAuctionPDA) as any as ContractState
      return {
        admin: lendAuction.admin,
        shardCount: lendAuction.shardCount,
        totalLoans: lendAuction.totalLoans,
        supportedTokens: lendAuction.supportedTokens
      }
    } catch (error) {
      console.error("Error fetching contract state:", error)
      return null
    }
  }

  const getShardPool = async (shardId: BN): Promise<ShardPool | null> => {
    if (!connected) return null
    try {
      const program = getProgram()
      const [shardPoolPDA] = await getShardPoolPDA(shardId)
      const shardPool = await program.account.shardPool.fetch(shardPoolPDA) as any
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

  const getLoanPool = async (shardId: BN): Promise<LoanPool | null> => {
    if (!connected) return null
    try {
      const program = getProgram()
      const [loanPoolPDA] = await getLoanPoolPDA(shardId)
      const loanPool = await program.account.loanPool.fetch(loanPoolPDA) as any
      return {
        shardId: loanPool.shardId,
        loans: loanPool.loans || [],
      }
    } catch (error) {
      console.error("Error fetching loan pool:", error)
      return null
    }
  }

  const submitBid = async (
    amount: number,
    minRate: number,
    durationSlots: number,
    borrowerPublicKey: PublicKey
  ): Promise<string> => {
    if (!connected || !publicKey) throw new Error("Wallet not connected")

    try {
      const program = getProgram()
      const contractState = await getContractState()
      if (!contractState) throw new Error("Contract not initialized")

      const shardId = computeShardId(USDC_MINT, minRate, contractState.shardCount)
      const [lendAuctionPDA] = await getLendAuctionPDA()
      const [shardPoolPDA] = await getShardPoolPDA(shardId)
      const [loanPoolPDA] = await getLoanPoolPDA(shardId)

      const bidderTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey)
      const borrowerTokenAccount = await getAssociatedTokenAddress(USDC_MINT, borrowerPublicKey)
      const vaultTokenAccount = await getAssociatedTokenAddress(USDC_MINT, lendAuctionPDA, true)

      const transaction = await program.methods
        .submitBid(new BN(amount), minRate, new BN(durationSlots))
        .accounts({
          lendAuction: lendAuctionPDA,
          shardPool: shardPoolPDA,
          loanPool: loanPoolPDA,
          bidder: publicKey,
          bidderTokenAccount,
          borrowerTokenAccount,
          vaultTokenAccount,
          tokenMint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction()

      const txSignature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(txSignature, 'confirmed')
      return txSignature
    } catch (error: any) {
      toast({
        title: "Error submitting bid",
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  const submitAsk = async (
    amount: number,
    maxRate: number,
    collateral: number
  ): Promise<string> => {
    if (!connected || !publicKey) throw new Error("Wallet not connected")

    try {
      const program = getProgram()
      const contractState = await getContractState()
      if (!contractState) throw new Error("Contract not initialized")

      const shardId = computeShardId(USDC_MINT, maxRate, contractState.shardCount)
      const [lendAuctionPDA] = await getLendAuctionPDA()
      const [shardPoolPDA] = await getShardPoolPDA(shardId)
      const [loanPoolPDA] = await getLoanPoolPDA(shardId)

      const askerCollateralAccount = await getAssociatedTokenAddress(WSOL_MINT, publicKey)
      const borrowerTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey)
      const vaultTokenAccount = await getAssociatedTokenAddress(USDC_MINT, lendAuctionPDA, true)
      const vaultCollateralAccount = await getAssociatedTokenAddress(WSOL_MINT, lendAuctionPDA, true)

      const transaction = await program.methods
        .submitAsk(new BN(amount), maxRate, new BN(collateral))
        .accounts({
          lendAuction: lendAuctionPDA,
          shardPool: shardPoolPDA,
          loanPool: loanPoolPDA,
          asker: publicKey,
          askerCollateralAccount,
          borrowerTokenAccount,
          vaultTokenAccount,
          vaultCollateralAccount,
          tokenMint: USDC_MINT,
          collateralMint: WSOL_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction()

      const txSignature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(txSignature, 'confirmed')
      return txSignature
    } catch (error: any) {
      toast({
        title: "Error submitting ask",
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  const repayLoan = async (
    loanIdx: number,
    rate: number,
    lenderPublicKey: PublicKey
  ): Promise<string> => {
    if (!connected || !publicKey) throw new Error("Wallet not connected")

    try {
      const program = getProgram()
      const contractState = await getContractState()
      if (!contractState) throw new Error("Contract not initialized")

      const shardId = computeShardId(USDC_MINT, rate, contractState.shardCount)
      const [lendAuctionPDA] = await getLendAuctionPDA()
      const [loanPoolPDA] = await getLoanPoolPDA(shardId)

      const borrowerTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey)
      const borrowerCollateralAccount = await getAssociatedTokenAddress(WSOL_MINT, publicKey)
      const lenderTokenAccount = await getAssociatedTokenAddress(USDC_MINT, lenderPublicKey)
      const vaultCollateralAccount = await getAssociatedTokenAddress(WSOL_MINT, lendAuctionPDA, true)

      const transaction = await program.methods
        .repay(new BN(loanIdx), rate)
        .accounts({
          lendAuction: lendAuctionPDA,
          loanPool: loanPoolPDA,
          borrower: publicKey,
          borrowerTokenAccount,
          borrowerCollateralAccount,
          lenderTokenAccount,
          vaultCollateralAccount,
          tokenMint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction()

      const txSignature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(txSignature, 'confirmed')
      return txSignature
    } catch (error: any) {
      toast({
        title: "Error repaying loan",
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  const getUserLoans = async (userPublicKey: PublicKey): Promise<Loan[]> => {
    if (!connected) return []
    try {
      const contractState = await getContractState()
      if (!contractState) return []

      const loans: Loan[] = []
      for (let i = 0; i < contractState.shardCount; i++) {
        const shardId = new BN(i)
        const loanPool = await getLoanPool(shardId)
        if (loanPool?.loans?.length) {
          const userLoans = loanPool.loans.filter(
            (loan) => loan.lender.equals(userPublicKey) || loan.borrower.equals(userPublicKey)
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

  const getUserBids = async (userPublicKey: PublicKey): Promise<Bid[]> => {
    if (!connected) return []
    try {
      const contractState = await getContractState()
      if (!contractState) return []

      const bids: Bid[] = []
      for (let i = 0; i < contractState.shardCount; i++) {
        const shardId = new BN(i)
        const shardPool = await getShardPool(shardId)
        if (shardPool?.bids?.length) {
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

  const getUserAsks = async (userPublicKey: PublicKey): Promise<Ask[]> => {
    if (!connected) return []
    try {
      const contractState = await getContractState()
      if (!contractState) return []

      const asks: Ask[] = []
      for (let i = 0; i < contractState.shardCount; i++) {
        const shardId = new BN(i)
        const shardPool = await getShardPool(shardId)
        if (shardPool?.asks?.length) {
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

  return {
    getContractState,
    getShardPool,
    getLoanPool,
    submitBid,
    submitAsk,
    repayLoan,
    getUserLoans,
    getUserBids,
    getUserAsks,
  }
}
