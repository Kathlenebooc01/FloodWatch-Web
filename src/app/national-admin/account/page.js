import Profile from "@/components/account/Profile"
import AccountInformation from "@/components/account/AccountInformation"

export default function page() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full">
      <div className="lg:col-span-1">
        <Profile/>
      </div>
      <div className="lg:col-span-2">
        <AccountInformation/>
      </div>
    </section>
  )
}
