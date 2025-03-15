"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Ask } from "@/lib/contract"

interface UserAsksProps {
  asks: Ask[]
}

export function UserAsks({ asks }: UserAsksProps) {
  // Calculate if an ask is stale (older than 5 minutes)
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
            <TableHead>Max Rate</TableHead>
            <TableHead>Collateral</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {asks &&
            asks.map((ask, index) => {
              // Safely get slot number
              const slotNumber = ask.slot && ask.slot.toNumber ? ask.slot.toNumber() : 0

              return (
                <TableRow key={index}>
                  <TableCell className="font-medium">{formatBN(ask.amount).toFixed(2)}</TableCell>
                  <TableCell>{ask.maxRate}%</TableCell>
                  <TableCell>{formatBN(ask.collateral).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={isStale(slotNumber) ? "outline" : "default"}>
                      {isStale(slotNumber) ? "Stale" : "Active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          {(!asks || asks.length === 0) && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6">
                No asks found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

