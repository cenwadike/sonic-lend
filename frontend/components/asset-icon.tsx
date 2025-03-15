import { Coins, Atom, CircleDollarSign, Droplets, Rocket } from "lucide-react"

interface AssetIconProps {
  asset: string
  className?: string
}

export function AssetIcon({ asset, className = "h-6 w-6" }: AssetIconProps) {
  // Map assets to appropriate icons or emojis
  switch (asset.toUpperCase()) {
    case "ATOM":
      return <Atom className={`text-purple-500 ${className}`} />
    case "OSMO":
      return <Droplets className={`text-pink-500 ${className}`} />
    case "JUNO":
      return <Rocket className={`text-blue-500 ${className}`} />
    case "USDC":
      return <CircleDollarSign className={`text-green-500 ${className}`} />
    case "NTRN":
      return <span className={`text-2xl ${className}`}>🔬</span> // Neutron emoji
    case "ASTRO":
      return <span className={`text-2xl ${className}`}>🌠</span> // Astroport emoji
    case "AXL":
      return <span className={`text-2xl ${className}`}>🪓</span> // Axelar emoji
    case "KUJI":
      return <span className={`text-2xl ${className}`}>🐳</span> // Kujira emoji
    default:
      return <Coins className={`text-gray-500 ${className}`} />
  }
}

