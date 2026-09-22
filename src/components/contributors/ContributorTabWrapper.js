"use client"

import { useState } from "react"
import ToogleButtonLayout from "@/components/button/ToogleButtonLayout"
import ToogleButton from "@/components/button/ToogleButton"
import ListofUsersTable from "@/components/contributors/ListofUsersTable"
import ContributorTable from "@/components/table/national-admin/ContributorTable"

export default function ContributorTabWrapper() {
  const [activeTab, setActiveTab] = useState("users") // "users" | "invitations"

  return (
    <div className="grid gap-5">
      {/* Primary Toggle Switch */}
      <div className="flex justify-between items-center">
        <ToogleButtonLayout className="w-full sm:w-auto">
          <ToogleButton
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
          >
            Registered Users List
          </ToogleButton>
          <ToogleButton
            active={activeTab === "invitations"}
            onClick={() => setActiveTab("invitations")}
          >
            Invitations & Access
          </ToogleButton>
        </ToogleButtonLayout>
      </div>

      {/* Table Content */}
      {activeTab === "users" ? (
        <ListofUsersTable />
      ) : (
        <ContributorTable />
      )}
    </div>
  )
}
