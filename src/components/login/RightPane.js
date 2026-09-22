import EmblemLogo from "@/assets/images/logofloodwatch.png";
import CardBasedText from "../cards/CardBasedText";
import CardHeader from "../cards/CardHeader";
import CardSubHeader from "../cards/CardSubHeader";
import Image from "next/image";
import HeroCover from "@/assets/images/HeroCover.png";
import GlassCard from "../cards/GlassCard";
import { Radar, BellRing } from "lucide-react";
export default function RightPane() {
  return (
    <div className="relative hidden md:flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <Image 
        src={HeroCover} 
        alt="Login Cover" 
        fill 
        className="object-fill"
        priority
      />
      {/* Overlay to ensure text readability against the image */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent" />
      
      <div className="relative z-10 p-8 text-center text-white flex flex-col gap-2 items-center h-full justify-end pb-16 w-full">
        <CardHeader className="text-white tracking-tight">Protecting Our Communities</CardHeader>
        <CardBasedText>Providing real-time flood monitoring, alerts, and emergency resources for every citizen.</CardBasedText>
        <div className="grid gap-5 grid-cols-2">
        <GlassCard className='flex flex-col items-center gap-1'>
        <Radar/>
        <CardBasedText className="font-semibold" >
          Live Radar
        </CardBasedText>
        </GlassCard>
        <GlassCard className='flex flex-col items-center gap-1'>
        <BellRing/>
        <CardBasedText className="font-semibold" >
          Instant Alerts
        </CardBasedText>
        </GlassCard>
        </div>
      </div>
    </div>
  )
}
