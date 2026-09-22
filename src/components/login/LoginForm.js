"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/util/supabase";
import {Mail, Eye, EyeOff} from 'lucide-react';
import CardSubHeader from "../cards/CardSubHeader"
import CardBasedText from "../cards/CardBasedText"
import GeneralInput from "../forms/GeneralInput"
import PrimaryButton from "../button/PrimaryButton"
import ToogleButtonLayout from "../button/ToogleButtonLayout"
import ToogleButton from "../button/ToogleButton"
import { checkIpSecurity } from "@/vpnio/Detector"
import Link from "next/link";
export default function LoginForm() {
  const [activeAdmin, setActiveAdmin] = useState('national');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      let exactIp = null;
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        exactIp = ipData.ip;
      } catch (err) {
        console.warn("Could not fetch exact IP from client side:", err);
      }

      const securityCheck = await checkIpSecurity(exactIp);
      
      const ua = navigator.userAgent;
      let os = "Unknown OS";
      if (ua.includes("Win")) os = "Windows";
      else if (ua.includes("Mac")) os = "MacOS";
      else if (ua.includes("Android")) os = "Android";
      else if (ua.includes("like Mac")) os = "iOS";
      else if (ua.includes("Linux")) os = "Linux";

      let browser = "Unknown Browser";
      if (ua.includes("Edg")) browser = "Edge";
      else if (ua.includes("OPR") || ua.includes("Opera")) browser = "Opera";
      else if (ua.includes("Chrome")) browser = "Chrome";
      else if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Safari")) browser = "Safari";
      else if (ua.includes("Trident")) browser = "Internet Explorer";

      const deviceInfo = `${os}, ${browser}`;

      let status = 'success';
      let blockReason = null;

      if (securityCheck.isVpn) {
         status = 'blocked';
         blockReason = 'VPN/Proxy/Tor Detected';
      }

      if (securityCheck.isVpn) {
         const { error: notifError } = await supabase.from('notifications').insert([
           {
             user_id: data.user.id,
             title: 'User Blocked',
             message: `${email} is blocked due to VPN/Proxy usage.`,
             type: 'VPN Detected',
             target_role: 'national_admin',
             is_read: false
           }
         ]);
         
         if (notifError) console.error("Notification insert error:", notifError);
      }

      await supabase.from('login_logs').insert([{
         user_id: data.user.id,
         device_info: deviceInfo,
         ip_address: securityCheck.ip,
         status: status,
         login_location: securityCheck.region,
         is_vpn: securityCheck.isVpn,
         block_reason: blockReason
      }]);

      if (securityCheck.isVpn) {
         await supabase.auth.signOut();
         router.push('/Error/auth');
         return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (activeAdmin === 'national' && profile.role === 'national_admin') {
        router.push('/national-admin/dashboard');
      } else if (activeAdmin === 'provincial' && profile.role === 'provincial_admin') {
        router.push('/provincial-admin/dashboard'); 
      } else {
        await supabase.auth.signOut();
        throw new Error("You do not have access to this admin panel.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex h-full w-full justify-center items-center">
        <div className="grid gap-3 w-full">
            <div className="lg:text-start text-center gap-3 grid">
            <div>
            <CardSubHeader className='text-xl'>Welcome Back</CardSubHeader>
            <CardBasedText>Please Enter Your Credentials</CardBasedText>
            </div>
            <div>
                <ToogleButtonLayout>
                    <ToogleButton 
                      type="button"
                      onClick={() => setActiveAdmin('national')}
                      className={activeAdmin === 'national' ? 'button-toogle-active' : ''}
                    >
                      National Admin
                    </ToogleButton>
                    <ToogleButton 
                      type="button"
                      onClick={() => setActiveAdmin('provincial')}
                      className={activeAdmin === 'provincial' ? 'button-toogle-active' : ''}
                    >
                      Provincial Admin
                    </ToogleButton>
                </ToogleButtonLayout>
            </div>
            </div>
            {error && (
              <div className="bg-red-50 border text-center font-semibold border-red-200 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <form key={activeAdmin} onSubmit={handleLogin} className="flex flex-col gap-5 w-full animate-slide-left">
                <div className="flex flex-col gap-1">
                <CardBasedText className="text-sm font-semibold">Email:</CardBasedText>
                
                <GeneralInput 
                  type='email'
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  
                ><Mail className="size-5 text-gray-500"/></GeneralInput>
                
                </div>
                <div className="flex flex-col gap-1">
                <span className="flex justify-between items-center">
                <CardBasedText className="text-sm font-semibold">Password:</CardBasedText>
                <Link href='/forgot-password/verification' className='text-primary text-xs font-semibold hover:underline duration-300 cursor-pointer'>Forgot Password?</Link>
                </span>
                
                <GeneralInput 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  iconRight={
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="focus:outline-none cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="size-5 text-gray-500 hover:text-gray-700 transition-colors"/>
                      ) : (
                        <Eye className="size-5 text-gray-500 hover:text-gray-700 transition-colors"/>
                      )}
                    </button>
                  }
                />
                </div>
                <PrimaryButton type='submit' disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </PrimaryButton>
            </form>
        </div>
    </section>
  )
}
