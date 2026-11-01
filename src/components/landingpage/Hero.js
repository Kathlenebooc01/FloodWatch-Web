import Image from "next/image"
import AndroidIcon from "@/assets/icons/android.svg"
import AppleIcon from "@/assets/icons/ios.svg"
import HeroSatellite from "@/assets/images/HeroSatellite.png"
import styles from "./Hero.module.css"

export default function Hero() {
  return (
    <section className={`${styles.hero} relative isolate flex min-h-[590px] w-full flex-col justify-center overflow-hidden bg-[#07101d] px-6 py-20 text-white sm:px-10 lg:min-h-[620px] lg:px-12`}>
      <Image src={HeroSatellite} alt="Satellite-style view of Cebu with rainfall radar overlays" fill priority sizes="100vw" className={`${styles.satellite} -z-30 object-cover object-[58%_center]`} />
      <div className={`${styles.mapTint} absolute inset-0 -z-20`} />
      <div className={`${styles.mapGrid} absolute inset-0 -z-10`} aria-hidden="true" />
      <div className={`${styles.vignette} absolute inset-0 -z-10`} />

      <span className={`${styles.corner} ${styles.topLeft}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.bottomRight}`} aria-hidden="true" />

      <div className="absolute right-7 top-7 hidden text-right font-mono text-[9px] tracking-[0.14em] text-sky-200/70 sm:block lg:right-12">
        <div className="mb-2 inline-flex items-center gap-2 rounded border border-cyan-400/25 bg-[#06172a]/80 px-3 py-2 font-semibold text-cyan-300 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" /> CEBU SATELLITE VIEW
        </div>
        <div>10.3157° N, 123.8854° E <span className="mx-1 text-sky-500/50">/</span> RAINFALL LAYER</div>
      </div>

      <div className={`${styles.mapMarker} absolute left-[70%] top-[39%] hidden lg:block`} aria-hidden="true"><span /></div>
      <div className={`${styles.mapMarker} absolute left-[82%] top-[65%] hidden lg:block`} aria-hidden="true"><span /></div>

      <div className="relative z-10 max-w-[620px] lg:pt-4">
        <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-sky-400/25 bg-[#102a52]/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-sky-200 shadow-[0_6px_22px_rgba(0,0,0,0.2)] backdrop-blur-sm sm:text-[10px]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
          Provincial Disaster Risk Reduction and Management Office
        </div>
        <h1 className="text-[clamp(3rem,6vw,5.1rem)] font-extrabold leading-[1.04] tracking-[-0.045em] drop-shadow-[0_3px_20px_rgba(0,0,0,0.36)]">
          <span className="block">Your Lifeline</span>
          <span className="block bg-gradient-to-r from-[#3987ff] via-[#42a9ff] to-[#55d5f4] bg-clip-text text-transparent">During Flood</span>
        </h1>
        <p className="mt-5 text-sm font-bold leading-relaxed text-white sm:text-base">By Provincial Disaster Risk Reduction and Management Office Cebu</p>
        <p className="mt-3 max-w-[485px] text-base leading-relaxed text-slate-300 sm:text-lg">
          Cebu&apos;s official citizen rescue app and LGU command center.<br className="hidden sm:block" /> Tactical clarity when seconds count.
        </p>

        <div id="download" className="mt-8 flex scroll-mt-24 flex-wrap gap-3">
          <button className="flex min-w-[172px] items-center justify-center gap-3 rounded-lg border border-blue-200/30 bg-gradient-to-b from-[#3883f6] to-[#2362df] px-5 py-3.5 text-left shadow-[0_12px_26px_rgba(27,88,212,0.28)] transition-all hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
            <Image src={AndroidIcon} alt="" width={23} height={23} />
            <span className="flex flex-col leading-tight"><span className="text-[10px] uppercase text-blue-100">Download on the</span><span className="text-base font-bold">Play Store</span></span>
          </button>
          <button className="flex min-w-[172px] items-center justify-center gap-3 rounded-lg border border-blue-200/30 bg-gradient-to-b from-[#4494ff] to-[#2875e8] px-5 py-3.5 text-left shadow-[0_12px_26px_rgba(27,88,212,0.28)] transition-all hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
            <Image src={AppleIcon} alt="" width={24} height={24} />
            <span className="flex flex-col leading-tight"><span className="text-[10px] uppercase text-blue-100">Download on the</span><span className="text-base font-bold">App Store</span></span>
          </button>
        </div>

        <div className="mt-10 inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-slate-500/25 bg-[#0c1729]/80 px-3.5 py-2.5 font-mono text-[9px] font-semibold tracking-wide text-slate-300 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-md sm:text-[10px]">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_9px_#22d3ee]" /> METRO CEBU</span>
          <span className="text-slate-600">|</span><span>DISASTER MONITORING</span>
          <span className="text-slate-600">|</span><span>LGU COMMAND CENTER</span>
        </div>
      </div>

      <div className="absolute bottom-8 right-12 hidden items-end gap-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-300/70 lg:flex" aria-hidden="true">
        <div className="text-right"><div className="mb-1">Rainfall intensity</div><div className={styles.rainScale} /><div className="mt-1 flex justify-between text-[8px] text-slate-400"><span>LOW</span><span>HIGH</span></div></div>
        <div className="mb-3 h-9 w-px bg-slate-500/40" />
        <div className="mb-3">CEBU / 001</div>
      </div>
    </section>
  )
}
