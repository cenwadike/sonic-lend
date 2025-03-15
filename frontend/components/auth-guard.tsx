"use client"

import { type ReactNode, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loading } from "@/components/loading"

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check if user is authenticated
    const walletAddress = localStorage.getItem("walletAddress")

    // If on login page and authenticated, redirect to dashboard
    if (pathname === "/login" && walletAddress) {
      router.push("/")
      return
    }

    // If not on login page and not authenticated, redirect to login
    if (pathname !== "/login" && !walletAddress) {
      router.push("/login")
      return
    }

    setIsAuthenticated(!!walletAddress)
  }, [pathname, router])

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return <Loading />
  }

  // If on login page or authenticated, render children
  if (pathname === "/login" || isAuthenticated) {
    return <>{children}</>
  }

  // This should not happen due to the redirect, but just in case
  return <Loading />
}

