import NewsViewPage from "@/components/board/news/NewsViewPage"
export default async function page({ searchParams }) {
  const { id } = await searchParams
  return (
    <NewsViewPage id={id} />
  )
}
