import { Asterisk, Map, Camera, Bell } from "lucide-react";

export default function CitizenFeatures() {
  return (
    <section className="bg-[#f8f9fa] py-16 px-6 lg:px-12 rounded-[2.5rem] mt-16 mx-2 lg:mx-10 border border-gray-100">
        <div className="max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="mb-10">
                <span className="text-[#0B50DA] font-bold text-[11px] tracking-widest uppercase">For the Public</span>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-2">Citizen Features</h2>
            </div>
            
            {/* Feature Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Feature: One-Tap SOS (Wide) */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm col-span-1 lg:col-span-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="flex flex-col gap-3 max-w-lg">
                        <div className="flex items-center gap-2">
                            <Asterisk className="text-red-700" size={22} strokeWidth={3} />
                            <h3 className="text-2xl font-bold text-gray-900">One-Tap SOS</h3>
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Instantly broadcast your exact GPS coordinates to the nearest LGU
                            command center and predefined emergency contacts. Operates even on
                            low bandwidth.
                        </p>
                        <span className="text-red-700 font-bold text-[10px] tracking-widest uppercase mt-3">Critical Priority</span>
                    </div>
                    {/* SOS Button Element */}
                    <div className="bg-red-50 p-4 rounded-3xl shrink-0">
                        <button className="bg-[#990000] text-white font-bold text-xl rounded-2xl w-24 h-24 shadow-[0_8px_20px_rgba(153,0,0,0.4)] flex items-center justify-center hover:bg-red-900 transition-colors cursor-pointer">
                            SOS
                        </button>
                    </div>
                </div>

                {/* Feature: Live Safety Map (Standard) */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm flex flex-col">
                    <Map className="text-primary mb-4" size={26} strokeWidth={2.5} />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Participatory Incident</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Participate in local safety by snapping photos of hazards, and see what others are reporting in your exact area.
                    </p>
                </div>

                {/* Feature: Snap & Report (Standard) */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm flex flex-col">
                    <div className="bg-blue-50/50 w-fit p-1 rounded mb-3">
                        <Camera className="text-primary" size={26} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Snap & Report</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Submit geo-tagged photos of rising water levels to update the central map.
                    </p>
                </div>

                {/* Feature: Official Alerts (Wide) */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm col-span-1 lg:col-span-2 flex flex-col sm:flex-row items-start gap-6">
                    <div className="bg-[#eef2fc] p-4 rounded-2xl shrink-0">
                        <Bell className="text-primary" size={26} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col justify-center mt-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Official Alerts</h3>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-xl">
                            Receive un-ignorable push notifications directly from your local LGU regarding localized flash flood warnings and evacuation orders.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    </section>
  )
}
