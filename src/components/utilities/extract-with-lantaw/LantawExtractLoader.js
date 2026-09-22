import WaveLoader from "@/components/loader/WaveLoader"
import CardBasedText from "@/components/cards/CardBasedText"
import { Origami } from "lucide-react"
export default function LantawExtractLoader() {
  return (
    <section className="flex items-center justify-center">
        <div className="flex flex-col gap-2 justify-center items-center">
            <WaveLoader/>
            <CardBasedText className='animate-pulse text-gray-500'>Lantaw is currently processing your file...</CardBasedText>
        </div>
    </section>
  )
}
