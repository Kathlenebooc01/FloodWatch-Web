import FileInput from "@/components/forms/FileInput"
import CardBasedText from "@/components/cards/CardBasedText"

export default function LantawExtractForms({ onFileChange, disabled }) {
  
  const handleChange = (e) => {
    const file = e.target.files?.[0] || null
    if (onFileChange) {
      onFileChange(file)
    }
  }

  return (
    <section>
        <fieldset className="grid gap-2" disabled={disabled}>
            <CardBasedText className="text-gray-500 font-semibold">Upload Your File</CardBasedText>
            <FileInput 
              onChange={handleChange}
              subLabel="Drag & drop your file here (PDF, DOCX, XLSX, CSV, PNG, JPG up to 10MB)"
            />
        </fieldset>
    </section>
  )
}
