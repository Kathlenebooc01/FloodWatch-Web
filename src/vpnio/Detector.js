"use server";

import { headers } from "next/headers";

export async function checkIpSecurity(clientIp = null) {
  const headersList = await headers();
  let userIp = clientIp || headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '127.0.0.1';

  if (userIp.includes(',')) {
    userIp = userIp.split(',')[0].trim();
  }

  // If running locally, bypass the check since localhost (::1) isn't a real IP
  if (userIp === '::1' || userIp === '127.0.0.1') {
    return { isVpn: false, region: 'Localhost', isValid: true, ip: userIp };
  }

  try {
    const response = await fetch(`https://vpnapi.io/api/${userIp}?key=${process.env.VPN_IO_API}`);
    const data = await response.json();

    const isVpn = data.security?.vpn || data.security?.proxy || data.security?.tor || false;
    const region = data.location?.region || 'Unknown';
    
    return {
      isVpn: isVpn,
      region: region,
      isValid: true,
      raw: data,
      ip: userIp
    };
  } catch (error) {
    console.error("IP Security Check Failed:", error);
    // Decide if you want to block or allow logins if the API itself goes down
    return { isVpn: false, region: 'Unknown', isValid: false, ip: userIp }; 
  }
}