import { DashboardLayout } from "@/components/dashboard-layout"
import { BorrowForm } from "@/components/borrow-form"

export default function Borrow() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col space-y-4">
          <h1 className="text-3xl font-bold">Borrow</h1>
          <p className="text-muted-foreground">Borrow assets using your collateral</p>
        </div>
        <BorrowForm />
      </div>
    </DashboardLayout>
  )
}

