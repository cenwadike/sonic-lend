"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion } from "framer-motion"
import { AssetIcon } from "@/components/asset-icon"
import { useContractClient } from "@/lib/contract"
import { PublicKey } from "@solana/web3.js"
// import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useRouter } from "next/navigation"
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer, toast } from 'react-toastify';

export function LendForm() {
  const [selectedToken, setSelectedToken] = useState<string>("SOL")
  const [amount, setAmount] = useState<string>("")
  const [interestRate, setInterestRate] = useState<number>(5) // Default 5%
  const [duration, setDuration] = useState<string>("1000") // Default 1000 slots
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLend = async () => {
    const address = localStorage.getItem("walletAddress")
    if (!selectedToken || !amount || !duration || !address) return

    router.push("/")   

    toast.success("Supplied liquidity successfully", {
      position: "top-right",
    });

    // try {
    //   // const tokenMint = SUPPORTED_TOKENS[selectedToken as keyof typeof SUPPORTED_TOKENS]
    //   const amountInLamports = Math.floor(Number.parseFloat(amount) * 1_000_000) // Convert to lamports (6 decimals)
    //   const durationSlots = Number.parseInt(duration)

    //   await submitBid(amountInLamports, interestRate, durationSlots, new PublicKey(address))
    //   setIsConfirmOpen(false)
    //   setAmount("")
    // } catch (error) {
    //   console.error("Error lending:", error)
    // }
  }

  const handleMaxClick = () => {
    // In a real app, we would get the user's wallet balance for this token
    setAmount("10") // Mock value
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <ToastContainer />
      <CardHeader>
        <CardTitle>Lend Assets</CardTitle>
        <CardDescription>Provide liquidity and earn interest</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Token</label>
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger>
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SOL">
                  <div className="flex items-center">
                    <AssetIcon asset="SOL" className="h-5 w-5 mr-2" />
                    <span>SOL</span>
                  </div>
                </SelectItem>
                <SelectItem value="USDC">
                  <div className="flex items-center">
                    <AssetIcon asset="USDC" className="h-5 w-5 mr-2" />
                    <span>USDC</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount
              </label>
              <div className="text-sm text-muted-foreground">
                Balance: 10 {selectedToken} {/* Mock value */}
              </div>
            </div>
            <div className="flex space-x-2">
              <Input
                id="amount"
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Button variant="outline" onClick={handleMaxClick}>
                Max
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">
                Interest Rate (Min)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 ml-1 text-muted-foreground inline" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        The minimum interest rate you're willing to accept. Higher rates may attract more borrowers.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <span className="text-sm font-medium">{interestRate}%</span>
            </div>
            <Slider
              value={[interestRate]}
              min={1}
              max={20}
              step={1}
              onValueChange={(value) => setInterestRate(value[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1%</span>
              <span>20%</span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="duration" className="text-sm font-medium">
              Duration (days)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 ml-1 text-muted-foreground inline" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">The duration of your loan offer in Solana slots. 1 slot ≈ 400ms.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <Input
              id="duration"
              type="number"
              placeholder="1000"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <div className="pt-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="w-full"
                onClick={() => setIsConfirmOpen(true)}
                disabled={!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !duration}
              >
                Lend {selectedToken}
              </Button>
            </motion.div>
          </div>
        </div>
      </CardContent>

      {/* Confirmation Modal */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Lending</DialogTitle>
            <DialogDescription>Please review the transaction details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <span>Asset</span>
              <div className="flex items-center">
                <AssetIcon asset={selectedToken} className="h-5 w-5 mr-2" />
                <span>{selectedToken}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>Amount</span>
              <span>
                {Number.parseFloat(amount).toLocaleString()} {selectedToken}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span>Min Interest Rate</span>
              <span>{interestRate}%</span>
            </div>

            <div className="flex justify-between items-center">
              <span>Duration</span>
              <span>{Number.parseInt(duration).toLocaleString()} slots</span>
            </div>

            <div className="flex justify-between items-center">
              <span>Gas Fee (est.)</span>
              <span>0.000005 SOL</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLend} disabled={isLoading}>
              <Link href="/lend"></Link>
              {isLoading ? "Processing..." : "Confirm Lending"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

