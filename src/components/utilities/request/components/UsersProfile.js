import Image from "next/image"
import { User } from "lucide-react"

export default function UsersProfile({ src, alt = "User profile", className = "w-32 h-32" }) {
  return (
    <div className={`relative flex items-center justify-center bg-gray-100 border border-gray-200 profile-img overflow-hidden ${className}`}>
      {src ? (
        <Image 
          src={src} 
          alt={alt} 
          fill
          className="object-cover"
        />
      ) : (
        <User className="size-5 text-gray-500" strokeWidth={2} />
      )}
    </div>
  )
}
