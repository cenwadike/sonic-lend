"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AssetIcon } from "@/components/asset-icon"
import { useSolanaProgram, SUPPORTED_TOKENS, SUPPORTED_COLLATERALS } from "@/hooks/use-solana-program"
import { PublicKey } from "@solana/web3.js"
import { useWallet } from "@solana/wallet-adapter-react"
import { formatPublicKey } from "@/lib/utils"

export function LoanRepayment() {
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { userLoans, repayLoan, isLoading } = useSolanaProgram()
  const { publicKey } = useWallet()

  const handleRepay = async () => {
    if (!selectedLoan || !publicKey) return

    try {
      // Get token mints
      const tokenMint = new PublicKey(selectedLoan.tokenMint)
      const collateralMint = new PublicKey(selectedLoan.collateralMint)
      const lenderPublicKey = new PublicKey(selectedLoan.lender)

      await repayLoan(
        0, // loan index - we'll use 0 for simplicity
        selectedLoan.rate,
        tokenMint,
        collateralMint,
        lenderPublicKey,
      )

      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error repaying loan:", error)
    }
  }

  // Safely check if the user is the borrower
  const isBorrower = (loan: any) => {
    if (!publicKey || !loan || !loan.borrower) return false
    return loan.borrower.toString() === publicKey.toString()
  }

  // Safely format BN to number
  const formatBN = (bn: any) => {
    if (!bn || !bn.toNumber) return 0
    try {
      return bn.toNumber() / 1_000_000 // Convert from lamports
    } catch (error) {
      console.error("Error formatting BN:", error)
      return 0
    }
  }

  // Get token symbol from mint address
  const getTokenSymbol = (mintAddress: string) => {
    for (const [symbol, mint] of Object.entries(SUPPORTED_TOKENS)) {
      if (mint.toString() === mintAddress) {
        return symbol
      }
    }
    for (const [symbol, mint] of Object.entries(SUPPORTED_COLLATERALS)) {
      if (mint.toString() === mintAddress) {
        return symbol
      }
    }
    return "Unknown"
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Loans</CardTitle>
        <CardDescription>View and manage your active loans</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Collateral</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userLoans && userLoans.length > 0 ? (
              userLoans.map((loan, index) => {
                const tokenSymbol = getTokenSymbol(loan.tokenMint.toString())
                const collateralSymbol = getTokenSymbol(loan.collateralMint.toString())

                return (
                  <TableRow key={index}>
                    <TableCell>{isBorrower(loan) ? "Borrower" : "Lender"}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <AssetIcon asset={tokenSymbol} className="h-5 w-5 mr-2" />
                        <span>{tokenSymbol}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatBN(loan.amount).toFixed(2)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <AssetIcon asset={collateralSymbol} className="h-5 w-5 mr-2" />
                        <span>
                          {formatBN(loan.collateral).toFixed(2)} {collateralSymbol}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{loan.rate}%</TableCell>
                    <TableCell>
                      <Badge variant={loan.repaid ? "outline" : "default"}>{loan.repaid ? "Repaid" : "Active"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!loan.repaid && isBorrower(loan) && (
                        <Dialog open={isDialogOpen && selectedLoan === loan} onOpenChange={setIsDialogOpen}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedLoan(loan)
                              setIsDialogOpen(true)
                            }}
                          >
                            Repay
                          </Button>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Repay Loan</DialogTitle>
                              <DialogDescription>Are you sure you want to repay this loan?</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                              <div className="flex justify-between">
                                <span>Asset:</span>
                                <div className="flex items-center">
                                  <AssetIcon asset={tokenSymbol} className="h-5 w-5 mr-2" />
                                  <span className="font-medium">{tokenSymbol}</span>
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <span>Amount:</span>
                                <span className="font-medium">{formatBN(loan.amount).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Interest Rate:</span>
                                <span className="font-medium">{loan.rate}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Lender:</span>
                                <span className="font-medium">{formatPublicKey(loan.lender.toString())}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Collateral to Receive:</span>
                                <div className="flex items-center">
                                  <AssetIcon asset={collateralSymbol} className="h-5 w-5 mr-2" />
                                  <span className="font-medium">
                                    {formatBN(loan.collateral).toFixed(2)} {collateralSymbol}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleRepay} disabled={isLoading}>
                                {isLoading ? "Processing..." : "Confirm Repayment"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  No loans found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

