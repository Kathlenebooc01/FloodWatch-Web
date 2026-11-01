import { Bot, CloudRain, FileText, Package, Radio, ShieldCheck } from "lucide-react"

const capabilities = [
  { icon: Package, title: "Smart Logistics", description: "Track rescue boats, relief goods, and personnel deployment across the municipal map." },
  { icon: FileText, title: "Situational Reports", description: "Submit and review field updates from LGUs to keep incident information organized." },
  { icon: CloudRain, title: "Observation Feeds", description: "Bring local rainfall observations into a clearer view of changing flood conditions." },
]

export default function LGUFeature() {
  return (
    <section className="relative overflow-hidden bg-white px-6 py-20 sm:px-10 lg:px-12 lg:py-28">
      <div className="pointer-events-none absolute right-0 top-0 h-[480px] w-[480px] rounded-full bg-[#e8f4ff] blur-3xl" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-12 max-w-2xl">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#1260c7]"><span className="h-1.5 w-1.5 rounded-full bg-[#2c8aff]" /> For responders</span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0a1e3a] sm:text-4xl lg:text-5xl">One clear view. <span className="text-[#2477df]">Faster action.</span></h2>
          <p className="mt-4 text-base leading-7 text-slate-600">A command center designed to help LGUs connect incoming reports, people, and resources.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <article className="relative flex min-h-[540px] flex-col overflow-hidden rounded-[30px] bg-[#071a34] p-7 text-white shadow-[0_28px_65px_rgba(8,36,76,0.16)] sm:p-9">
            <div className="pointer-events-none absolute -right-32 -top-28 h-96 w-96 rounded-full border border-sky-300/10 bg-sky-400/10" />
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300"><Bot size={27} /></div>
              <span className="rounded-full border border-sky-300/20 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200">Platform preview</span>
            </div>
            <div className="relative z-10 mt-8 max-w-md">
              <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">AI Incident Dashboard</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">See incoming SOS requests alongside water levels, vulnerability data, and responder proximity to support timely decisions.</p>
            </div>

            <div className="relative z-10 mt-10 rounded-2xl border border-sky-200/15 bg-[#102849]/85 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.22)] backdrop-blur-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2"><Radio size={16} className="text-sky-400" /><span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-200">Response overview</span></div>
                <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Interface concept</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4"><div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10 text-red-300"><Radio size={17} /></div><div className="text-sm font-bold">Incident reports</div><div className="mt-1 text-xs text-slate-400">Prioritize requests</div></div>
                <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4"><div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300"><ShieldCheck size={17} /></div><div className="text-sm font-bold">Response teams</div><div className="mt-1 text-xs text-slate-400">Coordinate dispatch</div></div>
                <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4"><div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><CloudRain size={17} /></div><div className="text-sm font-bold">Weather context</div><div className="mt-1 text-xs text-slate-400">Monitor conditions</div></div>
              </div>
            </div>
          </article>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {capabilities.map(({ icon: Icon, title, description }) => (
              <article key={title} className="flex min-h-[160px] items-start gap-5 rounded-[26px] border border-[#e1eaf5] bg-[#f8fbff] p-6 shadow-[0_12px_34px_rgba(20,54,95,0.04)] sm:p-7">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e6f1ff] text-[#1769d4]"><Icon size={24} /></div>
                <div className="min-w-0 flex-1"><h3 className="text-lg font-bold text-[#0a1e3a]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
