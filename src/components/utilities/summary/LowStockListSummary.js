"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/supabase/util/supabase"
import GeneralCard from "@/components/cards/GeneralCard"
import { SquareArrowDownRight, ChevronRight } from "lucide-react"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import Link from "next/link"

export default function LowStockListSummary() {
  const [topLowStock, setTopLowStock] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchTopLowStock = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('utilities')
      .select('*')
      .lte('quantity', 10)
      .order('quantity', { ascending: true })
      .limit(1)

    if (!error && data && data.length > 0) {
      setTopLowStock(data[0])
    } else {
      setTopLowStock(null)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchTopLowStock()

    const channel = supabase
      .channel('low-stock-summary-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'utilities' }, fetchTopLowStock)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <GeneralCard className="p-5 flex flex-col justify-between gap-4 border border-gray-200 bg-white">
      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
        <div>
          <CardSubHeader>Low Stock Alert</CardSubHeader>
          <CardBasedText className="text-gray-400 text-xs font-semibold">Most urgent utility requiring restock</CardBasedText>
        </div>
        <div className="summary-data-icon-red">
          <SquareArrowDownRight className="size-5" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-3 flex flex-col gap-2 animate-pulse">
          <div className="w-2/3 h-4 bg-gray-200 rounded"></div>
          <div className="w-1/2 h-3 bg-gray-100 rounded"></div>
        </div>
      ) : topLowStock ? (
        <Link 
          href="/provincial-admin/utilities/inventory"
          className="p-3.5 bg-red-50/60 border border-red-200 rounded-xl flex flex-col gap-2 transition-all hover:bg-red-50 hover:border-red-300 group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-gray-800 line-clamp-1">
              {topLowStock.name}
            </span>
            <span className="px-2 py-0.5 bg-red-100 text-red-700 font-extrabold text-[10px] uppercase rounded-full border border-red-200">
              {topLowStock.quantity} Remaining
            </span>
          </div>

          <p className="text-xs text-red-600 font-semibold">
            Stock level is below minimum threshold! Restock required.
          </p>

          <div className="flex items-center justify-end gap-1 text-xs font-bold text-red-700 pt-1 group-hover:translate-x-0.5 transition-transform">
            <span>Manage Inventory</span>
            <ChevronRight className="size-3.5" />
          </div>
        </Link>
      ) : (
        <div className="py-4 text-center text-xs text-gray-400 bg-gray-50/60 border border-dashed border-gray-200 rounded-xl">
          All utility stock levels are sufficient.
        </div>
      )}
    </GeneralCard>
  )
}
