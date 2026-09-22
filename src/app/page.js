import Hero from "@/components/landingpage/Hero"
import MissionAndVision from "@/components/landingpage/MissionAndVision"
import CitizenFeatures from "@/components/landingpage/CitizenFeatures"
import LGUFeature from "@/components/landingpage/LGUFeature"
import Footer from "@/components/landingpage/Footer"
import ScrollReveal from "@/components/ui/ScrollReveal"
import HNavBar from "@/components/navbar/HNavBar"
import ConnectionTest from "@/supabase/util/connectionTest"
export default function page() {
  return (
    <>
      <HNavBar />
      <main>
      <section id="home">
        {/* We place 'download' id offset so the anchors jump correctly */}
        <div id="download" className="absolute top-[30vh]"></div>
        <ScrollReveal delay={0.1}>
          <Hero/>
        </ScrollReveal>
      </section>
      
      <ScrollReveal delay={0.2}>
        <MissionAndVision/>
      </ScrollReveal>
      
      <section id="features" className="pt-8">
        <ScrollReveal delay={0.2}>
          <CitizenFeatures/>
        </ScrollReveal>
        
        <ScrollReveal delay={0.2}>
          <LGUFeature/>
        </ScrollReveal>
      </section>
      
      <ScrollReveal delay={0}>
        <Footer/>
      </ScrollReveal>
    </main>
    </>
  )
}

