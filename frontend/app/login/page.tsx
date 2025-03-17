"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { AuthLayout } from "@/components/auth-layout"
import { LoadingSpinner } from "@/components/animations"
import { useToast } from "@/hooks/use-toast"
import { connectPhantomWallet } from "@/lib/solana"

export default function LoginPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Check if user is already authenticated
  useEffect(() => {
    const walletAddress = localStorage.getItem("walletAddress")
    if (walletAddress) {
      router.push("/")
    }
  }, [router])

  const handleConnect = async () => {
    try {
      setIsConnecting(true)

      const walletResponse = await connectPhantomWallet()

      // Store wallet address and type in local storage
      localStorage.setItem("walletAddress", walletResponse.address)
      localStorage.setItem("walletType", walletResponse.walletType)

      toast({
        title: "Wallet connected",
        description: `Your Phantom wallet has been connected successfully.`,
      })

      // Redirect to dashboard after successful connection
      setIsRedirecting(true)
      setTimeout(() => {
        router.push("/")
      }, 1000)
    } catch (error) {
      console.error(`Error connecting Phantom wallet:`, error)
      toast({
        title: "Connection failed",
        description: `Failed to connect to Phantom wallet.`,
        variant: "destructive",
      })
      setIsConnecting(false)
    }
  }

  if (isRedirecting) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingSpinner size="h-12 w-12" />
          <p className="mt-4 text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Card className="border-2 border-transparent hover:border-primary/20 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Lend</CardTitle>
          <CardDescription>Connect your wallet to access the decentralized lending platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={handleConnect} className="w-full py-6 text-lg" disabled={isConnecting}>
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
                  Connect Phantom Wallet
                </>
              )}
            </Button>
          </motion.div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-muted-foreground text-center">
            By connecting your wallet, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </a>
          </div>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}

