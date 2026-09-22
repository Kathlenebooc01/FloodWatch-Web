export default function BoatLoader() {
  return (
    <div className="flex justify-center items-center p-1">
      <svg 
        viewBox="0 0 48 40" 
        className="w-[60px] h-auto animate-boat-pulse text-current drop-shadow-sm"
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {/* Flag Pole */}
        <line x1="24" y1="2" x2="24" y2="24" />
        
        {/* Flag (Right-pointing half triangle) */}
        <polygon points="24,2 38,10 24,18" />
        
        {/* Boat Body (Crescent / Half Circle) */}
        <path d="M2 24 A 22 14 0 0 0 46 24 Z" />
      </svg>
    </div>
  )
}
