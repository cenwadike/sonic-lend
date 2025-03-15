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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AssetTable } from "@/components/asset-table"
import { Info, ArrowUpFromLine } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HealthFactorIndicator } from "@/components/health-factor-indicator"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { AssetIcon } from "@/components/asset-icon"
import { FadeIn, SlideUp, StaggerChildren, StaggerItem } from "@/components/animations"
import { getMarketData, borrowAsset, getUserPositions } from "@/lib/solana"

export function BorrowPage() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
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
        console.error("Error fetching market data:", error)
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

  // Calculate borrowing capacity (150% collateral requirement)
  const borrowCapacity = userStats.totalSupplied / 1.5
  const remainingBorrowCapacity = Math.max(borrowCapacity - userStats.totalBorrowed, 0)

  // Calculate new health factor based on borrow amount
  const calculateNewHealthFactor = (borrowAmount: number, tokenPrice: number) => {
    const borrowValue = borrowAmount * tokenPrice
    const newTotalBorrowed = userStats.totalBorrowed + borrowValue
    const collateralRatio = userStats.totalSupplied / newTotalBorrowed

    // Health factor is collateral ratio / minimum required ratio (1.5)
    return collateralRatio / 1.5
  }

  const getSelectedAssetDetails = () => {
    return marketData.find((asset) => asset.token === selectedAsset)
  }

  const handleBorrow = async () => {
    if (!selectedAsset || !amount) return

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

      // Borrow asset
      const txHash = await borrowAsset(mockWallet, selectedAsset, Number(amount))

      setIsConfirmOpen(false)
      setAmount("")
      setSelectedAsset(null)

      toast({
        title: "Borrow successful",
        description: `You have successfully borrowed ${amount} ${selectedAsset}. Transaction: ${txHash.substring(0, 8)}...`,
      })
    } catch (err) {
      console.error("Error borrowing:", err)
      toast({
        title: "Borrow failed",
        description: err instanceof Error ? err.message : "An error occurred while processing your borrow request",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMaxClick = () => {
    const asset = getSelectedAssetDetails()
    if (asset) {
      // Calculate max borrow amount based on remaining capacity and available tokens
      const maxTokenAmount = Math.min(remainingBorrowCapacity / asset.price, asset.available)
      setAmount(maxTokenAmount.toFixed(2))
    }
  }

  const borrowAmountValue = amount ? Number.parseFloat(amount) : 0
  const selectedAssetDetails = getSelectedAssetDetails()
  const borrowValue = borrowAmountValue * (selectedAssetDetails?.price || 0)
  const newHealthFactor =
    !isNaN(borrowAmountValue) && selectedAssetDetails
      ? calculateNewHealthFactor(borrowAmountValue, selectedAssetDetails.price)
      : undefined

  return (
    <FadeIn>
      <div className="space-y-8">
        <div className="flex flex-col space-y-4">
          <h1 className="text-3xl font-bold">Borrow</h1>
          <p className="text-muted-foreground">Borrow assets against your supplied collateral</p>
        </div>

        <StaggerChildren>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StaggerItem>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Borrow Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${borrowCapacity.toLocaleString()}</div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>
                        Used: {borrowCapacity > 0 ? ((userStats.totalBorrowed / borrowCapacity) * 100).toFixed(2) : "0"}
                        %
                      </span>
                      <span>${userStats.totalBorrowed.toLocaleString()}</span>
                    </div>
                    <Progress
                      value={borrowCapacity > 0 ? (userStats.totalBorrowed / borrowCapacity) * 100 : 0}
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Collateral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${userStats.totalSupplied.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all supplied assets</p>
                </CardContent>
              </Card>
            </StaggerItem>
          </div>
        </StaggerChildren>

        <Tabs defaultValue="borrow">
          <TabsList>
            <TabsTrigger value="borrow">Borrow</TabsTrigger>
            <TabsTrigger value="your-borrows">Your Borrows</TabsTrigger>
          </TabsList>

          <TabsContent value="borrow">
            <SlideUp>
              <Card className="mt-4 overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300">
                <CardHeader>
                  <CardTitle>Available Assets</CardTitle>
                  <CardDescription>Select an asset to borrow from the protocol</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead>Borrow APY</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {marketData.map((asset) => (
                          <TableRow key={asset.token}>
                            <TableCell>
                              <div className="flex items-center">
                                <AssetIcon asset={asset.token} className="h-6 w-6 mr-2" />
                                <span>{asset.token}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>
                                  {asset.available.toLocaleString()} {asset.token}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ${(asset.available * asset.price).toLocaleString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-amber-500">{asset.borrowAPY.toFixed(2)}%</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  onClick={() => setSelectedAsset(asset.token)}
                                  disabled={asset.available <= 0 || remainingBorrowCapacity <= 0}
                                >
                                  <ArrowUpFromLine className="mr-2 h-4 w-4" />
                                  Borrow
                                </Button>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
          </TabsContent>

          <TabsContent value="your-borrows">
            <SlideUp>
              <Card className="mt-4 overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300">
                <CardHeader>
                  <CardTitle>Your Borrowed Assets</CardTitle>
                  <CardDescription>Assets you've borrowed from the protocol</CardDescription>
                </CardHeader>
                <CardContent>
                  {userPositions.length > 0 ? (
                    <AssetTable
                      assets={userPositions.map((pos) => ({
                        asset: pos.borrowedToken,
                        balance: pos.borrowedAmount,
                        value: pos.borrowedAmount * getTokenPrice(pos.borrowedToken),
                        apy: marketData.find((m) => m.token === pos.borrowedToken)?.borrowAPY || 0,
                      }))}
                      type="borrowed"
                      columns={["asset", "balance", "value", "apy", "actions"]}
                    />
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">You haven't borrowed any assets yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </SlideUp>
          </TabsContent>
        </Tabs>

        {/* Borrow Modal */}
        <AnimatePresence>
          {selectedAsset && (
            <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Borrow {selectedAsset}</DialogTitle>
                  <DialogDescription>Enter the amount you want to borrow</DialogDescription>
                </DialogHeader>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6 py-4"
                >
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label htmlFor="amount" className="text-sm font-medium">
                          Amount
                        </label>
                        <div className="text-sm text-muted-foreground">
                          Available: {getSelectedAssetDetails()?.available.toLocaleString()} {selectedAsset}
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
                      <label className="text-sm font-medium">Amount to borrow</label>
                      <Slider
                        value={[Number.parseFloat(amount) || 0]}
                        max={Math.min(
                          getSelectedAssetDetails()?.available || 0,
                          remainingBorrowCapacity / (getSelectedAssetDetails()?.price || 1),
                        )}
                        step={0.01}
                        onValueChange={(value) => setAmount(value[0].toString())}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0 {selectedAsset}</span>
                        <span>
                          {Math.min(
                            getSelectedAssetDetails()?.available || 0,
                            remainingBorrowCapacity / (getSelectedAssetDetails()?.price || 1),
                          ).toLocaleString()}{" "}
                          {selectedAsset}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-md border p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Borrow APY</span>
                        <span className="text-sm text-amber-500">
                          {getSelectedAssetDetails()?.borrowAPY.toFixed(2)}%
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Collateral Ratio</span>
                          <span
                            className={
                              borrowValue > 0 && userStats.totalSupplied / (userStats.totalBorrowed + borrowValue) < 1.5
                                ? "text-red-500"
                                : ""
                            }
                          >
                            {borrowValue > 0
                              ? ((userStats.totalSupplied / (userStats.totalBorrowed + borrowValue)) * 100).toFixed(0) +
                                "%"
                              : userStats.totalBorrowed > 0
                                ? ((userStats.totalSupplied / userStats.totalBorrowed) * 100).toFixed(0) + "%"
                                : "N/A"}
                          </span>
                        </div>
                        <Progress
                          value={
                            borrowValue > 0
                              ? Math.min(
                                  (userStats.totalSupplied / (userStats.totalBorrowed + borrowValue) / 1.5) * 100,
                                  100,
                                )
                              : Math.min(
                                  (userStats.totalSupplied / Math.max(userStats.totalBorrowed, 1) / 1.5) * 100,
                                  100,
                                )
                          }
                          className="h-2"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Health Factor</span>
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
                            {userStats.healthFactor.toFixed(2)} →{" "}
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
                  </div>
                </motion.div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedAsset(null)}>
                    Cancel
                  </Button>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => setIsConfirmOpen(true)}
                      disabled={
                        !amount ||
                        isNaN(Number(amount)) ||
                        Number(amount) <= 0 ||
                        (newHealthFactor !== undefined && newHealthFactor < 1.0)
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
              <DialogTitle>Confirm Borrow</DialogTitle>
              <DialogDescription>Please review the transaction details</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center">
                <span>Asset</span>
                <div className="flex items-center">
                  <AssetIcon asset={selectedAsset || ""} className="h-5 w-5 mr-2" />
                  <span>{selectedAsset}</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span>Amount</span>
                <span>
                  {Number.parseFloat(amount).toLocaleString()} {selectedAsset}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>Value</span>
                <span>${(Number.parseFloat(amount) * (getSelectedAssetDetails()?.price || 0)).toLocaleString()}</span>
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
              <Button onClick={handleBorrow} disabled={isLoading}>
                {isLoading ? "Processing..." : "Confirm Borrow"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FadeIn>
  )
}

// Import Table components for the borrow page
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

