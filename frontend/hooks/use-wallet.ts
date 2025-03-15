"use client"

import { useState, useEffect } from "react"
import { connectNeutronWallet, disconnectNeutronWallet } from "@/lib/neutron"

export function useWallet() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    const storedAddress = localStorage.getItem("walletAddress")
    if (storedAddress) {
      setWalletAddress(storedAddress)
    }
  }, [])

  const connect = async () => {
    try {
      setIsConnecting(true)
      const { address } = await connectNeutronWallet()
      setWalletAddress(address)
      localStorage.setItem("walletAddress", address)
      return address
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = async () => {
    await disconnectNeutronWallet()
    setWalletAddress(null)
    localStorage.removeItem("walletAddress")
  }

  return {
    walletAddress,
    isConnecting,
    connect,
    disconnect,
  }
}

