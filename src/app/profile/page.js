import ProfileModal from "../@modal/profile/page"

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Reusing the modal component but without the "modal-layout" wrapper if possible */}
      {/* For now, just rendering a centered edit profile card */}
      <div className="w-full max-w-md">
        <ProfileModal />
      </div>
    </main>
  )
}
