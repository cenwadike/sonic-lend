"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Bid } from "@/lib/contract"

interface UserBidsProps {
  bids: Bid[]
}

export function UserBids({ bids }: UserBidsProps) {
  // Calculate if a bid is stale (older than 5 minutes)
  const isStale = (slot: number) => {
    const currentSlot = window.localStorage.getItem("currentSlot")
      ? Number(window.localStorage.getItem("currentSlot"))
      : 0
    return currentSlot - slot > 300 // 300 slots ≈ 5 minutes
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
            <TableHead>Amount</TableHead>
            <TableHead>Min Rate</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bids &&
            bids.map((bid, index) => {
              // Safely get slot number
              const slotNumber = bid.slot && bid.slot.toNumber ? bid.slot.toNumber() : 0

              return (
                <TableRow key={index}>
                  <TableCell className="font-medium">{formatBN(bid.amount).toFixed(2)}</TableCell>
                  <TableCell>{bid.minRate}%</TableCell>
                  <TableCell>{formatBN(bid.durationSlots).toFixed(0)} slots</TableCell>
                  <TableCell>
                    <Badge variant={isStale(slotNumber) ? "outline" : "default"}>
                      {isStale(slotNumber) ? "Stale" : "Active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          {(!bids || bids.length === 0) && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6">
                No bids found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

