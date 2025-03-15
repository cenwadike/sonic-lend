"use client"

import { type ReactNode, useEffect, useRef } from "react"
import { motion, useAnimation, useInView } from "framer-motion"
import { Logo } from "@/components/logo"

interface AuthLayoutProps {
  children: ReactNode
}

interface MetricProps {
  label: string
  value: string
  delay: number
}

function Metric({ label, value, delay }: MetricProps) {
  const controls = useAnimation()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView) {
      controls.start("visible")
    }
  }, [controls, isInView])

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.6,
            delay: delay,
            ease: [0.25, 0.1, 0.25, 1.0],
          },
        },
      }}
      className="relative group"
    >
      <motion.div
        className="absolute -inset-1 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />
      <div className="relative bg-background/80 backdrop-blur-sm rounded-lg p-4 flex flex-col items-center">
        <motion.p
          className="text-2xl md:text-3xl font-bold"
          animate={{
            scale: [1, 1.03, 1],
          }}
          transition={{
            duration: 2,
            delay: delay + 0.3,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        >
          {value}
        </motion.p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  )
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const metrics = [
    { label: "TVL", value: "$12.5M" },
    { label: "APY", value: "Up to 8.2%" },
    { label: "Assets", value: "12+" },
    { label: "Users", value: "1,250+" },
    { label: "Chains", value: "5+" },
    { label: "Security", value: "Audited" },
  ]

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Branding */}
      <div className="w-full md:w-1/2 bg-gradient-to-b from-primary/20 to-primary/5 p-8 flex flex-col">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Logo className="h-10 w-auto" />
        </motion.div>

        <motion.div
          className="flex-1 flex flex-col justify-center items-center text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            className="text-4xl md:text-5xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            SonicLend
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-muted-foreground max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            A decentralized lending protocol built on the Cosmos blockchain ecosystem
          </motion.p>

          <motion.div
            className="w-full max-w-2xl mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {metrics.map((metric, index) => (
                <Metric key={metric.label} label={metric.label} value={metric.value} delay={0.7 + index * 0.1} />
              ))}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-auto text-center text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.5 }}
        >
          © {new Date().getFullYear()} SonicLend. All rights reserved.
        </motion.div>
      </div>

      {/* Right side - Auth content */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}

