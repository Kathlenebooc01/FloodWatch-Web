import AuthGuard from "@/supabase/auth/AuthGuard"
import AdminNav from "@/components/navbar/AdminNav"
import ProvincialHeader from "@/components/navbar/ProvincialHeader"
import DistressAlarmBanner from "@/components/notification/provincial-admin/DistressAlarmBanner"

export const metadata = {
  title: "Provincial Admin | FloodWatch",
  description: "Provincial Administration Dashboard for FloodWatch",
}

export default function ProvincialAdminLayout({ children }) {
  return (
    <AuthGuard allowedRole="provincial_admin">
      <DistressAlarmBanner />
      <main className='flex flex-col lg:flex-row w-full h-screen overflow-hidden relative'>
        <div className="lg:w-64 flex-shrink-0">
          <AdminNav/>
        </div>
        <section className="flex-1 h-full w-full flex flex-col p-2 overflow-y-auto relative pb-24 lg:pb-2">
          <div className="sticky top-0 z-50 w-full mb-5">
            <ProvincialHeader/>
          </div>
          {children}
        </section>
      </main>
    </AuthGuard>
  )
}
