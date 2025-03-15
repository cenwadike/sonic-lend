"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
  AlertTriangle,
  History,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { Logo } from "@/components/logo"
import { useMobile } from "@/hooks/use-mobile"
import { motion, AnimatePresence } from "framer-motion"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const isMobile = useMobile()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  // Update the navigation array to use the new routes
  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, color: "text-blue-500" },
    { name: "Lend", href: "/lend", icon: ArrowDownToLine, color: "text-green-500" },
    { name: "Borrow", href: "/borrow", icon: ArrowUpFromLine, color: "text-purple-500" },
    { name: "Repay", href: "/repay", icon: RotateCcw, color: "text-yellow-500" },
    { name: "Liquidate", href: "/liquidate", icon: AlertTriangle, color: "text-orange-500" },
    { name: "History", href: "/history", icon: History, color: "text-indigo-500" },
  ]

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      x: "-100%",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
  }

  const navItemVariants = {
    open: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      opacity: 0,
      y: 20,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
  }

  const staggerNavItems = {
    open: {
      transition: {
        staggerChildren: 0.07,
        delayChildren: 0.2,
      },
    },
    closed: {
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar toggle */}
      {isMobile && (
        <motion.div className="fixed top-4 left-4 z-50" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X /> : <Menu />}
          </Button>
        </motion.div>
      )}

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
          >
            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-primary/10 to-primary/5 backdrop-blur-sm border-r"
              initial="closed"
              animate="open"
              exit="closed"
              variants={sidebarVariants}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-center h-16 px-4 border-b">
                  <Logo className="h-8 w-auto" />
                </div>
                <motion.div
                  className="flex-1 overflow-y-auto py-4"
                  variants={staggerNavItems}
                  initial="closed"
                  animate="open"
                >
                  <nav className="px-2 space-y-1">
                    {navigation.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <motion.div key={item.name} variants={navItemVariants}>
                          <Link
                            href={item.href}
                            className={`flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            <item.icon
                              className={`mr-3 h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                            />
                            {item.name}
                          </Link>
                        </motion.div>
                      )
                    })}
                  </nav>
                </motion.div>
                <div className="p-4 border-t">
                  <Button
                    variant="outline"
                    size="icon"
                    className="ml-auto"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div
        className={`${isMobile ? "hidden" : "w-64 border-r"} transition-all duration-300 ease-in-out bg-gradient-to-b from-primary/10 to-primary/5 backdrop-blur-sm`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 px-4 border-b">
            <Logo className="h-8 w-auto" />
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <motion.div key={item.name} whileHover={{ x: 5 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200 ${
                        isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-primary/10"
                      }`}
                    >
                      <motion.div
                        animate={
                          isActive
                            ? {
                                rotate: [0, -10, 10, -10, 10, 0],
                                scale: [1, 1.2, 1],
                              }
                            : {}
                        }
                        transition={{ duration: 0.5 }}
                        className={`mr-3 ${item.color}`}
                      >
                        <item.icon className={`h-5 w-5`} />
                      </motion.div>
                      {item.name}
                    </Link>
                  </motion.div>
                )
              })}
            </nav>
          </div>
          <div className="p-4 border-t">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="outline"
                size="icon"
                className="ml-auto"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-background border-b h-16 flex items-center justify-end px-4">
          <ConnectWalletButton />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 gradient-bg">{children}</main>
      </div>
    </div>
  )
}

