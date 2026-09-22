"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import GeneralCard from "@/components/cards/GeneralCard"
import CardHeader from "@/components/cards/CardHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import AddItemForms from "@/components/utilities/utilforms/AddItemForms"
import PrimaryButton from "@/components/button/PrimaryButton"
import { Plus, Loader2, AlertCircle } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"

export default function Page() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    item_name: "",
    control_numbers: [],
    category: "",
    item_type: "",
    total_quantity: "",
    available_quantity: "",
    price_each: "",
    storage_location: "",
    purchased_date: "",
    expiration_date: ""
  })

  const targetQuantity = parseInt(formData.total_quantity) || 0
  const enteredControlNumbers = formData.control_numbers || []

  // Valid if item_name, total_quantity, and control_numbers match total_quantity exactly
  const isFormValid = 
    formData.item_name.trim() !== "" &&
    targetQuantity > 0 &&
    enteredControlNumbers.length === targetQuantity

  const validateForm = () => {
    const errs = {}
    setErrorMessage("")

    if (!formData.item_name.trim()) {
      errs.item_name = "Item name is required."
    }
    if (!targetQuantity || targetQuantity <= 0) {
      errs.total_quantity = "Total quantity must be greater than 0."
    }
    if (enteredControlNumbers.length !== targetQuantity) {
      errs.control_numbers = `Please add exactly ${targetQuantity} control numbers (currently ${enteredControlNumbers.length}).`
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      setErrorMessage("Please resolve the error fields before submitting.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage("")

    try {
      const payload = {
        item_name: formData.item_name.trim(),
        control_number: enteredControlNumbers.join(', '),
        category: formData.category ? formData.category.trim() : null,
        item_type: formData.item_type ? formData.item_type.trim() : null,
        total_quantity: targetQuantity,
        available_quantity: parseInt(formData.available_quantity || formData.total_quantity),
        price_each: formData.price_each ? parseFloat(formData.price_each) : null,
        storage_location: formData.storage_location ? formData.storage_location.trim() : null,
        purchased_date: formData.purchased_date || null,
        expiration_date: formData.expiration_date || null
      }

      const { error } = await supabase
        .from('pdrrmo_inventory')
        .insert(payload)

      if (error) {
        console.error("Supabase Error:", error)
        throw error
      }

      // Redirect back to inventory page on success
      router.push('/provincial-admin/utilities/inventory')
    } catch (error) {
      console.error("Error submitting item:", error)
      setErrorMessage(error.message || "Failed to add item to PDRRMO inventory.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="grid gap-5">
      <div className="flex items-center justify-between gap-2">
        <div className="grid">
          <CardHeader className='text-primary'>Add Command Center Item</CardHeader>
          <CardBasedText className='text-gray-500'>Fill out the form below to register new items into PDRRMO Inventory</CardBasedText>
        </div>
        <div>
          <PrimaryButton 
            disabled={!isFormValid || isSubmitting} 
            onClick={handleSubmit}
            className='flex items-center gap-2'
          >
            {isSubmitting ? <Loader2 className="size-5 animate-spin"/> : <Plus className="size-5"/>} 
            <span className="hidden md:block">{isSubmitting ? "Adding..." : "Add Item"}</span>
          </PrimaryButton>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="size-5 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <GeneralCard>
        <AddItemForms formData={formData} setFormData={setFormData} errors={errors} />
      </GeneralCard>
    </section>
  )
}
