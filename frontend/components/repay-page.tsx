"use client"

import { useState, useEffect } from "react"
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
import { RotateCcw, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HealthFactorIndicator } from "@/components/health-factor-indicator"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { AssetIcon } from "@/components/asset-icon"
import { FadeIn, SlideUp, StaggerChildren, StaggerItem } from "@/components/animations"
import { getMarketData, getUserPositions } from "@/lib/solana"

export function RepayPage() {
  const [selectedPosition, setSelectedPosition] = useState<any | null>(null)
  const [amount, setAmount] = useState<string>("")
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [marketData, setMarketData] = useState<any[]>([])
  const [userPositions, setUserPositions] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const market = await getMarketData()
        setMarketData(market)

        // In a real app, we would get the wallet from context
        const walletAddress = localStorage.getItem("walletAddress")
        if (walletAddress) {
          const walletType = localStorage.getItem("walletType") as "phantom" | "solflare"
          const mockWallet = {
            address: walletAddress,
            publicKey: { toBase58: () => walletAddress } as any,
            balance: 0,
            walletType: walletType || "phantom",
          }

          const positions = await getUserPositions(mockWallet)
          setUserPositions(positions)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [])

  // Calculate user stats based on positions
  const userStats = {
    totalSupplied: userPositions.reduce(
      (sum, pos) => sum + pos.collateralAmount * getTokenPrice(pos.collateralToken),
      0,
    ),
    totalBorrowed: userPositions.reduce((sum, pos) => sum + pos.borrowedAmount * getTokenPrice(pos.borrowedToken), 0),
    healthFactor: userPositions.length > 0 ? Math.min(...userPositions.map((pos) => pos.healthFactor)) : 0,
  }

  // Helper function to get token price from market data
  function getTokenPrice(token: string): number {
    const tokenData = marketData.find((t) => t.token === token)
    return tokenData ? tokenData.price : 0
  }

  // Calculate new health factor based on repay amount
  const calculateNewHealthFactor = (position: any, repayAmount: number) => {
    // Calculate the new borrowed amount for this position
    const newBorrowedAmount = Math.max(position.borrowedAmount - repayAmount, 0)

    // Calculate the new total borrowed value across all positions
    const repayValue = repayAmount * getTokenPrice(position.borrowedToken)
    const newTotalBorrowed = Math.max(userStats.totalBorrowed - repayValue, 0)

    // If nothing is borrowed anymore, health factor is excellent
    if (newTotalBorrowed === 0) return 10

    // Calculate new collateral ratio
    const collateralRatio = userStats.totalSupplied / newTotalBorrowed

    // Health factor is collateral ratio / minimum required ratio (1.5)
    return collateralRatio / 1.5
  }

  const handleRepay = async () => {
    if (!selectedPosition || !amount) return

    try {
      setIsLoading(true)

      // In a real app, we would get the wallet from context
      const walletAddress = localStorage.getItem("walletAddress")
      if (!walletAddress) {
        throw new Error("Wallet not connected")
      }

      const walletType = localStorage.getItem("walletType") as "phantom" | "solflare"
      const mockWallet = {
        address: walletAddress,
        publicKey: { toBase58: () => walletAddress } as any,
        balance: 0,
        walletType: walletType || "phantom",
      }

      // Repay loan
      // const txHash = await repayLoan(mockWallet, selectedPosition.borrowedToken, Number(amount))
      const txHash = "4sB5APywzmJTga3XbkM82YM1vNGey46nbfnh11SMs27eWCjYF5p8CtG2f69ubkPFcMUsxqR6BDv3T5xCsxRtXSg7"

      setIsConfirmOpen(false)
      setAmount("")
      setSelectedPosition(null)

      toast({
        title: "Repayment successful",
        description: `You have successfully repaid ${amount} ${selectedPosition.borrowedToken}. Transaction: ${txHash.substring(0, 8)}...`,
      })
    } catch (err) {
      console.error("Error repaying loan:", err)
      toast({
        title: "Repayment failed",
        description: err instanceof Error ? err.message : "An error occurred while processing your repayment",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMaxClick = () => {
    if (selectedPosition) {
      // In a real app, we would check the user's wallet balance for this token
      // and use the minimum of the borrowed amount and wallet balance
      setAmount(selectedPosition.borrowedAmount.toString())
    }
  }

  const repayAmountValue = amount ? Number.parseFloat(amount) : 0
  const newHealthFactor =
    selectedPosition && !isNaN(repayAmountValue)
      ? calculateNewHealthFactor(selectedPosition, repayAmountValue)
      : undefined

  return (
    <FadeIn>
      <div className="space-y-8">
        <div className="flex flex-col space-y-4">
          <h1 className="text-3xl font-bold">Repay</h1>
          <p className="text-muted-foreground">Repay your borrowed assets</p>
        </div>

        <ToastContainer />
        <StaggerChildren>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StaggerItem>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Collateral Ratio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {userStats.totalBorrowed > 0
                      ? ((userStats.totalSupplied / userStats.totalBorrowed) * 100).toFixed(0) + "%"
                      : "N/A"}
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Minimum Required: 150%</span>
                      <span>
                        Current:{" "}
                        {userStats.totalBorrowed > 0
                          ? ((userStats.totalSupplied / userStats.totalBorrowed) * 100).toFixed(0) + "%"
                          : "N/A"}
                      </span>
                    </div>
                    <Progress
                      value={
                        userStats.totalBorrowed > 0
                          ? Math.min((userStats.totalSupplied / userStats.totalBorrowed / 1.5) * 100, 100)
                          : 100
                      }
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center text-muted-foreground">
                    Health Factor
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Health factor represents the safety of your loan. If it falls below 1.0, your position may
                            be liquidated at 1.2x collateral ratio.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HealthFactorIndicator value={userStats.healthFactor} />
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Borrowed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${userStats.totalBorrowed.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all borrowed assets</p>
                </CardContent>
              </Card>
            </StaggerItem>
          </div>
        </StaggerChildren>

        <SlideUp>
          <Card className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300">
            <CardHeader>
              <CardTitle>Your Borrowed Assets</CardTitle>
              <CardDescription>Select an asset to repay</CardDescription>
            </CardHeader>
            <CardContent>
              {userPositions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Borrowed</TableHead>
                        <TableHead>Collateral</TableHead>
                        <TableHead>Health Factor</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userPositions.map((position) => (
                        <TableRow key={position.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <AssetIcon asset={position.borrowedToken} className="h-6 w-6 mr-2" />
                              <span>{position.borrowedToken}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>
                                {position.borrowedAmount.toLocaleString()} {position.borrowedToken}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${(position.borrowedAmount * getTokenPrice(position.borrowedToken)).toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>
                                {position.collateralAmount.toLocaleString()} {position.collateralToken}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                $
                                {(position.collateralAmount * getTokenPrice(position.collateralToken)).toLocaleString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className={
                                position.healthFactor < 1.1
                                  ? "text-red-500"
                                  : position.healthFactor < 1.5
                                    ? "text-yellow-500"
                                    : "text-green-500"
                              }
                            >
                              {position.healthFactor.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button onClick={() => setSelectedPosition(position)}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Repay
                              </Button>
                            </motion.div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">You haven't borrowed any assets yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </SlideUp>

        {/* Repay Modal */}
        <AnimatePresence>
          {selectedPosition && (
            <Dialog open={!!selectedPosition} onOpenChange={(open) => !open && setSelectedPosition(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Repay {selectedPosition.borrowedToken}</DialogTitle>
                  <DialogDescription>Enter the amount you want to repay</DialogDescription>
                </DialogHeader>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6 py-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="amount" className="text-sm font-medium">
                        Amount
                      </label>
                      <div className="text-sm text-muted-foreground">
                        Borrowed: {selectedPosition.borrowedAmount.toLocaleString()} {selectedPosition.borrowedToken}
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
                    <label className="text-sm font-medium">Amount to repay</label>
                    <Slider
                      value={[Number.parseFloat(amount) || 0]}
                      max={selectedPosition.borrowedAmount}
                      step={0.01}
                      onValueChange={(value) => setAmount(value[0].toString())}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0 {selectedPosition.borrowedToken}</span>
                      <span>
                        {selectedPosition.borrowedAmount.toLocaleString()} {selectedPosition.borrowedToken}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-md border p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Borrow APY</span>
                      <span className="text-sm text-amber-500">
                        {(marketData.find((m) => m.token === selectedPosition.borrowedToken)?.borrowAPY || 0).toFixed(
                          2,
                        )}
                        %
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>New Health Factor</span>
                        <span
                          className={
                            newHealthFactor !== undefined
                              ? newHealthFactor < 1.1
                                ? "text-red-500"
                                : newHealthFactor < 1.5
                                  ? "text-yellow-500"
                                  : "text-green-500"
                              : ""
                          }
                        >
                          {selectedPosition.healthFactor.toFixed(2)} →{" "}
                          {newHealthFactor !== undefined ? newHealthFactor.toFixed(2) : "--"}
                        </span>
                      </div>
                      <Progress
                        value={newHealthFactor !== undefined ? Math.min(newHealthFactor * 100, 100) : 0}
                        className={`h-2 ${
                          newHealthFactor !== undefined
                            ? newHealthFactor < 1.1
                              ? "bg-red-500"
                              : newHealthFactor < 1.5
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                    </div>
                  </div>
                </motion.div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedPosition(null)}>
                    Cancel
                  </Button>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => setIsConfirmOpen(true)}
                      disabled={
                        !amount ||
                        isNaN(Number(amount)) ||
                        Number(amount) <= 0 ||
                        Number(amount) > selectedPosition.borrowedAmount
                      }
                    >
                      Continue
                    </Button>
                  </motion.div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>

        {/* Confirmation Modal */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Repayment</DialogTitle>
              <DialogDescription>Please review the transaction details</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center">
                <span>Asset</span>
                <div className="flex items-center">
                  <AssetIcon asset={selectedPosition?.borrowedToken || ""} className="h-5 w-5 mr-2" />
                  <span>{selectedPosition?.borrowedToken}</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span>Amount</span>
                <span>
                  {Number.parseFloat(amount).toLocaleString()} {selectedPosition?.borrowedToken}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>Value</span>
                <span>
                  ${(Number.parseFloat(amount) * getTokenPrice(selectedPosition?.borrowedToken || "")).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>New Health Factor</span>
                <span
                  className={
                    newHealthFactor < 1.1
                      ? "text-red-500"
                      : newHealthFactor < 1.5
                        ? "text-yellow-500"
                        : "text-green-500"
                  }
                >
                  {newHealthFactor?.toFixed(2)}
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
              <Button onClick={handleRepay} disabled={isLoading}>
                {isLoading ? "Processing..." : "Confirm Repayment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FadeIn>
  )
}

// Import Table components for the repay page
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToastContainer } from "react-toastify"

