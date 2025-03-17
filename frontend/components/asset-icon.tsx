import { Coins, Atom, CircleDollarSign, Droplets, Rocket } from "lucide-react"

interface AssetIconProps {
  asset: string
  className?: string
}

export function AssetIcon({ asset, className = "h-6 w-6" }: AssetIconProps) {
  // Map assets to appropriate icons or emojis
  switch (asset.toUpperCase()) {
    case "SOL":
      return <Atom className={`text-purple-500 ${className}`} />
    case "BONK":
      return <Droplets className={`text-pink-500 ${className}`} />
    case "RAY":
      return <Rocket className={`text-blue-500 ${className}`} />
    case "USDC":
      return <CircleDollarSign className={`text-green-500 ${className}`} />
    case "USDT":
      return <CircleDollarSign className={`text-green-500 ${className}`} /> 
    default:
      return <Coins className={`text-gray-500 ${className}`} />
  }
}

