import CardBasedText from "@/components/cards/CardBasedText"
import CardHeader from "@/components/cards/CardHeader"
import CardSubHeader from "@/components/cards/CardSubHeader"
import { ChartLine, ChevronDown, Check } from "lucide-react"
import { useState, useRef, useEffect } from "react"

export default function AreaChartHeader({ selectedYear, setSelectedYear, availableYears = [] }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <section className="grid gap-3">
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <span className="summary-data-icon">
            <ChartLine className="size-5" />
          </span>
          <CardSubHeader>Citizen's Growth </CardSubHeader>
        </div>
        
        <div className="relative inline-block text-left" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex gap-2 text-sm items-center justify-between min-w-[120px] px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold cursor-pointer shadow-sm transition-all duration-200"
          >
            {selectedYear}
            <ChevronDown className={`size-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          <div 
            className={`absolute right-0 mt-2 w-32 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black/5 focus:outline-none z-50 transition-all duration-200 ease-out ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}
          >
            <div className="py-1">
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => {
                    setSelectedYear(year)
                    setIsOpen(false)
                  }}
                  className={`group flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors
                    ${selectedYear === year 
                      ? 'bg-blue-50 text-blue-700 font-semibold' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium'
                    }
                  `}
                >
                  {year}
                  {selectedYear === year && <Check className="size-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="text-gray-500">
        <CardBasedText>This chart shows trend on every citizens registered in every year</CardBasedText>
      </div>
    </section>
  )
}
