"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  Search,
  ExternalLink,
} from "lucide-react"

export function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  // Mock transaction data
  const transactions = [
    {
      id: "tx1",
      type: "deposit",
      asset: "ATOM",
      amount: 10,
      value: 120,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      status: "confirmed",
      hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    },
    {
      id: "tx2",
      type: "borrow",
      asset: "USDC",
      amount: 100,
      value: 100,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      status: "confirmed",
      hash: "0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef",
    },
    {
      id: "tx3",
      type: "repay",
      asset: "USDC",
      amount: 50,
      value: 50,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      status: "confirmed",
      hash: "0x3456789012abcdef3456789012abcdef3456789012abcdef3456789012abcdef",
    },
    {
      id: "tx4",
      type: "withdraw",
      asset: "ATOM",
      amount: 5,
      value: 60,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      status: "confirmed",
      hash: "0x4567890123abcdef4567890123abcdef4567890123abcdef4567890123abcdef",
    },
    {
      id: "tx5",
      type: "liquidate",
      asset: "JUNO",
      amount: 20,
      value: 60,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
      status: "confirmed",
      hash: "0x5678901234abcdef5678901234abcdef5678901234abcdef5678901234abcdef",
    },
  ]

  // Filter transactions based on search query and selected types
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      searchQuery === "" ||
      tx.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.hash.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(tx.type)

    return matchesSearch && matchesType
  })

  // Format date for display
  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
    } else {
      return "Just now"
    }
  }

  // Get icon for transaction type
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownToLine className="h-4 w-4" />
      case "withdraw":
        return <ArrowUpFromLine className="h-4 w-4" />
      case "borrow":
        return <ArrowUpFromLine className="h-4 w-4" />
      case "repay":
        return <RotateCcw className="h-4 w-4" />
      case "liquidate":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return null
    }
  }

  // Get badge color for transaction type
  const getTransactionBadgeVariant = (type: string): "default" | "secondary" | "outline" => {
    switch (type) {
      case "deposit":
        return "default"
      case "withdraw":
        return "secondary"
      case "borrow":
        return "outline"
      case "repay":
        return "default"
      case "liquidate":
        return "outline"
      default:
        return "default"
    }
  }

  // Format transaction type for display
  const formatTransactionType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  // Format transaction hash for display
  const formatTransactionHash = (hash: string) => {
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">View your past transactions on SonicLend</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Transactions</CardTitle>
          <CardDescription>View and filter your transaction history</CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by asset or transaction hash..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  Filter by Type
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Transaction Types</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={selectedTypes.includes("deposit")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTypes([...selectedTypes, "deposit"])
                    } else {
                      setSelectedTypes(selectedTypes.filter((t) => t !== "deposit"))
                    }
                  }}
                >
                  Deposit
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedTypes.includes("withdraw")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTypes([...selectedTypes, "withdraw"])
                    } else {
                      setSelectedTypes(selectedTypes.filter((t) => t !== "withdraw"))
                    }
                  }}
                >
                  Withdraw
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedTypes.includes("borrow")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTypes([...selectedTypes, "borrow"])
                    } else {
                      setSelectedTypes(selectedTypes.filter((t) => t !== "borrow"))
                    }
                  }}
                >
                  Borrow
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedTypes.includes("repay")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTypes([...selectedTypes, "repay"])
                    } else {
                      setSelectedTypes(selectedTypes.filter((t) => t !== "repay"))
                    }
                  }}
                >
                  Repay
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedTypes.includes("liquidate")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTypes([...selectedTypes, "liquidate"])
                    } else {
                      setSelectedTypes(selectedTypes.filter((t) => t !== "liquidate"))
                    }
                  }}
                >
                  Liquidate
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <Button variant="ghost" className="w-full justify-start" onClick={() => setSelectedTypes([])}>
                  Clear Filters
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Badge variant={getTransactionBadgeVariant(tx.type)} className="flex items-center gap-1 w-fit">
                          {getTransactionIcon(tx.type)}
                          {formatTransactionType(tx.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.asset}</TableCell>
                      <TableCell>
                        <div>
                          <div>
                            {tx.amount.toLocaleString()} {tx.asset}
                          </div>
                          <div className="text-xs text-muted-foreground">${tx.value.toLocaleString()}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(tx.timestamp)}</TableCell>
                      <TableCell>
                        <a
                          href={`https://www.mintscan.io/cosmos/txs/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-500 hover:underline"
                        >
                          {formatTransactionHash(tx.hash)}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      <p className="text-muted-foreground">No transactions found matching your search</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Import Table components for the history page
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

