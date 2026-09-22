import GeneralCard from "../cards/GeneralCard"
import CardHeader from "../cards/CardHeader"
import CardBasedText from "../cards/CardBasedText"
import PrimaryButton from "../button/PrimaryButton"
import SecondaryButton from "../button/SecondaryButton"
import { MapPinned, Plus } from "lucide-react"
import Link from "next/link"

export default function ImportAreas() {
  return (
    <section>
      <GeneralCard className="grid gap-5">
        <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
          {/* Left: text + buttons */}
          <div className="flex flex-col gap-4">
            <div>
              <CardHeader>Geographic Map</CardHeader>
              <CardBasedText className='text-gray-500 max-w-xs'>
                Manage local area seeding records or view spatial coverage.
              </CardBasedText>
            </div>
            <div className="flex gap-2 items-center">
              <Link href="?add-area=true">
                <PrimaryButton className="flex items-center gap-1.5 text-xs">
                  <Plus className="size-4" />
                  <span>Add Areas</span>
                </PrimaryButton>
              </Link>
              <Link href="/national-admin/map">
                <SecondaryButton>View Map</SecondaryButton>
              </Link>
            </div>
          </div>

          {/* Right: icon */}
          <div className="summary-data-icon self-center p-5">
            <MapPinned size={30} />
          </div>
        </div>
      </GeneralCard>
    </section>
  )
}
