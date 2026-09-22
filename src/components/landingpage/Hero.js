import Image from "next/image"
import AndroidIcon from "@/assets/icons/android.svg"
import AppleIcon from "@/assets/icons/ios.svg"
import HeroCover from "@/assets/images/HeroCover.png"

export default function Hero() {
  return (
    <section className="relative w-full min-h-[70vh] flex flex-col justify-center px-6 lg:px-16 py-20 overflow-hidden rounded-3xl mt-2">
        {/* Background Image */}
        <Image 
            src={HeroCover} 
            alt="Hero Background" 
            fill 
            
            priority
            unoptimized
            className="object-cover absolute inset-0 -z-20 opacity-90" 
        />
        
        {/* Bottom Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary to-transparent -z-10" />

        {/* Content Wrapper */}
        <div className="relative z-10 max-w-3xl">
            <article className="grid gap-4 mb-8">
                <div className="text-5xl lg:text-7xl font-bold leading-tight">
                    <label className="block text-white">Your Lifeline</label> 
                    <label className="text-primary block">During Flood</label>
                </div>
                <p className="font-semibold text-lg text-white">By Provincial Disaster Risk Reduction and Management Office Cebu</p>
                <div className="text-white max-w-lg text-lg">Cebu's official citizen rescue app and LGU command center. Tactical clarity when seconds count.</div>
            </article>

            <div className="flex flex-wrap gap-4">
                <button className="btn-primary flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow">
                    <Image src={AndroidIcon} alt="Android Logo" width={24} height={24} />
                    <div className="flex flex-col items-start leading-tight">
                        <label className="text-xs font-normal cursor-pointer">Download on The</label>
                        <label className="text-lg font-bold cursor-pointer">Play Store</label>
                    </div>
                </button>
                <button className="btn-primary flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow">
                    <Image src={AppleIcon} alt="Android Logo" width={24} height={24} />
                    <div className="flex flex-col items-start leading-tight">
                        <label className="text-xs font-normal cursor-pointer">Download on The</label>
                        <label className="text-lg font-bold cursor-pointer">App Store</label>
                    </div>
                </button>
            </div>
        </div>
    </section>
  )
}
