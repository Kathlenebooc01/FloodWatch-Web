import ViewProfilePane from "@/components/utilities/request/ViewProfilePane"
import ViewRequesDetails from "@/components/utilities/request/ViewRequesDetails"
export default async function page({ searchParams }) {
  const { id } = await searchParams
  return (
    <section className="grid gap-1 lg:grid-cols-3">
        <div className="lg:col-span-1">
            <ViewProfilePane id={id}/>
        </div>
        <div className="lg:col-span-2">
            <ViewRequesDetails id={id}/>
        </div>
    </section>
  )
}
