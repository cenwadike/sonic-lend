"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { LoadingSpinner } from "@/components/animations"
import { connectPhantomWallet, disconnectWallet, type SolanaWallet } from "@/lib/solana"

export function ConnectWalletButton() {
  const [wallet, setWallet] = useState<SolanaWallet | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    // Check if wallet address is in local storage
    const storedAddress = localStorage.getItem("walletAddress")
    const storedType = localStorage.getItem("walletType") as "phantom" | "solflare" | null

    if (storedAddress && storedType) {
      // In a real app, we would reconnect to the wallet here
      // For now, just set the stored data
      setWallet({
        address: storedAddress,
        publicKey: { toBase58: () => storedAddress } as any,
        balance: 0,
        walletType: storedType,
      })
    }
  }, [])

  // Update the connectWallet function to only use Phantom
  const connectWallet = async () => {
    try {
      setIsConnecting(true)

      const walletResponse = await connectPhantomWallet()

      setWallet(walletResponse)

      // Store wallet address and type in local storage
      localStorage.setItem("walletAddress", walletResponse.address)
      localStorage.setItem("walletType", walletResponse.walletType)

      toast({
        title: "Wallet connected",
        description: `Your Phantom wallet has been connected successfully.`,
      })
    } catch (error) {
      console.error(`Error connecting Phantom wallet:`, error)
      toast({
        title: "Connection failed",
        description: `Failed to connect to Phantom wallet.`,
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWalletHandler = async () => {
    try {
      if (wallet) {
        await disconnectWallet(wallet.walletType)
      }
      setWallet(null)

      // Remove wallet data from local storage
      localStorage.removeItem("walletAddress")
      localStorage.removeItem("walletType")

      toast({
        title: "Wallet disconnected",
        description: "Your wallet has been disconnected.",
      })

      // Redirect to login page
      router.push("/login")
    } catch (error) {
      console.error("Error disconnecting wallet:", error)
      toast({
        title: "Disconnection failed",
        description: "Failed to disconnect from wallet.",
        variant: "destructive",
      })
    }
  }

  const copyAddress = () => {
    if (wallet) {
      navigator.clipboard.writeText(wallet.address)
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard.",
      })
    }
  }

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return ""
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`
  }

  // Get wallet icon based on type
  const getWalletIcon = () => {
    if (!wallet) return <Wallet className="mr-2 h-4 w-4" />

    switch (wallet.walletType) {
      case "phantom":
        return (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="128" height="128" rx="64" fill="#AB9FF2" />
            <path
              d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4118 64.0583C13.936 87.8993 33.6927 108 57.7458 108H63.6033C84.7756 108 110.584 89.2057 110.584 64.9142Z"
              fill="white"
            />
            <path
              d="M77.8896 64.9142H89.3312C89.3312 41.7651 70.3625 23 46.9619 23C23.8507 23 5.06115 41.3057 4.60132 64.0583C4.12553 87.8993 23.8822 108 47.9353 108H53.7928C74.9651 108 100.774 89.2057 100.774 64.9142H77.8896Z"
              fill="url(#paint0_linear)"
            />
            <path
              d="M77.8896 64.9142H89.3312C89.3312 41.7651 70.3625 23 46.9619 23C23.8507 23 5.06115 41.3057 4.60132 64.0583C4.12553 87.8993 23.8822 108 47.9353 108H53.7928C74.9651 108 100.774 89.2057 100.774 64.9142H77.8896Z"
              fill="url(#paint1_linear)"
              fillOpacity="0.2"
            />
            <defs>
              <linearGradient
                id="paint0_linear"
                x1="100.774"
                y1="108"
                x2="4.60132"
                y2="108"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#534BB1" />
                <stop offset="1" stopColor="#551BF9" />
              </linearGradient>
              <linearGradient
                id="paint1_linear"
                x1="52.6875"
                y1="23"
                x2="52.6875"
                y2="108"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="white" />
                <stop offset="1" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        )
      case "solflare":
        return (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="16" fill="#FC9965" />
            <path
              d="M20.5 16.05C22.38 16.05 23.9 14.53 23.9 12.65C23.9 10.77 22.38 9.25 20.5 9.25C18.62 9.25 17.1 10.77 17.1 12.65C17.1 14.53 18.62 16.05 20.5 16.05Z"
              fill="white"
            />
            <path
              d="M11.5 16.05C13.38 16.05 14.9 14.53 14.9 12.65C14.9 10.77 13.38 9.25 11.5 9.25C9.62 9.25 8.1 10.77 8.1 12.65C8.1 14.53 9.62 16.05 11.5 16.05Z"
              fill="white"
            />
            <path
              d="M20.5 22.85C22.38 22.85 23.9 21.33 23.9 19.45C23.9 17.57 22.38 16.05 20.5 16.05C18.62 16.05 17.1 17.57 17.1 19.45C17.1 21.33 18.62 22.85 20.5 22.85Z"
              fill="white"
            />
            <path
              d="M11.5 22.85C13.38 22.85 14.9 21.33 14.9 19.45C14.9 17.57 13.38 16.05 11.5 16.05C9.62 16.05 8.1 17.57 8.1 19.45C8.1 21.33 9.62 22.85 11.5 22.85Z"
              fill="white"
            />
            <path
              d="M16 19.45C17.88 19.45 19.4 17.93 19.4 16.05C19.4 14.17 17.88 12.65 16 12.65C14.12 12.65 12.6 14.17 12.6 16.05C12.6 17.93 14.12 19.45 16 19.45Z"
              fill="white"
            />
          </svg>
        )
      default:
        return <Wallet className="mr-2 h-4 w-4" />
    }
  }

  if (!wallet) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          </motion.div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect your wallet</DialogTitle>
            <DialogDescription>Connect your Phantom wallet to use Lend</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 mt-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={connectWallet} className="w-full" disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <LoadingSpinner size="h-5 w-5" className="mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="128" height="128" rx="64" fill="#AB9FF2" />
                      <path
                        d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4118 64.0583C13.936 87.8993 33.6927 108 57.7458 108H63.6033C84.7756 108 110.584 89.2057 110.584 64.9142Z"
                        fill="white"
                      />
                      <path
                        d="M77.8896 64.9142H89.3312C89.3312 41.7651 70.3625 23 46.9619 23C23.8507 23 5.06115 41.3057 4.60132 64.0583C4.12553 87.8993 23.8822 108 47.9353 108H53.7928C74.9651 108 100.774 89.2057 100.774 64.9142H77.8896Z"
                        fill="url(#paint0_linear)"
                      />
                      <path
                        d="M77.8896 64.9142H89.3312C89.3312 41.7651 70.3625 23 46.9619 23C23.8507 23 5.06115 41.3057 4.60132 64.0583C4.12553 87.8993 23.8822 108 47.9353 108H53.7928C74.9651 108 100.774 89.2057 100.774 64.9142H77.8896Z"
                        fill="url(#paint1_linear)"
                        fillOpacity="0.2"
                      />
                      <defs>
                        <linearGradient
                          id="paint0_linear"
                          x1="100.774"
                          y1="108"
                          x2="4.60132"
                          y2="108"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#534BB1" />
                          <stop offset="1" stopColor="#551BF9" />
                        </linearGradient>
                        <linearGradient
                          id="paint1_linear"
                          x1="52.6875"
                          y1="23"
                          x2="52.6875"
                          y2="108"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="white" />
                          <stop offset="1" stopColor="white" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                    Connect Phantom
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="outline">
            <div className="flex items-center">
              <motion.div
                className="h-2 w-2 rounded-full bg-green-500 mr-2"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "loop",
                }}
              />
              <span className="flex items-center">
                {getWalletIcon()}
                {formatAddress(wallet.address)}
              </span>
              <ChevronDown className="ml-2 h-4 w-4" />
            </div>
          </Button>
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyAddress}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(`https://explorer.solana.com/address/${wallet.address}`, "_blank")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View on Explorer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnectWalletHandler}>
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

