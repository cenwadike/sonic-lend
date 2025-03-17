"use client"

import { motion } from "framer-motion"

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.8 }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
          <motion.path
            d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 25.2c-6.188 0-11.2-5.012-11.2-11.2S9.812 4.8 16 4.8 27.2 9.812 27.2 16 22.188 27.2 16 27.2z"
            fill="url(#paint0_linear)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "loop", repeatDelay: 5 }}
          />
          <motion.path
            d="M16 7.6c-4.632 0-8.4 3.768-8.4 8.4s3.768 8.4 8.4 8.4 8.4-3.768 8.4-8.4-3.768-8.4-8.4-8.4zm0 14c-3.08 0-5.6-2.52-5.6-5.6s2.52-5.6 5.6-5.6 5.6 2.52 5.6 5.6-2.52 5.6-5.6 5.6z"
            fill="url(#paint1_linear)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 2,
              delay: 0.5,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              repeatDelay: 5,
            }}
          />
          <motion.circle
            cx="16"
            cy="16"
            r="3"
            fill="url(#paint2_linear)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
          />
          <defs>
            <linearGradient id="paint0_linear" x1="2" y1="16" x2="30" y2="16" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7C3AED" />
              <stop offset="1" stopColor="#C084FC" />
            </linearGradient>
            <linearGradient id="paint1_linear" x1="7.6" y1="16" x2="24.4" y2="16" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7C3AED" />
              <stop offset="1" stopColor="#C084FC" />
            </linearGradient>
            <linearGradient id="paint2_linear" x1="13" y1="16" x2="19" y2="16" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7C3AED" />
              <stop offset="1" stopColor="#C084FC" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
      <span className="font-bold text-xl">Lend</span>
    </div>
  )
}

