"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowUpFromLine, ArrowDownToLine, Info, Zap } from "lucide-react"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AssetTable } from "@/components/asset-table"
import { HealthFactorIndicator } from "@/components/health-factor-indicator"
import { FadeIn, SlideUp, StaggerChildren, StaggerItem } from "@/components/animations"
import { motion } from "framer-motion"
import { getUserPositions, getMarketData } from "@/lib/solana"

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [userPositions, setUserPositions] = useState<any[]>([])
  const [marketData, setMarketData] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

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

          const [positions, market] = await Promise.all([getUserPositions(mockWallet), getMarketData()])

          setUserPositions(positions)
          setMarketData(market)
        } else {
          setMarketData(await getMarketData())
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
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

  return (
    <FadeIn>
      <div className="space-y-8">
        <div className="flex flex-col space-y-4">
          <h1 className="text-3xl font-bold">Lend Dashboard</h1>
          <p className="text-muted-foreground">Hyperscalable capital efficient lending on Sonic SVM</p>
        </div>

        <StaggerChildren>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StaggerItem>
              <Card className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Net Position</CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div
                    className="text-2xl font-bold"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    ${(userStats.totalSupplied - userStats.totalBorrowed).toLocaleString()}
                  </motion.div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supplied ${userStats.totalSupplied.toLocaleString()} - Borrowed $
                    {userStats.totalBorrowed.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300">
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
                            Health factor represents the safety of your loan. If it falls below 1.2, your position may
                            be liquidated.
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
              <Card className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Collateral Ratio</CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div
                    className="text-2xl font-bold"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    {userStats.totalBorrowed > 0
                      ? ((userStats.totalSupplied / userStats.totalBorrowed) * 100).toFixed(0) + "%"
                      : "N/A"}
                  </motion.div>
                  <p className="text-xs text-muted-foreground mt-1">Minimum required: 150%</p>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col space-y-2">
                  <Link href="/lend" passHref>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Button className="w-full" size="sm">
                        <ArrowDownToLine className="mr-2 h-4 w-4" />
                        Lend
                      </Button>
                    </motion.div>
                  </Link>
                  <Link href="/borrow" passHref>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Button className="w-full" size="sm" variant="outline">
                        <ArrowUpFromLine className="mr-2 h-4 w-4" />
                        Borrow
                      </Button>
                    </motion.div>
                  </Link>
                </CardContent>
              </Card>
            </StaggerItem>
          </div>
        </StaggerChildren>

        <SlideUp delay={0.3}>
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="supplied">Supplied</TabsTrigger>
              <TabsTrigger value="borrowed">Borrowed</TabsTrigger>
              <TabsTrigger value="market">Market</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Card className="border-2 border-transparent hover:border-primary/20 transition-all duration-300">
                  <CardHeader>
                    <CardTitle>Your Supplied Assets</CardTitle>
                    <CardDescription>Assets you've supplied as collateral</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userPositions.length > 0 ? (
                      <AssetTable
                        assets={userPositions.map((pos) => ({
                          asset: pos.collateralToken,
                          balance: pos.collateralAmount,
                          value: pos.collateralAmount * getTokenPrice(pos.collateralToken),
                          apy: marketData.find((m) => m.token === pos.collateralToken)?.depositAPY || 0,
                        }))}
                        type="supplied"
                        columns={["asset", "balance", "value", "apy"]}
                      />
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground">You haven't supplied any assets yet</p>
                        <Link href="/lend" passHref>
                          <Button className="mt-4">Lend Now</Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2 border-transparent hover:border-primary/20 transition-all duration-300">
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
                        <Link href="/borrow" passHref>
                          <Button className="mt-4">Borrow Now</Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-2 border-transparent hover:border-primary/20 transition-all duration-300">
                <CardHeader>
                  <CardTitle>Lend Protocol Features</CardTitle>
                  <CardDescription>Capital efficient lending on Sonic SVM</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center">
                        <Zap className="h-5 w-5 text-primary mr-2" />
                        <h3 className="font-medium">Enhanced Capital Efficiency</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Continuous matching with atomic splitting ensures funds are utilized effectively, pairing large
                        positions with smaller counterparts.
                      </p>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center">
                        <Info className="h-5 w-5 text-primary mr-2" />
                        <h3 className="font-medium">Risk Management</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Loans require 1.5x collateral minimum, with liquidation at 1.2x, ensuring stability without
                        oracles.
                      </p>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center">
                        <ArrowUpFromLine className="h-5 w-5 text-primary mr-2" />
                        <h3 className="font-medium">Sonic Integration</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Built for Sonic SVM's low-cost storage and parallel execution, delivering high performance at
                        scale.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="supplied">
              <Card className="mt-4 border-2 border-transparent hover:border-primary/20 transition-all duration-300">
                <CardHeader>
                  <CardTitle>Your Supplied Assets</CardTitle>
                  <CardDescription>Assets you've supplied as collateral</CardDescription>
                </CardHeader>
                <CardContent>
                  {userPositions.length > 0 ? (
                    <AssetTable
                      assets={userPositions.map((pos) => ({
                        asset: pos.collateralToken,
                        balance: pos.collateralAmount,
                        value: pos.collateralAmount * getTokenPrice(pos.collateralToken),
                        apy: marketData.find((m) => m.token === pos.collateralToken)?.depositAPY || 0,
                        collateral: true,
                      }))}
                      type="supplied"
                      columns={["asset", "balance", "value", "apy", "collateral"]}
                    />
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">You haven't supplied any assets yet</p>
                      <Link href="/lend" passHref>
                        <Button className="mt-4">Lend Now</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="borrowed">
              <Card className="mt-4 border-2 border-transparent hover:border-primary/20 transition-all duration-300">
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
                      <Link href="/borrow" passHref>
                        <Button className="mt-4">Borrow Now</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="market">
              <Card className="mt-4 border-2 border-transparent hover:border-primary/20 transition-all duration-300">
                <CardHeader>
                  <CardTitle>Market Overview</CardTitle>
                  <CardDescription>Available assets in the Lend protocol</CardDescription>
                </CardHeader>
                <CardContent>
                  <AssetTable
                    assets={marketData.map((m) => ({
                      asset: m.token,
                      balance: m.totalSupplied,
                      value: m.totalSupplied * m.price,
                      apy: m.depositAPY,
                      borrowApy: m.borrowAPY,
                      available: m.available,
                      availableValue: m.available * m.price,
                    }))}
                    type="market"
                    columns={["asset", "balance", "value", "apy", "borrowApy", "actions"]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </SlideUp>
      </div>
    </FadeIn>
  )
}

