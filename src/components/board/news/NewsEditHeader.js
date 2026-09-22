import CardBasedText from "@/components/cards/CardBasedText"
import CardHeader from "@/components/cards/CardHeader"
import PrimaryButton from "@/components/button/PrimaryButton"
import { SendHorizonal, Loader2 } from "lucide-react"

export default function NewsEditHeader({ onPublish, isLoading, disabled }) {
  return (
    <section className="flex items-center justify-between mb-5">
        <div>
            <CardHeader className='text-primary'>Publish News Board</CardHeader>
            <CardBasedText className='text-gray-500'>Create a new environment bulletin or news update for the network.</CardBasedText>
        </div>
        <div>
            <PrimaryButton 
              className='flex gap-2 items-center' 
              onClick={onPublish}
              disabled={isLoading || disabled}
            >
              {isLoading ? <Loader2 className="size-5 animate-spin" /> : <SendHorizonal className="size-5"/>}
              {isLoading ? "Publishing..." : "Publish"}
            </PrimaryButton>
        </div>
    </section>
  )
}
