"use client"

import { useNeutronClient } from "./use-neutron-client"
import { executeContract, queryContract } from "@/lib/neutron"
import { useState } from "react"

export function useContract() {
  const { client, address, connect } = useNeutronClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = async (msg: object) => {
    setIsLoading(true)
    setError(null)

    try {
      if (!client || !address) {
        await connect()
      }

      if (!client || !address) {
        throw new Error("Failed to connect to wallet")
      }

      const result = await executeContract(client, address, msg)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An unknown error occurred"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const query = async (msg: object) => {
    setIsLoading(true)
    setError(null)

    try {
      if (!client) {
        await connect()
      }

      if (!client) {
        throw new Error("Failed to connect to wallet")
      }

      const result = await queryContract(client, msg)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An unknown error occurred"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { execute, query, isLoading, error }
}

