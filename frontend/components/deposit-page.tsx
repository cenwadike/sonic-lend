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
import { Info, ArrowDownToLine } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { AssetIcon } from "@/components/asset-icon"
import { FadeIn, SlideUp } from "@/components/animations"
import { getMarketData, depositCollateral, getUserPositions } from "@/lib/solana"

export function DepositPage() {
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

  const getSelectedAssetDetails = () => {
    return marketData.find((asset) => asset.token === selectedAsset)
  }

  const handleDeposit = async () => {
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

      // Get token mint from selected asset
      const assetDetails = getSelectedAssetDetails()
      if (!assetDetails) {
        throw new Error("Asset not found")
      }

      // Deposit collateral
      const txHash = await depositCollateral(mockWallet, selectedAsset, Number(amount))

      setIsConfirmOpen(false)
      setAmount("")
      setSelectedAsset(null)

      toast({
        title: "Deposit successful",
        description: `You have successfully deposited ${amount} ${selectedAsset}. Transaction: ${txHash.substring(0, 8)}...`,
      })
    } catch (err) {
      console.error("Error depositing:", err)
      toast({
        title: "Deposit failed",
        description: err instanceof Error ? err.message : "An error occurred while processing your deposit",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMaxClick = () => {
    const asset = getSelectedAssetDetails()
    if (asset) {
      // In a real app, we would get the user's wallet balance for this token
      setAmount("10") // Mock value
    }
  }

  return (
    <FadeIn>
      <div className="space-y-8">
        <div className="flex flex-col space-y-4">
          <h1 className="text-3xl font-bold">Deposit</h1>
          <p className="text-muted-foreground">Supply assets to earn interest and use as collateral</p>
        </div>

        <Tabs defaultValue="deposit">
          <TabsList>
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="your-deposits">Your Deposits</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit">
            <SlideUp>
              <Card className="mt-4 overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300">
                <CardHeader>
                  <CardTitle>Available Assets</CardTitle>
                  <CardDescription>Select an asset to deposit into the protocol</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Market Size</TableHead>
                          <TableHead>Supply APY</TableHead>
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
                                  {asset.totalSupplied.toLocaleString()} {asset.token}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ${(asset.totalSupplied * asset.price).toLocaleString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-green-500">{asset.depositAPY.toFixed(2)}%</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button onClick={() => setSelectedAsset(asset.token)}>
                                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                                  Deposit
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

          <TabsContent value="your-deposits">
            <SlideUp>
              <Card className="mt-4 overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300">
                <CardHeader>
                  <CardTitle>Your Deposits</CardTitle>
                  <CardDescription>Assets you've supplied to the protocol</CardDescription>
                </CardHeader>
                <CardContent>
                  {userPositions.length > 0 ? (
                    <AssetTable
                      assets={userPositions.map((pos) => ({
                        asset: pos.collateralToken,
                        balance: pos.collateralAmount,
                        value:
                          pos.collateralAmount * (marketData.find((m) => m.token === pos.collateralToken)?.price || 0),
                        apy: marketData.find((m) => m.token === pos.collateralToken)?.depositAPY || 0,
                        collateral: true,
                      }))}
                      type="supplied"
                      columns={["asset", "balance", "value", "apy", "collateral"]}
                    />
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">You haven't supplied any assets yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </SlideUp>
          </TabsContent>
        </Tabs>

        {/* Deposit Modal */}
        <AnimatePresence>
          {selectedAsset && (
            <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Deposit {selectedAsset}</DialogTitle>
                  <DialogDescription>Enter the amount you want to deposit</DialogDescription>
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
                          Balance: 10 {selectedAsset} {/* Mock value */}
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
                      <label className="text-sm font-medium">Amount to deposit</label>
                      <Slider
                        value={[Number.parseFloat(amount) || 0]}
                        max={10} // Mock value
                        step={0.01}
                        onValueChange={(value) => setAmount(value[0].toString())}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0 {selectedAsset}</span>
                        <span>
                          10 {selectedAsset} {/* Mock value */}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-md border p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="text-sm">Collateral Usage</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Assets used as collateral can be borrowed against but may be liquidated if your health
                                  factor drops too low.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <span className="text-sm">Enabled</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm">Supply APY</span>
                        <span className="text-sm text-green-500">
                          {getSelectedAssetDetails()?.depositAPY.toFixed(2)}%
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm">Collateral Requirement</span>
                        <span className="text-sm">150%</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm">Liquidation Threshold</span>
                        <span className="text-sm">120%</span>
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
                      disabled={!amount || isNaN(Number(amount)) || Number(amount) <= 0}
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
              <DialogTitle>Confirm Deposit</DialogTitle>
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
                <span>Gas Fee (est.)</span>
                <span>0.000005 SOL</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleDeposit} disabled={isLoading}>
                {isLoading ? "Processing..." : "Confirm Deposit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FadeIn>
  )
}

// Import Table components for the deposit page
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

