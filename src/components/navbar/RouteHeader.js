"use client"

import { usePathname } from "next/navigation"
import CardSubHeader from "../cards/CardSubHeader"

export default function RouteHeader() {
  const pathname = usePathname()

  const getRouteName = () => {
    // Extract the path segments and ignore empty strings
    const segments = pathname?.split("/").filter(Boolean) || [];
    // Use the second segment (e.g., 'dashboard' from '/national-admin/dashboard')
    const currentRoute = segments.length > 1 ? segments[1] : (segments[0] || "dashboard");
    
    switch (currentRoute) {
      case "dashboard":
        return "Dashboard";
      case "Logs":
        return "Logs";
      case "analytics":
        return "Analytics";
      case "contributor":
        return "Contributors";
      case "seeding":
        return "Area Seeding";
      case "account":
        return "Account";
      case "id_verification":
        return "Verification";
      default:
        // Fallback: capitalize the current route
        return currentRoute.charAt(0).toUpperCase() + currentRoute.slice(1);
    }
  }

  return (
     <div className="navheader-cards ">
        <CardSubHeader>{getRouteName()}</CardSubHeader>
    </div>
  )
}
