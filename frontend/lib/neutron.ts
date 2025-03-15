import { logger } from "./logger"

export interface NeutronWallet {
  address: string
  balance: number
  walletType: "neutron" | "keplr" | "leap"
}

export async function connectNeutronWallet(): Promise<NeutronWallet> {
  logger.info("Connecting to Neutron wallet (mock)")
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        address: "neutron1..." + Math.random().toString(36).substring(2, 15),
        balance: Math.floor(Math.random() * 1000),
        walletType: "neutron",
      })
    }, 1000)
  })
}

export async function connectKeplrWallet(): Promise<NeutronWallet> {
  logger.info("Connecting to Keplr wallet (mock)")
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        address: "cosmos1..." + Math.random().toString(36).substring(2, 15),
        balance: Math.floor(Math.random() * 1000),
        walletType: "keplr",
      })
    }, 1000)
  })
}

export async function connectLeapWallet(): Promise<NeutronWallet> {
  logger.info("Connecting to Leap wallet (mock)")
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        address: "osmo1..." + Math.random().toString(36).substring(2, 15),
        balance: Math.floor(Math.random() * 1000),
        walletType: "leap",
      })
    }, 1000)
  })
}

export async function disconnectNeutronWallet(): Promise<void> {
  logger.info("Disconnecting from wallet (mock)")
  return new Promise((resolve) => {
    setTimeout(resolve, 500)
  })
}

export async function executeContract(
  address: string,
  contract: string,
  msg: object,
  funds?: { amount: number; denom: string }[],
): Promise<{ transactionHash: string }> {
  logger.info(`Executing contract ${contract} with message:`, msg)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ transactionHash: "0x" + Math.random().toString(36).substring(2, 15) })
    }, 2000)
  })
}

export async function queryContract(contract: string, msg: object): Promise<any> {
  logger.info(`Querying contract ${contract} with message:`, msg)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ result: "Mocked query result" })
    }, 1000)
  })
}

