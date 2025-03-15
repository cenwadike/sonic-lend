"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Loan } from "@/lib/contract"
import { useContract } from "@/hooks/use-contract"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { formatPublicKey } from "@/lib/utils"
import { useWallet } from "@solana/wallet-adapter-react"

interface UserLoansProps {
  loans: Loan[]
  showRepayButton: boolean
}

export function UserLoans({ loans, showRepayButton }: UserLoansProps) {
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { repayLoan, isLoading } = useContract()
  const { publicKey } = useWallet()

  const handleRepay = async () => {
    if (!selectedLoan || !publicKey) return

    try {
      await repayLoan(
        0, // loan index - we'll use 0 for simplicity
        selectedLoan.rate,
        selectedLoan.tokenMint,
        selectedLoan.collateralMint,
        selectedLoan.lender,
      )

      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error repaying loan:", error)
    }
  }

  // Safely check if the user is the borrower
  const isBorrower = (loan: Loan) => {
    if (!publicKey || !loan || !loan.borrower) return false
    return loan.borrower.toString() === publicKey.toString()
  }

  // Safely format BN to number
  const formatBN = (bn: any) => {
    if (!bn || !bn.toNumber) return 0
    try {
      return bn.toNumber() / 1_000_000
    } catch (error) {
      console.error("Error formatting BN:", error)
      return 0
    }
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Status</TableHead>
            {showRepayButton && <TableHead className="text-right">Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans &&
            loans.map((loan, index) => (
              <TableRow key={index}>
                <TableCell>{isBorrower(loan) ? "Borrower" : "Lender"}</TableCell>
                <TableCell>
                  <div className="font-medium">{formatBN(loan.amount).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    Collateral: {formatBN(loan.collateral).toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>{loan.rate}%</TableCell>
                <TableCell>
                  <Badge variant={loan.repaid ? "outline" : "default"}>{loan.repaid ? "Repaid" : "Active"}</Badge>
                </TableCell>
                {showRepayButton && (
                  <TableCell className="text-right">
                    {!loan.repaid && isBorrower(loan) && (
                      <Dialog open={isDialogOpen && selectedLoan === loan} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setSelectedLoan(loan)}>
                            Repay
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Repay Loan</DialogTitle>
                            <DialogDescription>Are you sure you want to repay this loan?</DialogDescription>
                          </DialogHeader>
                          <div className="py-4 space-y-4">
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
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleRepay} disabled={isLoading}>
                              {isLoading ? <LoadingSpinner className="mr-2" /> : null}
                              {isLoading ? "Processing..." : "Confirm Repayment"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          {(!loans || loans.length === 0) && (
            <TableRow>
              <TableCell colSpan={showRepayButton ? 5 : 4} className="text-center py-6">
                No loans found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

