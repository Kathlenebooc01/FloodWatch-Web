
import CardBasedText from "../cards/CardBasedText"
import { Blocks } from "lucide-react"
import CardHeader from "../cards/CardHeader"
import CardSubHeader from "../cards/CardSubHeader"
export default function EmptyMessage() {
  return (
    <section className="text-gray-500 flex flex-col items-center justify-center w-full gap-5">
        <div>
            <Blocks className="size-24 text-gray-300"/>
        </div>
        <div className="text-center">
            <CardHeader>This Place is Empty</CardHeader>
            <CardBasedText>Looks like there is nothing here. Add your first<CardSubHeader></CardSubHeader> here</CardBasedText>
        </div>
    </section>
  )
}
