import { LoadingSpinner } from "@/components/animations"

export function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <LoadingSpinner size="h-12 w-12" />
    </div>
  )
}

