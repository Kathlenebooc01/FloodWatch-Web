"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/util/supabase";
import { normalizeRole } from "@/lib/domain-values.mjs";
import { checkIpSecurity } from "@/vpnio/Detector";
import BoatLoader from "@/components/loader/BoatLoader";
import WaveLoader from "@/components/loader/WaveLoader";
export default function AuthGuard({ children, allowedRole }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let intervalId;
    let active = true;
    let signedOut = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        signedOut = true;
        clearInterval(intervalId);
        setAuthorized(false);
        router.replace('/login');
      }
    });

    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          router.push('/login'); // Assuming the login page is at /login
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile) {
          router.push('/Error/auth');
          return;
        }

        if (!active || signedOut) return;
        if (normalizeRole(profile.role) && normalizeRole(profile.role) === normalizeRole(allowedRole)) {
          setAuthorized(true);
          // Render the authorized dashboard before the background IP check finishes.
          setLoading(false);

          // Fetch initial IP
          let lastIp = null;
          try {
            const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
            const ipData = await ipRes.json();
            lastIp = ipData.ip;
          } catch (err) {}
          if (!active || signedOut) return;

          // Realtime VPN Polling every 10 seconds
          intervalId = setInterval(async () => {
            try {
              let currentIp = null;
              try {
                const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
                const ipData = await ipRes.json();
                currentIp = ipData.ip;
              } catch (err) {}
              
              // Only check VPN API if the IP actually changed to prevent rate limit exhaustion
              if (currentIp && lastIp && currentIp !== lastIp) {
                const sec = await checkIpSecurity(currentIp);
                if (sec.isVpn) {
                   const { error: notifError } = await supabase.from('notifications').insert([
                     {
                       user_id: session.user.id,
                       title: 'User Blocked',
                       message: `${session.user.email} is blocked due to VPN/Proxy usage.`,
                       type: 'VPN Detected',
                       target_role: 'national_admin',
                       is_read: false
                     }
                   ]);
                   if (notifError) console.error("Notification insert error:", notifError);
                   
                   await supabase.auth.signOut();
                   router.push('/Error/auth');
                } else {
                   lastIp = currentIp;
                }
              } else if (currentIp && !lastIp) {
                lastIp = currentIp;
              }
            } catch (err) {
              console.error("VPN Polling error:", err);
            }
          }, 10000); // 10 seconds

        } else {
          router.push('/Error/auth');
        }
      } catch (err) {
        console.error("AuthGuard error:", err);
        router.push('/login');
      } finally {
        if (active) setLoading(false);
      }
    };

    checkAuth();

    return () => {
      active = false;
      subscription.unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, [router, allowedRole]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <WaveLoader />
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
