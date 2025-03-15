"use client"

import { useState } from "react"
import type { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate"
import { connectNeutronWallet } from "@/lib/neutron"

export function useNeutronClient() {
  const [client, setClient] = useState<SigningCosmWasmClient | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const connect = async () => {
    if (client && address) return { client, address }

    setIsConnecting(true)
    setError(null)

    try {
      const { client: newClient, address: newAddress } = await connectNeutronWallet()
      setClient(newClient)
      setAddress(newAddress)
      return { client: newClient, address: newAddress }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An unknown error occurred"))
      throw err
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setClient(null)
    setAddress(null)
  }

  return { client, address, isConnecting, error, connect, disconnect }
}

