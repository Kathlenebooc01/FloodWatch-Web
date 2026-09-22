
export default function WaveLoader() {
  return (
    <div className="">
      <svg 
        viewBox="0 0 48 48" 
        className="w-[80px] h-auto drop-shadow-sm"
        fill="none" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {/* Background Outline */}
        <path 
          d="M 4 24 Q 9 12 14 24 T 24 24 T 34 24 T 44 24" 
          stroke="#e5e7eb" 
        />
        
        {/* Running Color inside the Outline */}
        <path 
          d="M 4 24 Q 9 12 14 24 T 24 24 T 34 24 T 44 24" 
          stroke="var(--color-primary)" 
          pathLength="100"
          strokeDasharray="40 60"
          className="wave-loader-anim"
        />
      </svg>
    </div>
  )
}
