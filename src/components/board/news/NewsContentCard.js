"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/supabase/util/supabase"
import GeneralCard from "@/components/cards/GeneralCard"
import CardBasedText from "@/components/cards/CardBasedText"
import CardHeader from "@/components/cards/CardHeader"
import PrimaryButton from "@/components/button/PrimaryButton"
import SecondaryButton from "@/components/button/SecondaryButton"
import CardSkeleton from "@/components/skeleton/CardSkeleton"
import EmptyMessage from "@/components/board/EmptyMessage"
import Link from "next/link"
import { Trash,User } from "lucide-react"

function InViewWrapper({ children }) {
  const [isInView, setIsInView] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="h-full">
      {isInView ? children : <CardSkeleton />}
    </div>
  )
}

export default function NewsContentCard({ refreshToken = 0, selectedIds = [], onToggleSelect, onDeleteOne, searchTerm = "" }) {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true)
      let query = supabase
        .from("news_board")
        .select("id, cover_image, headline, tags, detailed_content, created_at, profiles(full_name)")
        .order("created_at", { ascending: false })

      if (searchTerm) {
        query = query.ilike("headline", `%${searchTerm}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error("[NEWS FETCH] failed:", error.message, error)
        setLoading(false)
        return
      }
      setNews(data || [])
      setLoading(false)
    }
    fetchNews()
  }, [refreshToken, searchTerm])

  const truncateWords = (text, limit) => {
    if (!text) return ""
    const words = text.split(" ")
    return words.length > limit ? words.slice(0, limit).join(" ") + "..." : text
  }

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      : ""

  if (loading) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </section>
    )
  }

  if (news.length === 0) {
    return (
      <section className="grid place-items-center py-16">
        <EmptyMessage />
      </section>
    )
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {news.map((item) => {
        const tags = Array.isArray(item.tags) ? item.tags : []
        const extraTags = tags.length > 1 ? tags.length - 1 : 0
        const isSelected = selectedIds.includes(item.id)

        return (
        <InViewWrapper key={item.id}>
        <GeneralCard className='relative overflow-hidden px-0 py-0 h-full'>
        <div className="w-full h-48 overflow-hidden">
            <img
                className="w-full h-[300px] object-cover"
                src={item.cover_image || "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000&auto=format&fit=crop"}
                alt="news banner"
            />
        </div>
        <div className="absolute top-0 p-2 w-full">
            <div className="flex justify-between items-center">
            <div>
                <input
                    type="checkbox"
                    className="w-5 h-5 rounded-lg border-gray-200"
                    checked={isSelected}
                    onChange={() => onToggleSelect?.(item.id)}
                />
            </div>
            {tags.length > 0 && (
            <div className="flex items-stretch gap-1">
            <div className="tag-banner-default">
                <CardBasedText>{tags[0]}</CardBasedText>
            </div>
            {extraTags > 0 && (
            <div className="tag-summary-default">
                <CardBasedText>{extraTags}+</CardBasedText>
            </div>
            )}

            </div>
            )}
            </div>

        </div>
        <div className="p-2 flex flex-col gap-5">
            <CardHeader className='text-primary/80'>{item.headline}</CardHeader>
            <div className="flex flex-col gap-3">
                <CardBasedText className='text-gray-500'>{truncateWords(item.detailed_content, 20)}</CardBasedText>
                <hr className="border-gray-500/20"/>
                <div className="flex items-center justify-between" >
                    <div className="flex gap-2 items-center text-gray-500 font-semibold">
                        <div className="p-2 bg-gray-500/10 text-gray-500 rounded-full"><User/></div>
                        <CardBasedText>{item.profiles?.full_name || "Unknown"}</CardBasedText>
                    </div>
                    <div className="text-gray-500">
                        <CardBasedText>{formatDate(item.created_at)}</CardBasedText>
                    </div>
                </div>
                <div className="flex gap-2 items-stretch">
                <Link href={`/provincial-admin/board/news/view-content?id=${item.id}`} className="w-full">
                  <PrimaryButton className='w-full'>View News</PrimaryButton>
                </Link>
                <SecondaryButton className='py-1 px-3 rounded-full' onClick={() => onDeleteOne?.(item.id)}><Trash className="size-5 text-red-500"/></SecondaryButton>
                </div>
            </div>
        </div>

        </GeneralCard>
        </InViewWrapper>
        )
      })}

    </section>
  )
}
