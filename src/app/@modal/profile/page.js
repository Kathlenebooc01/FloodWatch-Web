"use client"
import FloatingModal from "@/components/Modal/FloatingModal"
import ProfileEditForm from "@/components/account/ProfileEditForm"

export default function ProfileModal() {
  return (
    <FloatingModal>
      <ProfileEditForm />
    </FloatingModal>
  )
}
