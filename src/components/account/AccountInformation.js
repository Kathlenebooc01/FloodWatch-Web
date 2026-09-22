"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"
import GeneralCard from "../cards/GeneralCard"
import CardSubHeader from "../cards/CardSubHeader"
import CardBasedText from "../cards/CardBasedText"
import PrimaryButton from "../button/PrimaryButton"
import { Building2, Phone, Mail, Smartphone, ShieldCheck } from "lucide-react"

export default function AccountInformation() {
  const router = useRouter()
  const [accountData, setAccountData] = useState({
    organization: "Loading...",
    mobile: "Loading...",
    email: "Loading...",
    mobileSecondary: "Loading..."
  })

  useEffect(() => {
    const fetchAccountData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('organization_name, mobile_number, mobile_number_secondary')
          .eq('id', session.user.id)
          .single()
        
        setAccountData({
          organization: data?.organization_name || "Not Provided",
          mobile: data?.mobile_number || "Not Provided",
          email: session.user.email || "Not Provided",
          mobileSecondary: data?.mobile_number_secondary || "Not Provided"
        })
      }
    }
    fetchAccountData()
  }, [])

  return (
    <section>
        <GeneralCard className='flex flex-col gap-8 p-8'>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <ShieldCheck className="size-6" />
              </div>
              <CardSubHeader className="text-2xl font-bold tracking-tight">Account Information</CardSubHeader>
            </div>
            
            <div className='account-information-layout'>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-neutral-100 text-neutral-400">
                      <Building2 className="size-5" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Organization Name</span>
                      <span className={`text-base font-semibold ${accountData.organization === "Not Provided" ? "text-neutral-400 italic text-sm font-medium" : "text-neutral-800"}`}>
                        {accountData.organization}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-neutral-100 text-neutral-400">
                      <Phone className="size-5" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Mobile Number</span>
                      <span className={`text-base font-semibold ${accountData.mobile === "Not Provided" ? "text-neutral-400 italic text-sm font-medium" : "text-neutral-800"}`}>
                        {accountData.mobile}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-neutral-100 text-neutral-400">
                      <Mail className="size-5" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Email Address</span>
                      <span className={`text-base font-semibold ${accountData.email === "Not Provided" ? "text-neutral-400 italic text-sm font-medium" : "text-neutral-800"}`}>
                        {accountData.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-neutral-100 text-neutral-400">
                      <Smartphone className="size-5" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Secondary Mobile</span>
                      <span className={`text-base font-semibold ${accountData.mobileSecondary === "Not Provided" ? "text-neutral-400 italic text-sm font-medium" : "text-neutral-800"}`}>
                        {accountData.mobileSecondary}
                      </span>
                    </div>
                  </div>
            </div>

            <div className="flex  justify-end">
              <PrimaryButton onClick={() => router.push('/account-edit')} className='w-full lg:w-fit'>
                Edit Information
              </PrimaryButton>
            </div>
        </GeneralCard>
    </section>
  )
}
