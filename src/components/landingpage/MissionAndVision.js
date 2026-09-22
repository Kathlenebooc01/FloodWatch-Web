import { Target, Eye } from "lucide-react"

export default function MissionAndVision() {
  return (
    <section className="grid gap-5 lg:mx-10">
        <h1 className="text-2xl p-2 flex justify-center font-semibold">Protecting Cebu, Together.</h1>
        <div className="mission-vision-layout">
            <article className="card-border">
                <div className="bg-primary/40 flex w-fit p-2 rounded-xl">
                <Target className="text-primary"/>
                </div>
                <label className="font-semibold text-lg" >Our Mission</label>
                <p>To empower every Cebuano with real-time,
actionable intelligence during critical weather
events, ensuring rapid response and coordinated
rescue efforts across all LGUs.</p>
            </article>
            <article className="card-border">
                <div className="bg-primary/40 flex w-fit p-2 rounded-xl">
                <Eye className="text-primary"/>
                </div>
                <label className="font-semibold text-lg" >Our Vision</label>
                <p>A zero-casualty province where technology bridges
the gap between citizens in distress and emergency
responders, creating a resilient and prepared
community.</p>
            </article>
        </div>
    </section>
  )
}
