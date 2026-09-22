
import { Bot, Package, MessageSquare, CloudRain } from "lucide-react";

export default function LGUFeature() {
  return (
    <section className="bg-white py-16 px-6 lg:px-12 mt-12 mx-2 lg:mx-10 relative">
        <div className="max-w-7xl mx-auto z-10 relative">
            {/* Header */}
            <div className="mb-10">
                <span className="text-primary font-bold text-xs tracking-widest uppercase">For Responders</span>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-2">LGU Command Center</h2>
            </div>
            
            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                
                {/* Left Column: AI Incident Dashboard */}
                <div className="bg-[#fcfdfd] rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col p-8 lg:p-10">
                    {/* Decorative Background Pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 flex flex-wrap gap-2 opacity-50 transform translate-x-8 -translate-y-8">
                        <div className="w-12 h-12 bg-gray-100/80 rounded"></div>
                        <div className="w-12 h-12 bg-gray-100/80 rounded"></div>
                        <div className="w-12 h-12 bg-gray-100/80 rounded mt-2"></div>
                        <div className="w-12 h-12 bg-gray-100/80 rounded mt-2"></div>
                    </div>

                    <div className="relative z-10 flex flex-col gap-4 mb-10">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="bg-primary p-3 rounded-xl flex items-center justify-center">
                                <Bot className="text-white" size={26} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">AI Incident Dashboard</h3>
                        </div>
                        <p className="text-gray-600 text-[15px] leading-relaxed max-w-lg">
                            Automatically triages incoming SOS requests based on water levels, vulnerability data, and responder proximity. Eliminates dispatch bottlenecks during peak crises.
                        </p>
                    </div>

                    {/* Active Incidents Mockup UI */}
                    <div className="relative z-10 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-6 mt-auto">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[11px] font-bold text-gray-800 tracking-wider">ACTIVE INCIDENTS</span>
                            <span className="bg-red-50 text-red-700 text-[10px] font-extrabold tracking-widest px-2 py-1 rounded">14 CRITICAL</span>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="h-2 bg-gray-100 rounded-full w-full"></div>
                            <div className="h-2 bg-gray-100 rounded-full w-[90%]"></div>
                            <div className="h-2 bg-gray-100 rounded-full w-[70%]"></div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Other features */}
                <div className="flex flex-col gap-6">
                    
                    {/* Top Row: Smart Logistics */}
                    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col h-full justify-center">
                        <div className="mb-4">
                            <Package className="text-primary fill-primary/10" size={28} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Logistics</h3>
                        <p className="text-gray-600 text-[15px] leading-relaxed">
                            Track rescue boats, relief goods, and personnel deployment in real-time across the municipal map.
                        </p>
                    </div>

                    {/* Bottom Row: 2-column grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
                        {/* SMS Broadcast */}
                        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col justify-center">
                            <div className="mb-4">
                                <MessageSquare className="text-primary fill-primary/10" size={26} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">SMS Broadcast</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Bypass internet outages with direct-to-device emergency SMS alerts.
                            </p>
                        </div>

                        {/* Observation Feeds */}
                        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col justify-center">
                            <div className="mb-4">
                                <CloudRain className="text-primary fill-primary/10" size={26} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Observation Feeds</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Integrates local rain gauge sensors for predictive flood modeling.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </section>
  )
}
