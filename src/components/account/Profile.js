"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/util/supabase";
import { Camera, User, Pencil, Loader2 } from "lucide-react";
import GeneralCard from "../cards/GeneralCard";
import CardSubHeader from "../cards/CardSubHeader";
import PrimaryButton from "../button/PrimaryButton";
import SignOutBtn from "../button/SignOutBtn";
export default function Profile() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [profileImage, setProfileImage] = useState(null);
  const [profile, setProfile] = useState({ fullName: "Admin", role: "National Admin" });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role, profile_picture')
          .eq('id', session.user.id)
          .single()
        
        if (data) {
          setProfile({
            fullName: data.full_name || "Admin",
            role: data.role ? data.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "National Admin"
          })

          if (data.profile_picture) {
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(data.profile_picture)
            setProfileImage(publicUrl)
          }
        }
      }
    }
    fetchProfile()
  }, [])

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      // Upload/Replace in Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      // Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture: filePath })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Refresh public URL with timestamp to bust cache
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfileImage(`${publicUrl}?t=${Date.now()}`);
    } catch (error) {
      console.error('Error handling file upload:', error.message);
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <section>
        <GeneralCard className="flex flex-col items-center p-6 gap-6">
            <div className="w-full text-left">
               <CardSubHeader>Profile Picture</CardSubHeader>
            </div>
            
            {/* Profile Picture Section */}
            <div className="relative group mt-2">
              <div className="w-32 h-32 rounded-full ring-4 ring-primary/10 shadow-lg overflow-hidden bg-gray-50 flex items-center justify-center relative">
                {isUploading && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 backdrop-blur-[2px]">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-gray-300" />
                )}
              </div>
              
              {/* Camera Button Overlay */}
              <button 
                onClick={handleCameraClick}
                disabled={isUploading}
                className="absolute bottom-1 right-1 bg-primary text-white p-2.5 rounded-full shadow-md hover:bg-primary/90 transition-transform hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Upload Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              
              {/* Hidden File Input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Account Info */}
            <div className="text-center flex flex-col gap-2 w-full mt-2">
              <h2 className="text-xl font-bold text-gray-800">{profile.fullName}</h2>
              <div className="inline-flex items-center justify-center">
                <span className="text-xs font-semibold text-primary bg-primary/10 py-1.5 px-4 rounded-full border border-primary/20">
                  {profile.role}
                </span>
              </div>
            </div>

            {/* Additional Actions */}
            <div className="w-full flex flex-col gap-2 mt-4">
              <PrimaryButton 
                type="button"
                onClick={() => router.push('/profile')}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-white hover:bg-primary/70 rounded-xl transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
                Edit Profile
              </PrimaryButton>
              <div className="w-full mt-1">
                <SignOutBtn />
              </div>
            </div>
        </GeneralCard>
    </section>
  )
}
