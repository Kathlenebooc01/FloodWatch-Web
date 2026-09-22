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
    
    setFormData(prev => {
      // If quantity is reduced below current tags count, trim the tags
      const num = parseInt(val) || 0
      let newTags = prev.tags
      if (newTags.length > num) {
        newTags = newTags.slice(0, num)
      }
      return { ...prev, quantity: val, tags: newTags }
    })
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
                <CardBasedText className='text-gray-700 font-semibold'>Serial Numbers</CardBasedText>
                <TagsInput 
                  placeholder={formData.quantity ? `Add up to ${formData.quantity} serials (press space)` : 'Set quantity first'}
                  value={formData.tags}
                  onChange={(newTags) => setFormData(prev => ({ ...prev, tags: newTags }))}
                  maxTags={parseInt(formData.quantity) || 0}
                  disabled={!formData.quantity}
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
