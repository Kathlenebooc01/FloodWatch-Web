import { Package, Truck, CheckCircle2, RotateCcw } from "lucide-react"

export default function StatusBar({ currentStatus = 'Pending_Dispatch' }) {
  const stages = [
    { id: 'Pending_Dispatch', label: 'Pending Dispatch', icon: Package },
    { id: 'In_Transit', label: 'In Transit', icon: Truck },
    { id: 'Received', label: 'Received', icon: CheckCircle2 },
    { id: 'Returned', label: 'Returned', icon: RotateCcw },
  ]

  // Find the index of the current status to determine progress
  // If not found, default to 0 to show the first step
  let currentIndex = stages.findIndex(s => s.id === currentStatus)
  if (currentIndex === -1) currentIndex = 0

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative px-4">
        {/* Background track line */}
        <div className="absolute left-8 right-8 top-5 -translate-y-1/2 h-1 bg-gray-200 rounded-full z-0"></div>
        
        {/* Active progress line */}
        <div 
          className="absolute left-8 top-5 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-500 ease-in-out"
          style={{ width: `calc(${(currentIndex / (stages.length - 1)) * 100}% - ${currentIndex === 0 ? '0px' : '4rem'})`, minWidth: currentIndex > 0 ? '1rem' : '0' }}
        ></div>

        {/* Stage Nodes */}
        {stages.map((stage, index) => {
          const isActive = currentIndex >= index
          const Icon = stage.icon
          
          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center gap-3 bg-white px-2">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-[3px] transition-all duration-300
                ${isActive 
                  ? 'bg-primary border-primary text-white shadow-md shadow-primary/20 scale-110' 
                  : 'bg-white border-gray-200 text-gray-300'
                }
              `}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-xs md:text-sm font-bold tracking-tight whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
