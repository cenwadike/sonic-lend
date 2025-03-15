type LogLevel = "info" | "warn" | "error"

const log = (level: LogLevel, message: string, data?: any) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`

  switch (level) {
    case "info":
      console.log(logMessage, data)
      break
    case "warn":
      console.warn(logMessage, data)
      break
    case "error":
      console.error(logMessage, data)
      break
  }

  // In a production environment, you would send this log to a logging service
  // For example, using a service like Sentry or LogRocket
  // sendToLoggingService(level, message, data)
}

export const logger = {
  info: (message: string, data?: any) => log("info", message, data),
  warn: (message: string, data?: any) => log("warn", message, data),
  error: (message: string, data?: any) => log("error", message, data),
}

