import NavUtil from "@/components/utilities/NavUtil"
export default function Layout({ children }) {
  return (
    <main className="grid gap-5">
        <div className="w-fit">
        <NavUtil/>
        </div>
        <section>
            {children}
        </section>
    </main>
  )
}

