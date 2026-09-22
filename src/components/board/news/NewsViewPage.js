"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"
import GeneralCard from "@/components/cards/GeneralCard"
import CardBasedText from "@/components/cards/CardBasedText"
import CardHeader from "@/components/cards/CardHeader"
import CardSubHeader from "@/components/cards/CardSubHeader"
import Link from "next/link"
import { User, Link2, Trash, Eye } from "lucide-react"
import SecondaryButton from "@/components/button/SecondaryButton"
import SquareSkeleton from "@/components/skeleton/SquareSkeleton"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import NewsViewDeleteModal from "./NewsViewDeleteModal"

export default function NewsViewPage({ id }) {
  const router = useRouter()
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    const fetchNews = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("news_board")
        .select("id, cover_image, headline, tags, detailed_content, external_reference_link, created_at, views, profiles(full_name)")
        .eq("id", id)
        .single()

      if (error) {
        console.error("[NEWS VIEW FETCH] failed:", error.message, error)
        setLoading(false)
        return
      }
      setNews(data)
      setLoading(false)
    }
    fetchNews()
  }, [id])

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      const { error } = await supabase.from("news_board").delete().eq("id", id)
      if (error) {
        console.error("[NEWS DELETE] failed:", error.message, error)
        throw error
      }
      router.push("/provincial-admin/board/news")
    } catch (err) {
      console.error("[NEWS DELETE] aborted:", err?.message, err)
      setIsDeleting(false)
    }
  }

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      : ""

  if (loading) {
    return (
      <GeneralCard className='p-5 grid gap-6'>
        <div className="h-[450px] overflow-hidden rounded-2xl w-full">
          <SquareSkeleton />
        </div>
        <div className="flex justify-between items-center">
          <div className="w-1/3"><SingleLineSkeleton /></div>
          <div className="w-1/6"><SingleLineSkeleton /></div>
        </div>
        <hr />
        <div className="grid gap-4">
          <div className="w-1/2"><SingleLineSkeleton /></div>
          <div className="grid gap-2">
            <SingleLineSkeleton />
            <SingleLineSkeleton />
            <SingleLineSkeleton />
          </div>
        </div>
      </GeneralCard>
    )
  }

  if (!news) {
    return (
      <GeneralCard className='p-10 grid place-items-center'>
        <CardBasedText className="text-gray-500">News not found.</CardBasedText>
      </GeneralCard>
    )
  }

  const tags = Array.isArray(news.tags) ? news.tags : []

  return (
    <>
    <GeneralCard className='p-5 md:p-6 grid gap-6'>
        <div className="relative rounded-2xl overflow-hidden shadow-sm w-full">
            <img 
              src={news.cover_image || "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000&auto=format&fit=crop"} 
              alt={news.headline || "News cover"} 
              className="w-full h-[450px] object-cover"
            />
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                <SecondaryButton 
                  onClick={() => setShowDeleteModal(true)} 
                  className='px-5 py-2 text-red-500 font-semibold border-none bg-white/90 backdrop-blur-md shadow-md hover:bg-white transition-all'
                >
                  Delete <Trash className="text-red-500 size-4"/>
                </SecondaryButton>
                <div className="flex items-center text-gray-700 gap-2 py-2 px-5 bg-white/90 backdrop-blur-md shadow-md rounded-lg text-sm font-semibold">
                    <Eye className="size-4 text-primary"/>
                    <span>{news.views ?? 0}</span>
                </div>
            </div>
        </div>
        
        <div className="grid gap-5">
          <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="summary-data-icon"><User/></div>
                <CardSubHeader>{news.profiles?.full_name || "Unknown"}</CardSubHeader>
              </div>
              <CardBasedText className='text-gray-500 font-semibold'>{formatDate(news.created_at)}</CardBasedText>
          </div>
          
          <hr className="border-gray-200/60"/>

          <div className="py-2 grid gap-3">
              <CardHeader className="text-primary text-2xl md:text-3xl font-extrabold">{news.headline}</CardHeader>
              <CardBasedText className="text-base md:text-lg text-gray-700 text-justify leading-relaxed whitespace-pre-wrap">
                {news.detailed_content}
              </CardBasedText>
          </div>
          
          <hr className="border-gray-200/60"/>
          
          <div className="flex items-center gap-4 justify-between flex-wrap pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                  {tags.map((tag, i) => (
                    <span key={i} className='tag-summary-default shadow-sm'>{tag}</span>
                  ))}
              </div>
              {news.external_reference_link && (
                <div className="flex items-center gap-2 tag-default text-sm">
                    <Link2 className="size-4 text-primary shrink-0"/>
                    <Link href={news.external_reference_link} target="_blank" className="hover:underline truncate max-w-[250px] md:max-w-md">
                      {news.external_reference_link}
                    </Link>
                </div>
              )}
          </div>
        </div>
    </GeneralCard>

    {showDeleteModal && (
      <NewsViewDeleteModal
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    )}
    </>
  )
}
