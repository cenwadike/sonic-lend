"use client"

import { motion } from "framer-motion"

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4 },
  },
}

export const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const pulse = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1.5,
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "loop",
    },
  },
}

export function FadeIn({ children, delay = 0, className = "" }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} transition={{ delay }} className={className}>
      {children}
    </motion.div>
  )
}

export function SlideUp({ children, delay = 0, className = "" }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={slideUp} transition={{ delay }} className={className}>
      {children}
    </motion.div>
  )
}

export function StaggerChildren({ children, className = "" }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className={className}>
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = "" }) {
  return (
    <motion.div variants={slideUp} className={className}>
      {children}
    </motion.div>
  )
}

export function PulseAnimation({ children, className = "" }) {
  return (
    <motion.div initial="initial" animate="animate" variants={pulse} className={className}>
      {children}
    </motion.div>
  )
}

export function AnimatedNumber({ value, duration = 1, className = "" }) {
  return (
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={className}>
      <motion.span initial={{ value: 0 }} animate={{ value }} transition={{ duration }}>
        {Math.round(value)}
      </motion.span>
    </motion.span>
  )
}

export function LoadingSpinner({ size = "h-8 w-8", className = "" }) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <motion.div
        className={`border-t-2 border-b-2 border-primary rounded-full ${size}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />
    </div>
  )
}

