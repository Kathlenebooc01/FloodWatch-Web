"use client"
import FloatingModal from "@/components/Modal/FloatingModal"
import AccountEditForm from "@/components/account/AccountEditForm"

export default function AccountEditModalIntercept() {
  return (
    <FloatingModal>
      <AccountEditForm />
    </FloatingModal>
  )
}
