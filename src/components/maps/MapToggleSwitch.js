"use client";

import React from 'react'
import ToogleButtonLayout from '@/components/button/ToogleButtonLayout'
import ToogleButton from '../button/ToogleButton'

export default function MapToggleSwitch({ activeTab, onTabChange }) {
  return (
    <ToogleButtonLayout className='w-full lg:w-sm'>
        <ToogleButton 
          className={`text-xs ${activeTab === 'Risk Mapping' ? 'button-toogle-active' : ''}`}
          onClick={() => onTabChange('Risk Mapping')}
        >
          Risk Mapping
        </ToogleButton>
        <ToogleButton 
          className={`text-xs ${activeTab === 'Observation Feeds' ? 'button-toogle-active' : ''}`}
          onClick={() => onTabChange('Observation Feeds')}
        >
          Observation Feeds
        </ToogleButton>
    </ToogleButtonLayout>
  )
}
