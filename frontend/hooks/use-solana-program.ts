"use client"

import { useState, useEffect } from "react"
import { Connection, PublicKey } from "@solana/web3.js"
import type * as anchor from "@coral-xyz/anchor"
import { SolanaProgram } from "@/lib/solana-program"
import { useWallet } from "@solana/wallet-adapter-react"
import { useToast } from "@/hooks/use-toast"
import type { BN } from "@coral-xyz/anchor"

// Define supported tokens
export const SUPPORTED_TOKENS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  USDC: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
}

export const SUPPORTED_COLLATERALS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  USDC: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
}

export function useSolanaProgram() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet()
  const [program, setProgram] = useState<SolanaProgram | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [userLoans, setUserLoans] = useState<any[]>([])
  const [userBids, setUserBids] = useState<any[]>([])
  const [userAsks, setUserAsks] = useState<any[]>([])
  const [contractState, setContractState] = useState<any>(null)
  const { toast } = useToast()

  // Initialize program when wallet is connected
  useEffect(() => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      setProgram(null)
      return
    }

    try {
      // Create connection
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
        "confirmed",
      )

      // Create wallet adapter
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions,
      } as anchor.Wallet

      // Create program
      const solanaProgram = new SolanaProgram(connection, wallet)
      setProgram(solanaProgram)
    } catch (error) {
      console.error("Error initializing Solana program:", error)
      toast({
        title: "Error initializing",
        description: "Failed to initialize Solana program.",
        variant: "destructive",
      })
    }
  }, [publicKey, signTransaction, signAllTransactions, toast])

  // Fetch user data when program is initialized
  useEffect(() => {
    if (!program) return

    const fetchUserData = async () => {
      setIsLoading(true)
      try {
        // Use Promise.allSettled to handle potential errors in individual requests
        const results = await Promise.allSettled([
          program.getUserLoans(),
          program.getUserBids(),
          program.getUserAsks(),
          program.getContractState(),
        ])

        if (results[0].status === "fulfilled") {
          setUserLoans(results[0].value)
        }

        if (results[1].status === "fulfilled") {
          setUserBids(results[1].value)
        }

        if (results[2].status === "fulfilled") {
          setUserAsks(results[2].value)
        }

        if (results[3].status === "fulfilled") {
          setContractState(results[3].value)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast({
          title: "Error fetching data",
          description: "Failed to fetch your lending and borrowing data.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [program, toast])

  // Submit a bid (lend)
  const submitBid = async (amount: number, minRate: number, durationSlots: number, tokenMint: PublicKey) => {
    if (!program) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to submit a bid.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const tx = await program.submitBid(amount, minRate, durationSlots, tokenMint)

      toast({
        title: "Bid submitted",
        description: `Your bid of ${amount} tokens has been submitted successfully.`,
      })

      // Refresh user data
      const [bids, loans] = await Promise.all([program.getUserBids(), program.getUserLoans()])
      setUserBids(bids)
      setUserLoans(loans)

      return tx
    } catch (error) {
      console.error("Error submitting bid:", error)
      toast({
        title: "Error submitting bid",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Submit an ask (borrow)
  const submitAsk = async (
    amount: number,
    maxRate: number,
    collateral: number,
    tokenMint: PublicKey,
    collateralMint: PublicKey,
  ) => {
    if (!program) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to submit an ask.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const tx = await program.submitAsk(amount, maxRate, collateral, tokenMint, collateralMint)

      toast({
        title: "Ask submitted",
        description: `Your ask of ${amount} tokens has been submitted successfully.`,
      })

      // Refresh user data
      const [asks, loans] = await Promise.all([program.getUserAsks(), program.getUserLoans()])
      setUserAsks(asks)
      setUserLoans(loans)

      return tx
    } catch (error) {
      console.error("Error submitting ask:", error)
      toast({
        title: "Error submitting ask",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Repay a loan
  const repayLoan = async (
    loanIdx: number,
    rate: number,
    tokenMint: PublicKey,
    collateralMint: PublicKey,
    lenderPublicKey: PublicKey,
  ) => {
    if (!program) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to repay a loan.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const tx = await program.repayLoan(loanIdx, rate, tokenMint, collateralMint, lenderPublicKey)

      toast({
        title: "Loan repaid",
        description: "Your loan has been repaid successfully.",
      })

      // Refresh user loans
      const loans = await program.getUserLoans()
      setUserLoans(loans)

      return tx
    } catch (error) {
      console.error("Error repaying loan:", error)
      toast({
        title: "Error repaying loan",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Cleanup stale bids and asks
  const cleanup = async (shardId: BN) => {
    if (!program) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to clean up.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const tx = await program.cleanup(shardId)

      toast({
        title: "Cleanup successful",
        description: "Stale bids and asks have been cleaned up successfully.",
      })

      // Refresh user data
      const [bids, asks] = await Promise.all([program.getUserBids(), program.getUserAsks()])
      setUserBids(bids)
      setUserAsks(asks)

      return tx
    } catch (error) {
      console.error("Error cleaning up:", error)
      toast({
        title: "Error cleaning up",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return {
    program,
    isLoading,
    userLoans,
    userBids,
    userAsks,
    contractState,
    submitBid,
    submitAsk,
    repayLoan,
    cleanup,
    SUPPORTED_TOKENS,
    SUPPORTED_COLLATERALS,
  }
}

