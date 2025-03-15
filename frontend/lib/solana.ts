import { toast } from "@/hooks/use-toast"
import { type PublicKey, Connection } from "@solana/web3.js"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom"
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare"

export type SolanaWallet = {
  address: string
  publicKey: PublicKey
  balance: number
  walletType: "phantom" | "solflare"
}

// Connection to Solana network
const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://mainnet.helius-rpc.com/?api-key=d1e0db78-2d9b-411a-b40e-c879d96bf3e4")

// Initialize wallet adapters
const phantomWalletAdapter = new PhantomWalletAdapter()
const solflareWalletAdapter = new SolflareWalletAdapter()

export async function connectPhantomWallet(): Promise<SolanaWallet> {
  try {
    await phantomWalletAdapter.connect()
    const publicKey = phantomWalletAdapter.publicKey

    if (!publicKey) {
      throw new Error("Failed to connect to Phantom wallet")
    }

    const balance = await connection.getBalance(publicKey)

    return {
      address: publicKey.toString(),
      publicKey,
      balance: balance / 1e9, // Convert lamports to SOL
      walletType: "phantom",
    }
  } catch (error) {
    console.error("Error connecting to Phantom wallet:", error)
    toast({
      title: "Connection failed",
      description: "Failed to connect to Phantom wallet. Please make sure it's installed and unlocked.",
      variant: "destructive",
    })
    throw error
  }
}

export async function connectSolflareWallet(): Promise<SolanaWallet> {
  try {
    await solflareWalletAdapter.connect()
    const publicKey = solflareWalletAdapter.publicKey

    if (!publicKey) {
      throw new Error("Failed to connect to Solflare wallet")
    }

    const balance = await connection.getBalance(publicKey)

    return {
      address: publicKey.toString(),
      publicKey,
      balance: balance / 1e9, // Convert lamports to SOL
      walletType: "solflare",
    }
  } catch (error) {
    console.error("Error connecting to Solflare wallet:", error)
    toast({
      title: "Connection failed",
      description: "Failed to connect to Solflare wallet. Please make sure it's installed and unlocked.",
      variant: "destructive",
    })
    throw error
  }
}

export async function disconnectWallet(walletType: "phantom" | "solflare"): Promise<void> {
  try {
    if (walletType === "phantom") {
      await phantomWalletAdapter.disconnect()
    } else {
      await solflareWalletAdapter.disconnect()
    }
  } catch (error) {
    console.error("Error disconnecting wallet:", error)
  }
}

// Sonic Lend Protocol Interaction
export async function depositCollateral(wallet: SolanaWallet, tokenMint: string, amount: number): Promise<string> {
  try {
    // This would be replaced with actual contract interaction
    console.log(`Depositing ${amount} of token ${tokenMint} as collateral`)

    // Simulate transaction
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return "transaction_hash_" + Math.random().toString(36).substring(2, 15)
  } catch (error) {
    console.error("Error depositing collateral:", error)
    throw error
  }
}

export async function borrowAsset(wallet: SolanaWallet, tokenMint: string, amount: number): Promise<string> {
  try {
    // This would be replaced with actual contract interaction
    console.log(`Borrowing ${amount} of token ${tokenMint}`)

    // Simulate transaction
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return "transaction_hash_" + Math.random().toString(36).substring(2, 15)
  } catch (error) {
    console.error("Error borrowing asset:", error)
    throw error
  }
}

export async function repayLoan(wallet: SolanaWallet, tokenMint: string, amount: number): Promise<string> {
  try {
    // This would be replaced with actual contract interaction
    console.log(`Repaying ${amount} of token ${tokenMint}`)

    // Simulate transaction
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return "transaction_hash_" + Math.random().toString(36).substring(2, 15)
  } catch (error) {
    console.error("Error repaying loan:", error)
    throw error
  }
}

export async function liquidatePosition(wallet: SolanaWallet, positionId: string, amount: number): Promise<string> {
  try {
    // This would be replaced with actual contract interaction
    console.log(`Liquidating position ${positionId} with ${amount}`)

    // Simulate transaction
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return "transaction_hash_" + Math.random().toString(36).substring(2, 15)
  } catch (error) {
    console.error("Error liquidating position:", error)
    throw error
  }
}

// Get user positions
export async function getUserPositions(wallet: SolanaWallet): Promise<any[]> {
  try {
    // This would be replaced with actual contract interaction
    console.log(`Getting positions for ${wallet.address}`)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock data
    return [
      {
        id: "pos1",
        collateralToken: "SOL",
        collateralAmount: 10,
        borrowedToken: "USDC",
        borrowedAmount: 150,
        healthFactor: 1.8,
        liquidationThreshold: 1.2,
      },
      {
        id: "pos2",
        collateralToken: "BONK",
        collateralAmount: 1000000,
        borrowedToken: "USDT",
        borrowedAmount: 50,
        healthFactor: 1.5,
        liquidationThreshold: 1.2,
      },
    ]
  } catch (error) {
    console.error("Error getting user positions:", error)
    throw error
  }
}

// Get market data
export async function getMarketData(): Promise<any[]> {
  try {
    // This would be replaced with actual contract interaction
    console.log("Getting market data")

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock data
    return [
      {
        token: "SOL",
        price: 150,
        totalSupplied: 100000,
        totalBorrowed: 50000,
        depositAPY: 2.5,
        borrowAPY: 5.2,
        available: 50000,
      },
      {
        token: "USDC",
        price: 1,
        totalSupplied: 500000,
        totalBorrowed: 300000,
        depositAPY: 3.1,
        borrowAPY: 6.5,
        available: 200000,
      },
      {
        token: "USDT",
        price: 1,
        totalSupplied: 400000,
        totalBorrowed: 250000,
        depositAPY: 3.0,
        borrowAPY: 6.2,
        available: 150000,
      },
      {
        token: "BONK",
        price: 0.00001,
        totalSupplied: 10000000000,
        totalBorrowed: 5000000000,
        depositAPY: 8.5,
        borrowAPY: 12.3,
        available: 5000000000,
      },
    ]
  } catch (error) {
    console.error("Error getting market data:", error)
    throw error
  }
}

