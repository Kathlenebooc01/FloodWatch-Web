"use client";

import React from 'react';
import ToogleButtonLayout from '@/components/button/ToogleButtonLayout';
import ToogleButton from '@/components/button/ToogleButton';

export default function HazardMapToogleButton({ activeHazard, onHazardChange }) {
  return (
    <ToogleButtonLayout className="w-full sm:w-auto">
      <ToogleButton
        className={`text-xs whitespace-nowrap px-3 ${activeHazard === 'flood' ? 'button-toogle-active' : ''}`}
        onClick={() => onHazardChange('flood')}
      >
        Flood Hazard
      </ToogleButton>

      <ToogleButton
        className={`text-xs whitespace-nowrap px-3 ${activeHazard === 'landslide' ? 'button-toogle-active' : ''}`}
        onClick={() => onHazardChange('landslide')}
      >
        Landslide Hazard
      </ToogleButton>

      <ToogleButton
        className={`text-xs whitespace-nowrap px-3 ${activeHazard === 'storm-surge' ? 'button-toogle-active' : ''}`}
        onClick={() => onHazardChange('storm-surge')}
      >
        Storm Surge
      </ToogleButton>

      <ToogleButton
        className={`text-xs whitespace-nowrap px-3 ${activeHazard === 'earthquake' ? 'button-toogle-active' : ''}`}
        onClick={() => onHazardChange('earthquake')}
      >
        Active Fault Lines
      </ToogleButton>
    </ToogleButtonLayout>
  );
}
