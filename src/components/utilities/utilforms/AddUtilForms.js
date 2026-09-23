"use client"
import { useState } from "react"
import CardBasedText from "@/components/cards/CardBasedText"
import TextArea from "@/components/forms/TextArea"
import TagsInput from "@/components/forms/TagsInput"
import GeneralInput from "@/components/forms/GeneralInput"

export default function AddUtilForms({ formData, setFormData }) {
  const handleQuantityChange = (e) => {
    // Force numbers only
    const val = e.target.value.replace(/[^0-9]/g, "")
    
    setFormData(prev => ({
      ...prev,
      quantity: val
    }))
  }

  return (
    <section className="grid gap-5">
        <div className="grid grid-cols-2 gap-3">
            <fieldset className="grid gap-1">
                <CardBasedText className='text-gray-700 font-semibold'>Utility Name</CardBasedText>
                <GeneralInput 
                  placeholder='e.g ambulance'
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
            </fieldset>
             <fieldset className="grid gap-1">
                <CardBasedText className='text-gray-700 font-semibold'>Utility Type</CardBasedText>
                <GeneralInput 
                  placeholder='e.g medical'
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                />
            </fieldset>
        </div>
        <div className="grid grid-cols-2 gap-3">
            <fieldset className="grid gap-1">
                <CardBasedText className='text-gray-700 font-semibold'>Quantity/Number of Utilities</CardBasedText>
                <GeneralInput 
                  placeholder='e.g 5'
                  value={formData.quantity}
                  onChange={handleQuantityChange}
                  type="text"
                  inputMode="numeric"
                />
            </fieldset>
             <fieldset className="grid gap-1">
                <CardBasedText className='text-gray-700 font-semibold'>Serial Numbers (Optional)</CardBasedText>
                <GeneralInput 
                  placeholder='e.g RC-004'
                  value={formData.serial_number || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                />
            </fieldset>
        </div>
         <div className="w-full">
            <fieldset className="grid gap-1">
                <CardBasedText className='text-gray-700 font-semibold'>Item Description</CardBasedText>
                <TextArea 
                  className='text-xs'
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
            </fieldset>
        </div>
    </section>
  )
}
