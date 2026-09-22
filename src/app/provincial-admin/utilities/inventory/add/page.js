"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import GeneralCard from "@/components/cards/GeneralCard"
import CardHeader from "@/components/cards/CardHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import AddUtilForms from "@/components/utilities/utilforms/AddUtilForms"
import PrimaryButton from "@/components/button/PrimaryButton"
import { Plus, Loader2 } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"

export default function Page() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    quantity: "",
    tags: [],
    description: ""
  })

  // Form is valid if name, type, and quantity are filled, and tags match the quantity exactly
  const isFormValid = 
    formData.name.trim() !== "" &&
    formData.type.trim() !== "" &&
    formData.quantity !== "" &&
    parseInt(formData.quantity) > 0 &&
    formData.tags.length === parseInt(formData.quantity)

  const handleSubmit = async () => {
    if (!isFormValid) return
    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('utilities')
        .insert({
          name: formData.name,
          type: formData.type,
          quantity: parseInt(formData.quantity),
          serial_number: formData.tags.join(', '),
          description: formData.description,
          added_by: user?.id || null
        })

      if (error) throw error

      // Redirect or reset form on success
      router.push('/provincial-admin/utilities/inventory')
    } catch (error) {
      console.error("Error submitting utility:", error)
      alert("Failed to add utility.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="grid gap-5">
        <div className="flex items-center justify-between gap-2">
            <div className="grid ">
                <CardHeader className='text-primary'>Add Your Utilities</CardHeader>
                <CardBasedText className='text-gray-500'>Fill the forms below to add your utilities</CardBasedText>
            </div>
            <div>
                <PrimaryButton 
                  disabled={!isFormValid || isSubmitting} 
                  onClick={handleSubmit}
                  className='flex items-center gap-2'
                >
                  {isSubmitting ? <Loader2 className="size-5 animate-spin"/> : <Plus className="size-5"/>} 
                  <span className="hidden md:block">{isSubmitting ? "Adding..." : "Add Utility"}</span>
                </PrimaryButton>
            </div>
        </div>
        <GeneralCard>
            <AddUtilForms formData={formData} setFormData={setFormData} />
        </GeneralCard>
        
    </section>
  )
}
