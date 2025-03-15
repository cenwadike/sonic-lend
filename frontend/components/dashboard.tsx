"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LendForm } from "@/components/lend-form"
import { BorrowForm } from "@/components/borrow-form"
import { LoanRepayment } from "@/components/loan-repayment"
import { useSolanaProgram } from "@/hooks/use-solana-program"
import { FadeIn, SlideUp } from "@/components/animations"

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const { userLoans, userBids, userAsks, isLoading } = useSolanaProgram()

  return (
    <FadeIn>
      <div className="space-y-8">
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="lend">Lend</TabsTrigger>
            <TabsTrigger value="borrow">Borrow</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <SlideUp>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Bids</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userBids.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Pending lending offers</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Asks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userAsks.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Pending borrowing requests</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Loans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userLoans.filter((loan) => !loan.repaid).length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Current outstanding loans</p>
                  </CardContent>
                </Card>
              </div>
            </SlideUp>

            <SlideUp delay={0.2}>
              <LoanRepayment />
            </SlideUp>
          </TabsContent>

          <TabsContent value="lend" className="mt-6">
            <SlideUp>
              <LendForm />
            </SlideUp>
          </TabsContent>

          <TabsContent value="borrow" className="mt-6">
            <SlideUp>
              <BorrowForm />
            </SlideUp>
          </TabsContent>

          <TabsContent value="loans" className="mt-6">
            <SlideUp>
              <LoanRepayment />
            </SlideUp>
          </TabsContent>
        </Tabs>
      </div>
    </FadeIn>
  )
}

