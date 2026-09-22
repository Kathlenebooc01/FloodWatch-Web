"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/supabase/util/supabase"
import GeneralCard from "@/components/cards/GeneralCard"
import UsersProfile from "./components/UsersProfile"
import CardSubHeader from "@/components/cards/CardSubHeader"
import RoleBanner from "./components/RoleBanner"
import RequestorsDetails from "./components/RequestorsDetails"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"

export default function ViewProfilePane({ id }) {
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      if (!id) return

      setIsLoading(true)

      const { data: request } = await supabase
        .from("resource_requests")
        .select("requested_by")
        .eq("request_id", id)
        .single()

      if (request?.requested_by) {
        const { data } = await supabase
          .from("profiles")
          .select("*, municipality_or_city:municipality_id(name)")
          .eq("id", request.requested_by)
          .single()

        setProfile(data)
      }

      setIsLoading(false)
    }

    fetchProfile()
  }, [id])

  if (isLoading) {
    return (
      <GeneralCard>
        <div className="grid gap-5">
          <div>
            <CardSubHeader className='text-gray-600'>Requestor's Profile</CardSubHeader>
          </div>
          <div className="flex flex-col gap-3 items-center justify-center">
            <div className="w-32 h-32 rounded-full"><SingleLineSkeleton /></div>
            <div className="w-24"><SingleLineSkeleton /></div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <SingleLineSkeleton />
            <SingleLineSkeleton />
            <SingleLineSkeleton />
            <SingleLineSkeleton />
            <SingleLineSkeleton />
            <SingleLineSkeleton />
          </div>
        </div>
      </GeneralCard>
    )
  }

  return (
    <GeneralCard>
        <div className="grid gap-5">
            <div>
                <CardSubHeader className='text-gray-600'>Requestor's Profile</CardSubHeader>
            </div>
            <div className="flex flex-col gap-3 items-center justify-center">
                <UsersProfile src={profile?.profile_picture} />
                <RoleBanner role={profile?.role} />
            </div>
            <div>
                <RequestorsDetails profile={profile} />
            </div>
        </div>
    </GeneralCard>
  )
}
