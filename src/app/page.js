import Hero from "@/components/landingpage/Hero"
import MissionAndVision from "@/components/landingpage/MissionAndVision"
import CitizenFeatures from "@/components/landingpage/CitizenFeatures"
import LGUFeature from "@/components/landingpage/LGUFeature"
import Footer from "@/components/landingpage/Footer"
import ScrollReveal from "@/components/ui/ScrollReveal"
import HNavBar from "@/components/navbar/HNavBar"
export default function page() {
  return (
    <>
      <HNavBar />
      <main>
      <section id="home">
        <ScrollReveal delay={0.1}>
          <Hero/>
        </ScrollReveal>
      </section>
      
      <ScrollReveal delay={0.2}>
        <MissionAndVision/>
      </ScrollReveal>
      
      <section id="features">
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

