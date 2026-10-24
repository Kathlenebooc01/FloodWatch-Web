"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import GeneralCard from "@/components/cards/GeneralCard"
import CardHeader from "@/components/cards/CardHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import AddUtilForms from "@/components/utilities/utilforms/AddUtilForms"
import PrimaryButton from "@/components/button/PrimaryButton"
import { Plus, Loader2, Trash2 } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"

export default function Page() {
  const router = useRouter()
  const submittingRef = useRef(false)
  const batchIdRef = useRef(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const emptyUtility = () => ({
    formId: crypto.randomUUID(),
    name: "",
    type: "",
    quantity: "",
    serial_number: "",
    description: ""
  })
  const [utilities, setUtilities] = useState(() => [emptyUtility()])

  const updateUtility = (formId, updater) => {
    batchIdRef.current = null
    setUtilities(previous => previous.map(utility =>
      utility.formId === formId ? updater(utility) : utility
    ))
  }

  const isUtilityValid = (utility) =>
    utility.name.trim() !== "" &&
    utility.type.trim() !== "" &&
    /^[0-9]+$/.test(utility.quantity) &&
    Number.isSafeInteger(Number(utility.quantity)) &&
    Number(utility.quantity) > 0
  const isFormValid = utilities.every(isUtilityValid)

  const handleSubmit = async () => {
    if (submittingRef.current) return
    if (!isFormValid) {
      const invalidIndex = utilities.findIndex(utility => !isUtilityValid(utility))
      setErrorMessage(`Complete the name, type, and a valid positive quantity for Utility ${invalidIndex + 1}.`)
      return
    }
    submittingRef.current = true
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError || new Error("Please sign in before adding utilities.")

      if (!batchIdRef.current) batchIdRef.current = crypto.randomUUID()
      const { error } = await supabase
        .from('utilities')
        .insert(utilities.map((utility, index) => ({
          name: utility.name.trim(),
          type: utility.type.trim(),
          quantity: Number(utility.quantity),
          serial_number: utility.serial_number.trim(),
          description: utility.description,
          added_by: user.id,
          registration_batch_id: batchIdRef.current,
          registration_item_index: index
        })))

      if (error) {
        // The response may have been lost after a successful insert. A retry uses
        // the same batch ID; the unique constraint then prevents duplicate rows.
        const { count, error: lookupError } = await supabase.from('utilities')
          .select('*', { count: 'exact', head: true })
          .eq('registration_batch_id', batchIdRef.current)
          .eq('added_by', user.id)
        if (lookupError || count !== utilities.length) throw error
      }

      setSuccessMessage("All utilities have been added successfully.")
      batchIdRef.current = null
      setUtilities([emptyUtility()])
      setTimeout(() => router.push('/provincial-admin/utilities/inventory'), 1200)
    } catch (error) {
      console.error("Error submitting utilities:", error)
      setErrorMessage(`${error.message || "Failed to add utilities."} If the connection was interrupted, check the inventory before editing or retrying.`)
    } finally {
      submittingRef.current = false
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
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
            {errorMessage}
          </div>
        )}
        {successMessage && <div role="status" className="p-3.5 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl font-medium">{successMessage}</div>}
        {utilities.map((utility, index) => (
          <GeneralCard key={utility.formId}>
            {utilities.length > 1 && <div className="mb-4 flex items-center justify-between">
              <CardBasedText className="font-semibold text-gray-700">Utility {index + 1}</CardBasedText>
              {index > 0 && <button type="button" disabled={isSubmitting} onClick={() => { batchIdRef.current = null; setUtilities(previous => previous.filter(item => item.formId !== utility.formId)) }} className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"><Trash2 className="size-3.5" />Remove</button>}
            </div>}
            <AddUtilForms formData={utility} setFormData={(updater) => updateUtility(utility.formId, updater)} />
            {!isUtilityValid(utility) && (utility.name || utility.type || utility.quantity || utility.serial_number || utility.description) &&
              <p className="mt-2 text-xs text-red-600">Utility {index + 1} needs a name, type, and positive whole-number quantity before saving.</p>}
          </GeneralCard>
        ))}
        <button type="button" disabled={isSubmitting} onClick={() => { batchIdRef.current = null; setUtilities(previous => [...previous, emptyUtility()]) }} className="flex w-fit items-center gap-1 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50">
          <Plus className="size-4" /> Add Another Utility
        </button>
        
    </section>
  )
}
