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

  // Skip VPN check entirely if the API key is not configured
  if (!process.env.VPN_IO_API) {
    console.warn("⚠️ VPN_IO_API key is not set — skipping VPN detection.");
    return { isVpn: false, region: 'Unknown', isValid: false, ip: userIp };
  }

  try {
    // Add a 3-second timeout to prevent 504 Gateway Timeout on login
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `https://vpnapi.io/api/${userIp}?key=${process.env.VPN_IO_API}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

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
    // On timeout or any network error — allow login (fail open)
    console.error("IP Security Check Failed (allowing login):", error?.name === 'AbortError' ? 'Request timed out' : error);
    return { isVpn: false, region: 'Unknown', isValid: false, ip: userIp }; 
  }
}