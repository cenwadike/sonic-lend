import { DashboardLayout } from "@/components/dashboard-layout"
import { LendForm } from "@/components/lend-form"
import { WalletProvider } from "@/components/wallet-provider"

export default function Lend() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col space-y-4">
          <h1 className="text-3xl font-bold">Lend</h1>
          <p className="text-muted-foreground">Provide liquidity and earn interest</p>
        </div>
        {/* <WalletProvider> */}
          <LendForm />
        {/* </WalletProvider> */}
      </div>
    </DashboardLayout>
  )
}

