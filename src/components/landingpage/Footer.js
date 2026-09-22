import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#f8f9fa] border-t border-gray-200 py-12 px-6 lg:px-12 mt-20">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        
        {/* Left Side: Brand & Legal */}
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight lg:mb-1">
            FloodWatch Cebu
          </h2>
          <p className="text-[13px] font-medium text-slate-500">
            &copy; 2024 FloodWatch Cebu. Tactical Clarity in Disaster Response.
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Built for the Province of Cebu. Fully compliant with the Data Privacy Act (RA 10173).
          </p>
        </div>

        {/* Right Side: Links */}
        <ul className="flex flex-wrap items-center gap-4 lg:gap-8 text-[13px] font-semibold text-slate-500">
          <li>
            <Link href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
          </li>
          <li>
            <Link href="#" className="hover:text-primary transition-colors">
              Emergency Protocols
            </Link>
          </li>
          <li>
            <Link href="#" className="hover:text-primary transition-colors">
              API Documentation
            </Link>
          </li>
          <li>
            <Link href="#" className="hover:text-primary transition-colors">
              Contact Support
            </Link>
          </li>
        </ul>

      </div>
    </footer>
  )
}
