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
import { useRouter } from "next/navigation"
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export function BorrowForm() {
  const [selectedToken, setSelectedToken] = useState<string>("USDC")
  const [selectedCollateral, setSelectedCollateral] = useState<string>("SOL")
  const [amount, setAmount] = useState<string>("")
  const [collateralAmount, setCollateralAmount] = useState<string>("")
  const [interestRate, setInterestRate] = useState<number>(10) // Default 10%
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // const {
  //   submitAsk
  // } = useContractClient()

  const handleBorrow = async () => {
    if (!selectedToken || !selectedCollateral || !amount || !collateralAmount) return   
    
    toast.success("Borrowed successfully", {
      position: "top-right",
    });

    router.push("/")

    // try {
    //   setIsLoading(true)
    //   const amountInLamports = Math.floor(Number.parseFloat(amount) * 1_000_000) // Convert to lamports (6 decimals)
    //   const collateralInLamports = Math.floor(Number.parseFloat(collateralAmount) * 1_000_000) // Convert to lamports

    //   await submitAsk(amountInLamports, interestRate, collateralInLamports)
    //   setIsConfirmOpen(false)
    //   setAmount("")
    //   setCollateralAmount("")
    //   setIsLoading(false)
    // } catch (error) {
    //   console.error("Error borrowing:", error)
    // }
  }

  const handleMaxClick = () => {
    // In a real app, we would calculate the max borrow amount based on collateral
    setAmount("5") // Mock value
  }

  const handleCollateralMaxClick = () => {
    // In a real app, we would get the user's wallet balance for this token
    setCollateralAmount("20") // Mock value
  }

  // Calculate collateral ratio
  const calculateCollateralRatio = () => {
    if (!amount || !collateralAmount) return 0

    let tokenValue = 0
    let collateralValue = 0

    // Mock prices
    const prices = {
      SOL: 150,
      USDC: 1,
      USDT: 1,
      BONK: 0.00001,
    }

    tokenValue = Number.parseFloat(amount) * prices[selectedToken as keyof typeof prices]
    collateralValue = Number.parseFloat(collateralAmount) * prices[selectedCollateral as keyof typeof prices]

    return (collateralValue / tokenValue) * 100
  }

  const collateralRatio = calculateCollateralRatio()
  const isHealthyCollateral = collateralRatio >= 150 // 150% minimum required

  return (
    <Card className="w-full max-w-md mx-auto">
      <ToastContainer />
      <CardHeader>
        <CardTitle>Borrow Assets</CardTitle>
        <CardDescription>Borrow assets using your collateral</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Borrow Token</label>
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger>
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
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
                Borrow Amount
              </label>
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
            <label className="text-sm font-medium">Collateral Token</label>
            <Select value={selectedCollateral} onValueChange={setSelectedCollateral}>
              <SelectTrigger>
                <SelectValue placeholder="Select collateral" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SOL">
                  <div className="flex items-center">
                    <AssetIcon asset="SOL" className="h-5 w-5 mr-2" />
                    <span>SOL</span>
                  </div>
                </SelectItem>
                <SelectItem value="BONK">
                  <div className="flex items-center">
                    <AssetIcon asset="BONK" className="h-5 w-5 mr-2" />
                    <span>BONK</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="collateralAmount" className="text-sm font-medium">
                Collateral Amount
              </label>
              <div className="text-sm text-muted-foreground">
                Balance: 20 {selectedCollateral} {/* Mock value */}
              </div>
            </div>
            <div className="flex space-x-2">
              <Input
                id="collateralAmount"
                type="number"
                placeholder="0.0"
                value={collateralAmount}
                onChange={(e) => setCollateralAmount(e.target.value)}
              />
              <Button variant="outline" onClick={handleCollateralMaxClick}>
                Max
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">
                Interest Rate (Max)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 ml-1 text-muted-foreground inline" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        The maximum interest rate you're willing to pay. Lower rates may take longer to match.
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

          <div className="space-y-2 rounded-md border p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Collateral Ratio</span>
              <span className={`text-sm font-medium ${isHealthyCollateral ? "text-green-500" : "text-red-500"}`}>
                {collateralRatio.toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Minimum Required</span>
              <span className="text-sm">150%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Liquidation Threshold</span>
              <span className="text-sm">120%</span>
            </div>
          </div>

          <div className="pt-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="w-full"
                onClick={() => setIsConfirmOpen(true)}
                disabled={
                  !amount ||
                  !collateralAmount ||
                  isNaN(Number(amount)) ||
                  isNaN(Number(collateralAmount)) ||
                  Number(amount) <= 0 ||
                  Number(collateralAmount) <= 0 ||
                  !isHealthyCollateral
                }
              >
                Borrow {selectedToken}
              </Button>
            </motion.div>
          </div>
        </div>
      </CardContent>

      {/* Confirmation Modal */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Borrowing</DialogTitle>
            <DialogDescription>Please review the transaction details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <span>Borrow Asset</span>
              <div className="flex items-center">
                <AssetIcon asset={selectedToken} className="h-5 w-5 mr-2" />
                <span>{selectedToken}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>Borrow Amount</span>
              <span>
                {Number.parseFloat(amount).toLocaleString()} {selectedToken}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span>Collateral Asset</span>
              <div className="flex items-center">
                <AssetIcon asset={selectedCollateral} className="h-5 w-5 mr-2" />
                <span>{selectedCollateral}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>Collateral Amount</span>
              <span>
                {Number.parseFloat(collateralAmount).toLocaleString()} {selectedCollateral}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span>Max Interest Rate</span>
              <span>{interestRate}%</span>
            </div>

            <div className="flex justify-between items-center">
              <span>Collateral Ratio</span>
              <span className={isHealthyCollateral ? "text-green-500" : "text-red-500"}>
                {collateralRatio.toFixed(0)}%
              </span>
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
            <Button onClick={handleBorrow} disabled={isLoading}>
              {isLoading ? "Processing..." : "Confirm Borrowing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

