import LantawExtractForms from "../utilforms/LantawExtractForms"
import ExtractedTable from "../tables/ExtractedTable"
import ExtractSummaryDetails from "../summary/ExtractSummaryDetails"
import LantawExtractLoader from "./LantawExtractLoader"
import GeneralCard from "@/components/cards/GeneralCard"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import { CircleAlert, RotateCcw, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react"

export default function ExtractMainComponents({ 
  isExtracting, 
  isRendering, 
  extractedData, 
  cleansingInsight,
  extractionError, 
  onFileChange, 
  onRetry 
}) {

  // Show the loader while Lantaw is extracting
  if (isExtracting) {
    return (
      <section className="grid gap-5">
        <LantawExtractForms onFileChange={onFileChange} disabled />
        <LantawExtractLoader />
      </section>
    )
  }

  return (
    <section className="grid gap-5">
      <LantawExtractForms onFileChange={onFileChange} />

      {/* Show error if extraction failed completely */}
      {extractionError && (
        <GeneralCard className="border border-red-200 bg-red-50/50">
          <div className="flex items-start gap-3">
            <div className="bg-red-500/10 p-2 rounded-full shrink-0 mt-0.5">
              <CircleAlert className="size-5 text-red-500" />
            </div>
            <div className="grid gap-2 flex-1">
              <CardSubHeader className="text-red-600">Extraction Issue — Check File Format</CardSubHeader>
              <CardBasedText className="text-red-500/80">
                Lantaw encountered issues while analyzing the file:
              </CardBasedText>
              <ul className="grid gap-1 mt-1">
                {extractionError.map((err, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-red-500">
                    <span className="size-1.5 bg-red-400 rounded-full shrink-0"></span>
                    {err}
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <button 
                  onClick={onRetry} 
                  className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  <RotateCcw className="size-4" />
                  Try again with a different file
                </button>
              </div>
            </div>
          </div>
        </GeneralCard>
      )}

      {/* Lantaw AI Cleansing Insight Banner */}
      {cleansingInsight && (cleansingInsight.duplicates_removed > 0 || cleansingInsight.discarded_invalid > 0) && (
        <GeneralCard className="border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/30">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-full shrink-0 mt-0.5">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div className="grid gap-1.5 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardSubHeader className="text-primary font-bold">Lantaw AI Dataset Cleansing Complete</CardSubHeader>
                  <ShieldCheck className="size-4 text-emerald-600" />
                </div>
                <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-[11px] font-extrabold rounded-full">
                  {extractedData?.length || 0} Clean Records Extracted
                </span>
              </div>
              <CardBasedText className="text-gray-600 text-xs">
                Lantaw AI analyzed {cleansingInsight.total_raw} raw rows: automatically removed <strong>{cleansingInsight.duplicates_removed} duplicate records</strong> (matching existing database items or internal file duplicates), discarded <strong>{cleansingInsight.discarded_invalid} invalid/header rows</strong>, and prepared <strong>{extractedData?.length || 0} clean unique records</strong> below.
              </CardBasedText>

              {cleansingInsight.reasons && cleansingInsight.reasons.length > 0 && (
                <details className="mt-1 text-xs text-gray-500 cursor-pointer">
                  <summary className="font-semibold text-primary/80 hover:text-primary transition-colors">
                    View cleansing breakdown ({cleansingInsight.reasons.length} actions)
                  </summary>
                  <ul className="grid gap-1.5 mt-2.5 pl-2 border-l-2 border-primary/20">
                    {cleansingInsight.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </GeneralCard>
      )}

      {/* Only show results after extraction is complete */}
      {(extractedData || isRendering) && !extractionError && (
        <div className="grid gap-3">
          <ExtractSummaryDetails 
            totalItems={extractedData ? extractedData.length : 0}
            isRendering={isRendering}
          />
          <ExtractedTable 
            data={extractedData} 
            isRendering={isRendering} 
          />
        </div>
      )}
    </section>
  )
}
