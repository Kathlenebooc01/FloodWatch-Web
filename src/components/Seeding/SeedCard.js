"use client"

import { useState, useEffect } from 'react'
import CardSubHeader from '../cards/CardSubHeader'
import GeneralCard from '../cards/GeneralCard'
import { Map, Building2 } from 'lucide-react'
import CardHeader from '../cards/CardHeader'
import CardBasedText from '../cards/CardBasedText'
import { supabase } from '@/supabase/util/supabase'

export default function SeedCard() {
  const [provinceCount, setProvinceCount] = useState(0)
  const [municipalityCount, setMunicipalityCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCounts = async () => {
    try {
      // Execute count queries concurrently in parallel for max performance
      const [provinceRes, municipalityRes] = await Promise.all([
        supabase.from('province').select('*', { count: 'exact', head: true }),
        supabase.from('municipality_or_city').select('*', { count: 'exact', head: true })
      ])

      if (provinceRes.count !== null) setProvinceCount(provinceRes.count)
      if (municipalityRes.count !== null) setMunicipalityCount(municipalityRes.count)
    } catch (error) {
      console.error("Error loading seed card counts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCounts()

    // Subscribe to realtime changes on province & municipality tables
    const provChannel = supabase
      .channel('province-count-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'province' }, fetchCounts)
      .subscribe()

    const muniChannel = supabase
      .channel('muni-count-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'municipality_or_city' }, fetchCounts)
      .subscribe()

    return () => {
      supabase.removeChannel(provChannel)
      supabase.removeChannel(muniChannel)
    }
  }, [])

  if (isLoading) {
    return (
      <section className='grid grid-cols-2 gap-2'>
        <GeneralCard>
          <div className='summary-data-layout animate-pulse'>
            <span className='summary-data-icon bg-gray-200/80 w-9 h-9 rounded-xl shrink-0' />
            <div className="h-3.5 bg-gray-200/80 rounded w-3/4" />
            <div className="h-7 bg-gray-200/80 rounded w-12 mx-auto mt-1" />
          </div>
        </GeneralCard>
        <GeneralCard>
          <div className='summary-data-layout animate-pulse'>
            <span className='summary-data-icon bg-gray-200/80 w-9 h-9 rounded-xl shrink-0' />
            <div className="h-3.5 bg-gray-200/80 rounded w-3/4" />
            <div className="h-7 bg-gray-200/80 rounded w-12 mx-auto mt-1" />
          </div>
        </GeneralCard>
      </section>
    )
  }

  return (
    <section className='grid grid-cols-2 gap-2'>
      <GeneralCard>
        <div className='summary-data-layout'>
          <span className='summary-data-icon text-primary'>
            <Map className="size-5" />
          </span>
          <CardBasedText className='text-gray-500 font-medium text-xs'>
            Total Registered Provinces
          </CardBasedText>
          <CardHeader className='text-center text-2xl font-bold text-gray-800'>
            {provinceCount.toLocaleString()}
          </CardHeader>
        </div>
      </GeneralCard>

      <GeneralCard>
        <div className='summary-data-layout'>
          <span className='summary-data-icon text-primary'>
            <Building2 className="size-5" />
          </span>
          <CardBasedText className='text-gray-500 font-medium text-xs'>
            Total Registered Municipalities
          </CardBasedText>
          <CardHeader className='text-center text-2xl font-bold text-gray-800'>
            {municipalityCount.toLocaleString()}
          </CardHeader>
        </div>
      </GeneralCard>
    </section>
  )
}
