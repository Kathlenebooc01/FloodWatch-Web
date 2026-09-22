import GeneralCard from "@/components/cards/GeneralCard"
import CardBasedText from "@/components/cards/CardBasedText"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardHeader from "@/components/cards/CardHeader"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import { Box, Brain } from "lucide-react"

export default function ExtractSummaryDetails({ totalItems, isRendering }) {
  return (
    <section className="grid grid-cols-2 gap-3">
        <GeneralCard>
            <div className="flex justify-between items-center">
                <CardBasedText className='text-gray-500 font-semibold'>Total Items Detected</CardBasedText>
                <div className="summary-data-icon">
                    <Box className="size-5"/>
                </div>
            </div>
            <div>
                {isRendering ? <SingleLineSkeleton /> : <CardHeader>{totalItems || 0}</CardHeader>}
            </div>
        </GeneralCard>
         <GeneralCard>
            <div className="flex justify-between items-center">
                <CardBasedText className='text-gray-500 font-semibold'>Lantaw's Confidence Level</CardBasedText>
                <div className="summary-data-icon-green">
                    <Brain className="size-5"/>
                </div>
            </div>
            <div>
                {isRendering ? <SingleLineSkeleton /> : <CardHeader>100%</CardHeader>}
            </div>
        </GeneralCard>

    </section>
  )
}
