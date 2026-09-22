import GeneralCard from "../cards/GeneralCard"
import SingleLineSkeleton from "../skeleton/SingleLineSkeleton"

export default function SummaryDataSkeleton() {
  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {[...Array(4)].map((_, i) => (
        <GeneralCard key={i} className="grid gap-5 p-5">
          <SingleLineSkeleton />
          <div className="flex items-center justify-between">
            <div className="w-12 h-8 skeleton-base rounded-lg" />
            <div className="w-20 h-5 skeleton-base rounded-lg" />
          </div>
        </GeneralCard>
      ))}
    </section>
  )
}