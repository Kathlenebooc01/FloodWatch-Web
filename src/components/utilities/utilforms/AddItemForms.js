"use client"
import { useState } from "react"
import CardBasedText from "@/components/cards/CardBasedText"
import GeneralInput from "@/components/forms/GeneralInput"
import TagsInput from "@/components/forms/TagsInput"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

export default function AddItemForms({ formData, setFormData, errors }) {
  const [purchasedDateOpen, setPurchasedDateOpen] = useState(false)
  const [expirationDateOpen, setExpirationDateOpen] = useState(false)

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNumericChange = (field, value) => {
    const val = value.replace(/[^0-9.]/g, "")
    setFormData(prev => ({ ...prev, [field]: val }))
  }

  const handleTotalQuantityChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, "")
    const num = parseInt(val) || 0

    setFormData(prev => {
      let newControlNumbers = prev.control_numbers || []
      if (newControlNumbers.length > num) {
        newControlNumbers = newControlNumbers.slice(0, num)
      }
      return {
        ...prev,
        total_quantity: val,
        available_quantity: prev.available_quantity || val,
        control_numbers: newControlNumbers
      }
    })
  }

  const targetQuantity = parseInt(formData.total_quantity) || 0
  const enteredTagsCount = (formData.control_numbers || []).length

  // Date parse helpers for Shadcn calendar
  const purchasedDateObj = formData.purchased_date ? new Date(formData.purchased_date) : null
  const expirationDateObj = formData.expiration_date ? new Date(formData.expiration_date) : null

  return (
    <section className="grid gap-5">
      {/* Row 1: Item Name & Control Numbers (TagsInput) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <fieldset className="grid gap-1">
          <CardBasedText className='text-gray-700 font-semibold'>
            Item Name <span className="text-red-500">*</span>
          </CardBasedText>
          <GeneralInput 
            placeholder='e.g Tactical Satellite Phone'
            value={formData.item_name}
            onChange={(e) => handleChange("item_name", e.target.value)}
          />
          {errors?.item_name && (
            <p className="text-xs text-red-500 font-semibold mt-0.5">{errors.item_name}</p>
          )}
        </fieldset>

        <fieldset className="grid gap-1">
          <CardBasedText className='text-gray-700 font-semibold'>
            Control Numbers <span className="text-red-500">*</span>
          </CardBasedText>
          <TagsInput 
            placeholder={
              !formData.total_quantity 
                ? 'Set total quantity first' 
                : targetQuantity === enteredTagsCount 
                  ? 'All control numbers added' 
                  : `Add up to ${targetQuantity} control numbers (press space)`
            }
            value={formData.control_numbers || []}
            onChange={(newTags) => setFormData(prev => ({ ...prev, control_numbers: newTags }))}
            maxTags={targetQuantity}
            disabled={!formData.total_quantity || targetQuantity === 0}
          />
          
          {/* Validation Feedback */}
          {targetQuantity > 0 && enteredTagsCount < targetQuantity && (
            <p className="text-xs text-amber-600 font-semibold mt-1">
              Please enter {targetQuantity - enteredTagsCount} more control number(s) to match total quantity ({enteredTagsCount}/{targetQuantity}).
            </p>
          )}
          {targetQuantity > 0 && enteredTagsCount === targetQuantity && (
            <p className="text-xs text-emerald-600 font-semibold mt-1">
              ✓ All {targetQuantity} unique control numbers added!
            </p>
          )}
          {errors?.control_numbers && (
            <p className="text-xs text-red-500 font-semibold mt-0.5">{errors.control_numbers}</p>
          )}
        </fieldset>
      </div>

      {/* Row 2: Category & Item Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <fieldset className="grid gap-1">
          <CardBasedText className='text-gray-700 font-semibold'>Category</CardBasedText>
          <GeneralInput 
            placeholder='e.g Communication / Rescue / Power'
            value={formData.category}
            onChange={(e) => handleChange("category", e.target.value)}
          />
        </fieldset>
        <fieldset className="grid gap-1">
          <CardBasedText className='text-gray-700 font-semibold'>Item Type</CardBasedText>
          <GeneralInput 
            placeholder='e.g Electronic Equipment'
            value={formData.item_type}
            onChange={(e) => handleChange("item_type", e.target.value)}
          />
        </fieldset>
      </div>

      {/* Row 3: Total Quantity, Available Quantity, Price Each */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <fieldset className="grid gap-1">
          <CardBasedText className='text-gray-700 font-semibold'>
            Total Quantity <span className="text-red-500">*</span>
          </CardBasedText>
          <GeneralInput 
            placeholder='e.g 5'
            value={formData.total_quantity}
            onChange={handleTotalQuantityChange}
            type="text"
            inputMode="numeric"
          />
          {errors?.total_quantity && (
            <p className="text-xs text-red-500 font-semibold mt-0.5">{errors.total_quantity}</p>
          )}
        </fieldset>
        <fieldset className="grid gap-1">
          <CardBasedText className='text-gray-700 font-semibold'>Available Quantity</CardBasedText>
          <GeneralInput 
            placeholder='e.g 5'
            value={formData.available_quantity}
            onChange={(e) => handleNumericChange("available_quantity", e.target.value)}
            type="text"
            inputMode="numeric"
          />
        </fieldset>
        <fieldset className="grid gap-1">
          <CardBasedText className='text-gray-700 font-semibold'>Price Per Unit (₱)</CardBasedText>
          <GeneralInput 
            placeholder='e.g 15000'
            value={formData.price_each}
            onChange={(e) => handleNumericChange("price_each", e.target.value)}
            type="text"
            inputMode="decimal"
          />
        </fieldset>
      </div>

      {/* Row 4: Storage Location */}
      <div className="w-full">
        <fieldset className="grid gap-1">
          <CardBasedText className='text-gray-700 font-semibold'>Storage Location</CardBasedText>
          <GeneralInput 
            placeholder='e.g PDRRMO Warehouse Bay 3'
            value={formData.storage_location}
            onChange={(e) => handleChange("storage_location", e.target.value)}
          />
        </fieldset>
      </div>

      {/* Row 5: Purchased Date & Expiration Date (Shadcn Date Picker) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <fieldset className="grid gap-1">
          <CardBasedText className='text-gray-700 font-semibold'>Purchased Date</CardBasedText>
          <Popover open={purchasedDateOpen} onOpenChange={setPurchasedDateOpen}>
            <PopoverTrigger asChild>
              <button 
                type="button" 
                className={`flex w-full items-center justify-between px-3 py-2 border rounded-lg transition-colors ${purchasedDateObj ? 'text-gray-900 border-gray-300' : 'text-gray-400 border-gray-200'} hover:border-primary/50 focus:ring-2 focus:ring-primary/10`}
              >
                <span className="text-sm">{purchasedDateObj ? format(purchasedDateObj, "PPP") : "Pick purchased date"}</span>
                <CalendarIcon className="size-4 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-white" align="start">
              <Calendar
                mode="single"
                selected={purchasedDateObj}
                onSelect={(date) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    purchased_date: date ? format(date, 'yyyy-MM-dd') : '' 
                  }))
                  setPurchasedDateOpen(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </fieldset>

        <fieldset className="grid gap-1">
          <CardBasedText className='text-gray-700 font-semibold'>Expiration / Maintenance Date</CardBasedText>
          <Popover open={expirationDateOpen} onOpenChange={setExpirationDateOpen}>
            <PopoverTrigger asChild>
              <button 
                type="button" 
                className={`flex w-full items-center justify-between px-3 py-2 border rounded-lg transition-colors ${expirationDateObj ? 'text-gray-900 border-gray-300' : 'text-gray-400 border-gray-200'} hover:border-primary/50 focus:ring-2 focus:ring-primary/10`}
              >
                <span className="text-sm">{expirationDateObj ? format(expirationDateObj, "PPP") : "Pick expiration date"}</span>
                <CalendarIcon className="size-4 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-white" align="start">
              <Calendar
                mode="single"
                selected={expirationDateObj}
                onSelect={(date) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    expiration_date: date ? format(date, 'yyyy-MM-dd') : '' 
                  }))
                  setExpirationDateOpen(false)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </fieldset>
      </div>
    </section>
  )
}
