"use client"
import { AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"

interface HealthFactorIndicatorProps {
  value: number
}

export function HealthFactorIndicator({ value }: HealthFactorIndicatorProps) {
  // Determine color based on health factor
  const getHealthColor = () => {
    if (value >= 1.5) return "health-factor-high"
    if (value >= 1.1) return "health-factor-medium"
    return "health-factor-low"
  }

  // Calculate progress percentage (capped at 100%)
  const progressValue = Math.min((value / 2) * 100, 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <motion.span
          className={`text-2xl font-bold ${getHealthColor()}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {value.toFixed(2)}
        </motion.span>
        {value < 1.1 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 10,
            }}
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [-5, 5, -5, 5, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "loop",
              }}
            >
              <AlertTriangle className="ml-2 h-5 w-5 text-red-500" />
            </motion.div>
          </motion.div>
        )}
      </div>
      <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.5 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressValue}%` }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className={`h-2 rounded-full ${getHealthColor()}`}
        />
      </motion.div>
      <motion.p
        className="text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        {value < 1.1 ? "At risk of liquidation" : value < 1.5 ? "Caution recommended" : "Safe position"}
      </motion.p>
    </div>
  )
}

