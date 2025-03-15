"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ArrowUpFromLine, ArrowDownToLine, RotateCcw } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { AssetIcon } from "@/components/asset-icon"

interface Asset {
  asset: string
  icon: string
  balance: number
  value: number
  apy: number
  collateral?: boolean
}

interface AssetTableProps {
  assets: Asset[]
  type: "supplied" | "borrowed" | "market"
  columns: string[]
}

export function AssetTable({ assets, type, columns }: AssetTableProps) {
  const tableRowVariants = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
      },
    }),
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.includes("asset") && <TableHead>Asset</TableHead>}
            {columns.includes("balance") && <TableHead>Balance</TableHead>}
            {columns.includes("value") && <TableHead>Value</TableHead>}
            {columns.includes("apy") && <TableHead>APY</TableHead>}
            {columns.includes("collateral") && <TableHead>Collateral</TableHead>}
            {columns.includes("actions") && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset, i) => (
            <motion.tr
              key={asset.asset}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={tableRowVariants}
              className="hover:bg-muted/50 transition-colors"
            >
              {columns.includes("asset") && (
                <TableCell>
                  <div className="flex items-center">
                    <AssetIcon asset={asset.asset} className="h-6 w-6 mr-2" />
                    <span>{asset.asset}</span>
                  </div>
                </TableCell>
              )}
              {columns.includes("balance") && <TableCell>{asset.balance.toLocaleString()}</TableCell>}
              {columns.includes("value") && <TableCell>${asset.value.toLocaleString()}</TableCell>}
              {columns.includes("apy") && (
                <TableCell>
                  <motion.span
                    className={type === "borrowed" ? "text-amber-500" : "text-green-500"}
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatType: "loop",
                    }}
                  >
                    {asset.apy.toFixed(2)}%
                  </motion.span>
                </TableCell>
              )}
              {columns.includes("collateral") && (
                <TableCell>
                  <Switch checked={asset.collateral ?? true} aria-label="Toggle collateral" />
                </TableCell>
              )}
              {columns.includes("actions") && (
                <TableCell className="text-right">
                  {type === "supplied" && <div className="flex justify-end gap-2">{/* Withdraw button removed */}</div>}
                  {type === "borrowed" && (
                    <div className="flex justify-end gap-2">
                      <Link href={`/repay?asset=${asset.asset}`} passHref>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button size="sm" variant="outline">
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Repay
                          </Button>
                        </motion.div>
                      </Link>
                    </div>
                  )}
                  {type === "market" && (
                    <div className="flex justify-end gap-2">
                      <Link href={`/lend?asset=${asset.asset}`} passHref>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button size="sm" variant="outline">
                            <ArrowDownToLine className="h-4 w-4 mr-1" />
                            Supply
                          </Button>
                        </motion.div>
                      </Link>
                      <Link href={`/borrow?asset=${asset.asset}`} passHref>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button size="sm" variant="outline">
                            <ArrowUpFromLine className="h-4 w-4 mr-1" />
                            Borrow
                          </Button>
                        </motion.div>
                      </Link>
                    </div>
                  )}
                </TableCell>
              )}
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

