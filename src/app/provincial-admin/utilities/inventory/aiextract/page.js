"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"
import CardHeader from "@/components/cards/CardHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import PrimaryButton from "@/components/button/PrimaryButton"
import ToogleButtonLayout from "@/components/button/ToogleButtonLayout"
import ToogleButton from "@/components/button/ToogleButton"
import ExtractMainComponents from "@/components/utilities/extract-with-lantaw/ExtractMainComponents"
import { Loader2 } from "lucide-react"

export default function Page() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Shared Inventory")
  const [extractedData, setExtractedData] = useState(null)
  const [cleansingInsight, setCleansingInsight] = useState(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [extractionError, setExtractionError] = useState(null)

  const handleScan = async () => {
    if (!uploadedFile) return

    setIsExtracting(true)
    setExtractedData(null)
    setCleansingInsight(null)
    setExtractionError(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('target_table', activeTab === "Shared Inventory" ? 'utilities' : 'pdrrmo_inventory')

      const response = await fetch('/api/lantaw/extract', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      setIsExtracting(false)
      setIsRendering(true)

      setTimeout(() => {
        if (!response.ok) {
          setExtractionError([result.error || "An unknown error occurred during extraction."])
          setIsRendering(false)
          return
        }

        const dataObj = result.data?.data
        const rawItems = dataObj?.extracted_items || []
        const insight = dataObj?.cleansing_insight || null

        setCleansingInsight(insight)

        if (!rawItems || rawItems.length === 0) {
          setExtractionError([
            insight?.duplicates_removed > 0 || insight?.discarded_invalid > 0
              ? `All ${insight.total_raw || 0} rows in the file were automatically cleansed because they were existing database duplicates or non-inventory text.`
              : "No valid inventory items could be extracted from this file."
          ])
          setExtractedData(null)
          setIsRendering(false)
          return
        }

        // Format clean items
        const formattedData = rawItems.map((item, index) => ({
          ...item,
          id: String(index + 1),
          name: item.name || item.item_name || "",
          item_name: item.item_name || item.name || "",
          type: item.type || item.category || item.item_type || "",
          category: item.category || item.type || item.item_type || "",
          quantity: item.quantity || item.total_quantity || 1,
          total_quantity: item.total_quantity || item.quantity || 1,
          serial_number: item.serial_number || item.control_number || "N/A",
          control_number: item.control_number || item.serial_number || "CTRL-" + (index + 1)
        }))

        setExtractedData(formattedData)
        setExtractionError(null)
        setIsRendering(false)
      }, 800)

    } catch (err) {
      console.error(err)
      setExtractionError([err.message || "Network error. Please try again."])
      setIsExtracting(false)
      setIsRendering(false)
    }
  }

  const handleRetry = () => {
    setExtractedData(null)
    setCleansingInsight(null)
    setExtractionError(null)
    setUploadedFile(null)
  }

  const handleSave = async () => {
    if (!extractedData) return
    setIsSaving(true)
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        setExtractionError(["You must be logged in to save data."])
        setIsSaving(false)
        return
      }

      if (activeTab === "Shared Inventory") {
        // Target: utilities table
        const payload = extractedData.map(({ id, ...rest }) => ({
          name: rest.name || rest.item_name,
          type: rest.type || rest.category || "General",
          quantity: parseInt(rest.quantity || rest.total_quantity) || 1,
          serial_number: rest.serial_number || rest.control_number || "N/A",
          description: rest.description || rest.storage_location || "",
          added_by: user.id
        }))

        const { error } = await supabase
          .from('utilities')
          .insert(payload)

        if (error) {
          console.error("Save error:", error)
          setExtractionError(["Failed to save data to Shared Inventory database."])
          setIsSaving(false)
          return
        }
      } else {
        // Target: pdrrmo_inventory table (Command Center)
        const payload = extractedData.map(({ id, ...rest }, index) => {
          const qty = parseInt(rest.total_quantity || rest.quantity) || 1
          return {
            item_name: rest.item_name || rest.name,
            category: rest.category || rest.type || "Equipment",
            item_type: rest.item_type || rest.type || "Command Asset",
            control_number: rest.control_number || rest.serial_number || `CTRL-AI-${Date.now().toString().slice(-4)}-${index + 1}`,
            total_quantity: qty,
            available_quantity: qty,
            storage_location: rest.storage_location || rest.description || "PDRRMO Command Center",
            price_each: rest.price_each ? parseFloat(rest.price_each) : null,
            purchased_date: rest.purchased_date || null,
            expiration_date: rest.expiration_date || null
          }
        })

        const { error } = await supabase
          .from('pdrrmo_inventory')
          .insert(payload)

        if (error) {
          console.error("Save error:", error)
          setExtractionError(["Failed to save data to Command Center Inventory database."])
          setIsSaving(false)
          return
        }
      }

      router.push('/provincial-admin/utilities/inventory')
    } catch (err) {
      console.error(err)
      setExtractionError(["An unexpected error occurred while saving."])
      setIsSaving(false)
    }
  }

  const hasExtracted = extractedData !== null && !extractionError

  return (
    <section className="grid gap-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <CardHeader className='text-primary'>Import Your List with Lantaw AI</CardHeader>
          <CardBasedText className='text-gray-500'>Upload an existing document or image to automatically extract and register inventory items</CardBasedText>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Target Inventory Toggle */}
          <ToogleButtonLayout>
            <ToogleButton
              active={activeTab === "Shared Inventory"}
              className={activeTab === "Shared Inventory" ? "button-toogle-active" : ""}
              onClick={() => {
                setActiveTab("Shared Inventory")
                setExtractionError(null)
                setCleansingInsight(null)
              }}
            >
              Shared Inventory
            </ToogleButton>
            <ToogleButton
              active={activeTab === "Command Center Inventory"}
              className={activeTab === "Command Center Inventory" ? "button-toogle-active" : ""}
              onClick={() => {
                setActiveTab("Command Center Inventory")
                setExtractionError(null)
                setCleansingInsight(null)
              }}
            >
              Command Center Inventory
            </ToogleButton>
          </ToogleButtonLayout>

          <div>
            {hasExtracted ? (
              <PrimaryButton onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="size-4 animate-spin"/>}
                {isSaving ? "Saving..." : `Save to ${activeTab === "Shared Inventory" ? "Shared" : "Command Center"}`}
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={handleScan} disabled={!uploadedFile || isExtracting}>
                {isExtracting ? "Scanning..." : "Scan"}
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>

      <div>
        <ExtractMainComponents 
          isExtracting={isExtracting}
          isRendering={isRendering}
          extractedData={extractedData}
          cleansingInsight={cleansingInsight}
          extractionError={extractionError}
          onFileChange={setUploadedFile}
          onRetry={handleRetry}
        />
      </div>
    </section>
  )
}
