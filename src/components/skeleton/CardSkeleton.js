import React from 'react'
import GeneralCard from '../cards/GeneralCard'
import SingleLineSkeleton from './SingleLineSkeleton'

export default function CardSkeleton() {
  return (
    <GeneralCard className="grid gap-5 p-5">
      <div className="w-3/4">
        <SingleLineSkeleton />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="w-1/4">
            <SingleLineSkeleton />
        </div>
        <div className="w-1/3">
            <SingleLineSkeleton />
        </div>
      </div>
    </GeneralCard>
  )
}
