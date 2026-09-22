"use client"
import { useState } from "react"
import TotalUtilities from "@/components/utilities/summary/TotalUtilities"
import LowUtilties from "@/components/utilities/summary/LowUtilties"
import Link from "next/link"
import PrimaryButton from "@/components/button/PrimaryButton"
import SecondaryButton from "@/components/button/SecondaryButton"
import UtilTable from "@/components/utilities/tables/UtilTable"
import IndependentInventory from "@/components/utilities/tables/IndependentInventory"
import ToogleButtonLayout from "@/components/button/ToogleButtonLayout"
import ToogleButton from "@/components/button/ToogleButton"
import { Plus, Origami } from "lucide-react"

export default function page() {
  const [activeTab, setActiveTab] = useState("Shared Inventory")

  return (
    <section className="grid gap-5">
      <div className="grid w-full grid-cols-2 gap-3">
        <TotalUtilities/>
        <LowUtilties/>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Toggle Switch Button */}
        <ToogleButtonLayout className="w-full sm:w-auto">
          <ToogleButton
            active={activeTab === "Shared Inventory"}
            className={activeTab === "Shared Inventory" ? "button-toogle-active" : ""}
            onClick={() => setActiveTab("Shared Inventory")}
          >
            Shared Inventory
          </ToogleButton>
          <ToogleButton
            active={activeTab === "Command Center Inventory"}
            className={activeTab === "Command Center Inventory" ? "button-toogle-active" : ""}
            onClick={() => setActiveTab("Command Center Inventory")}
          >
            Command Center Inventory
          </ToogleButton>
        </ToogleButtonLayout>

        <div className="flex items-stretch gap-2 w-full sm:w-auto justify-end">
          <SecondaryButton>
            <Link href='/provincial-admin/utilities/inventory/aiextract' className="flex items-center gap-2">
              <Origami className="w-4 h-4"/>
              <span className="hidden lg:block">Lantaw AI</span>
            </Link>
          </SecondaryButton>
          
          <PrimaryButton>
            {activeTab === "Shared Inventory" ? (
              <Link href='/provincial-admin/utilities/inventory/add' className="flex items-center gap-2">
                <Plus className="w-4 h-4"/>
                <span className="hidden lg:block">Add Utilities</span>
              </Link>
            ) : (
              <Link href='/provincial-admin/utilities/inventory/add-item' className="flex items-center gap-2">
                <Plus className="w-4 h-4"/>
                <span className="hidden lg:block">Add Items</span>
              </Link>
            )}
          </PrimaryButton>
        </div>
      </div>

      <div className="w-full min-w-0 overflow-hidden">
        {activeTab === "Shared Inventory" ? (
          <UtilTable/>
        ) : (
          <IndependentInventory/>
        )}
      </div>
    </section>
  )
}
