"use client"
import { useState, useEffect } from "react"
import CardBasedText from "../cards/CardBasedText"
import CardSubHeader from "../cards/CardSubHeader"
import { X, CheckCircle2, XCircle, FileImage, ChevronLeft, ChevronRight, Sparkles, Loader2 } from "lucide-react"
import SideModal from "../Modal/SideModal"
import { supabase } from "@/supabase/util/supabase"
import SingleLineSkeleton from "../skeleton/SingleLineSkeleton"
import SquareSkeleton from "../skeleton/SquareSkeleton"

export default function VerificationTableModal({ data, onClose, onStatusUpdate }) {
  const [imageError, setImageError] = useState(false)
  const [userName, setUserName] = useState("Loading...")
  const [isLoading, setIsLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [aiLoading, setAiLoading] = useState(false)
  const [decisionLoading, setDecisionLoading] = useState(false)
  const [decisionError, setDecisionError] = useState(null)
  const [status, setStatus] = useState(data?.status || 'pending')
  const [aiResult, setAiResult] = useState({
    ai_is_valid: data?.ai_is_valid ?? null,
    ai_confidence_score: data?.ai_confidence_score ?? null,
    ai_insight: data?.ai_insight || null
  })

  // Reset image carousel state and ai state when the selected row changes
  useEffect(() => {
    setCurrentImageIndex(0)
    setImageError(false)
    setStatus(data?.status || 'pending')
    setDecisionError(null)
    setAiResult({
      ai_is_valid: data?.ai_is_valid ?? null,
      ai_confidence_score: data?.ai_confidence_score ?? null,
      ai_insight: data?.ai_insight || null
    })
  }, [data?.id_verification_id])

  const images = [
    { url: data?.id_image_url, label: "ID Image" },
    { url: data?.selfie_url, label: "Selfie Image" }
  ].filter(img => img.url)

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    setImageError(false)
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
    setImageError(false)
  }

  useEffect(() => {
    async function fetchUserName() {
      setIsLoading(true)
      if (!data?.user_id) {
        setUserName("Unknown")
        setIsLoading(false)
        return
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.user_id)
        .single()

      if (profile?.full_name) {
        setUserName(profile.full_name)
      } else {
        setUserName("Unknown")
      }
      setIsLoading(false)
    }
    fetchUserName()
  }, [data?.user_id])

  const runAiVerification = async () => {
    if (aiLoading || !data) return;
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/lantaw/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({
          id_verification_id: data.id_verification_id
        })
      });
      const resData = await res.json();
      if (resData?.ai_insight) {
        setAiResult({
          ai_is_valid: resData.ai_is_valid,
          ai_confidence_score: resData.ai_confidence_score,
          ai_insight: resData.ai_insight
        });
        if (onStatusUpdate) onStatusUpdate();
      }
    } catch (err) {
      console.error("AI verification failed:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const decide = async (decision) => {
    if (decisionLoading) return;
    setDecisionLoading(true);
    setDecisionError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in to review this request.');
      const response = await fetch('/api/verification/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id_verification_id: data.id_verification_id, decision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save decision.');
      setStatus(result.verification.status);
      window.dispatchEvent(new Event('verification_status_updated'));
      onStatusUpdate?.();
    } catch (error) {
      setDecisionError(error.message);
    } finally {
      setDecisionLoading(false);
    }
  };

  // Automatically trigger AI verification if never run before
  useEffect(() => {
    if (data?.id_verification_id && !data?.ai_insight && !aiResult?.ai_insight && !aiLoading) {
      runAiVerification();
    }
  }, [data?.id_verification_id]);

  if (!data) return null;

  return (
    <SideModal className="z-50">
      <div className="p-6 flex flex-col h-full bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 shrink-0">
          <CardSubHeader>Verification Details</CardSubHeader>
          <button onClick={onClose} className="modal-icon-button">
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          
          {/* User Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">User Information</h4>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
              <div>
                <CardBasedText className="text-xs text-gray-500 mb-1">User Name</CardBasedText>
                {isLoading ? <div className="w-32 mt-1"><SingleLineSkeleton /></div> : <div className="font-medium text-sm text-gray-800">{userName}</div>}
              </div>
              <div className="overflow-hidden">
                <CardBasedText className="text-xs text-gray-500 mb-1">User ID</CardBasedText>
                {isLoading ? <div className="w-24 mt-1"><SingleLineSkeleton /></div> : <div className="font-medium text-xs text-gray-800 truncate" title={data.user_id}>{data.user_id}</div>}
              </div>
            </div>
          </div>

          {/* ID Details */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">ID Details</h4>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl mb-4">
              <div>
                <CardBasedText className="text-xs text-gray-500 mb-1">ID Type</CardBasedText>
                {isLoading ? <div className="w-24 mt-1"><SingleLineSkeleton /></div> : <div className="font-medium text-sm text-gray-800">{data.id_type}</div>}
              </div>
              <div className="overflow-hidden">
                <CardBasedText className="text-xs text-gray-500 mb-1">Verification ID</CardBasedText>
                {isLoading ? <div className="w-32 mt-1"><SingleLineSkeleton /></div> : <div className="font-medium text-xs text-gray-800 truncate" title={data.id_verification_id}>{data.id_verification_id}</div>}
              </div>
              <div>
                <CardBasedText className="text-xs text-gray-500 mb-1">Submitted At</CardBasedText>
                {isLoading ? <div className="w-32 mt-1"><SingleLineSkeleton /></div> : <div className="font-medium text-sm text-gray-800">{new Date(data.submitted_at).toLocaleString()}</div>}
              </div>
              <div>
                <CardBasedText className="text-xs text-gray-500 mb-1">Status</CardBasedText>
                {isLoading ? <div className="w-20 mt-1"><SingleLineSkeleton /></div> : (() => {
                  const isApproved = ['verified', 'approved'].includes(status?.toLowerCase());
                  const isPending = status?.toLowerCase() === 'pending';
                  const displayStatus = isApproved ? 'Approved' : isPending ? 'Pending Admin Approval' : 'Rejected';
                  return (
                    <div className={`font-semibold text-sm ${isApproved ? 'text-green-500' : isPending ? 'text-amber-500' : 'text-red-500'}`}>
                      {displayStatus}
                    </div>
                  );
                })()}
              </div>
              <div>
                <CardBasedText className="text-xs text-gray-500 mb-1">Read Status</CardBasedText>
                {isLoading ? <div className="w-16 mt-1"><SingleLineSkeleton /></div> : <div className="font-medium text-sm text-gray-800">{data.is_read ? 'Read' : 'Unread'}</div>}
              </div>
              {data.reviewed_by && (
                <div className="overflow-hidden">
                  <CardBasedText className="text-xs text-gray-500 mb-1">Reviewed By</CardBasedText>
                  {isLoading ? <div className="w-24 mt-1"><SingleLineSkeleton /></div> : <div className="font-medium text-xs text-gray-800 truncate" title={data.reviewed_by}>{data.reviewed_by}</div>}
                </div>
              )}
            </div>

            {/* Image Carousel */}
            {isLoading ? (
              <div className="rounded-xl overflow-hidden h-48 w-full bg-gray-100 border border-gray-200">
                 <SquareSkeleton />
              </div>
            ) : images.length > 0 ? (
              <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-100 group min-h-48">
                {/* Header label for current image */}
                <div className="absolute top-0 left-0 right-0 bg-black/50 text-white text-xs font-medium px-3 py-1.5 text-center z-10 backdrop-blur-sm">
                  {images[currentImageIndex].label}
                </div>
                
                {imageError ? (
                  <div className="flex flex-col items-center justify-center h-48">
                    <FileImage className="size-10 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Image failed to load</span>
                  </div>
                ) : (
                  <img
                    src={images[currentImageIndex].url}
                    alt={images[currentImageIndex].label}
                    className="w-full h-auto object-contain max-h-72"
                    onError={() => setImageError(true)}
                  />
                )}

                {/* Carousel Controls */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-1.5 rounded-full shadow-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-1.5 rounded-full shadow-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                    
                    {/* Dots indicator */}
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
                      {images.map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'w-4 bg-blue-500' : 'w-1.5 bg-white/60'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-100 flex flex-col items-center justify-center h-48">
                <FileImage className="size-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">No Images Available</span>
              </div>
            )}
          </div>

          {/* AI Insights */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="size-4 text-blue-500" />
                Lantaw AI Verification
              </h4>
              <button
                type="button"
                onClick={runAiVerification}
                disabled={aiLoading}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3" />
                    <span>Re-Analyze with AI</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-gradient-to-br from-blue-50/50 via-gray-50 to-white p-4 rounded-xl border border-blue-100/60 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardBasedText className="text-xs text-gray-500 mb-1 font-medium">AI Validity Check</CardBasedText>
                  {aiLoading ? (
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <Loader2 className="size-3.5 animate-spin" /> Lantaw AI is scanning document...
                    </div>
                  ) : isLoading ? (
                    <div className="w-24 mt-1"><SingleLineSkeleton /></div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {aiResult.ai_is_valid === true ? (
                        <><CheckCircle2 className="size-4 text-emerald-500" /><span className="text-sm font-semibold text-emerald-600">Valid Format</span></>
                      ) : aiResult.ai_is_valid === false ? (
                        <><XCircle className="size-4 text-red-500" /><span className="text-sm font-semibold text-red-600">Flagged Format</span></>
                      ) : <span className="text-sm text-gray-500">Awaiting analysis</span>}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <CardBasedText className="text-xs text-gray-500 mb-1 font-medium">Confidence Score</CardBasedText>
                  {aiLoading ? (
                    <div className="w-16 mt-1 ml-auto"><SingleLineSkeleton /></div>
                  ) : isLoading ? (
                    <div className="w-16 mt-1 ml-auto"><SingleLineSkeleton /></div>
                  ) : (
                    <div className="text-lg font-bold text-gray-800">
                      {aiResult.ai_confidence_score != null ? `${Number(aiResult.ai_confidence_score).toFixed(0)}%` : 'Awaiting analysis'}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200/80">
                <CardBasedText className="text-xs text-gray-500 mb-1 font-medium">AI Assessment Insight</CardBasedText>
                {aiLoading ? (
                  <div className="w-full mt-2"><SingleLineSkeleton /></div>
                ) : isLoading ? (
                  <div className="w-full mt-1"><SingleLineSkeleton /></div>
                ) : (
                  <p className="text-xs text-gray-700 italic mt-1 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-gray-100">
                    &ldquo;{aiResult.ai_insight || data.ai_insight || 'Awaiting AI assessment.'}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 flex flex-wrap justify-end gap-2 shrink-0">
          {decisionError && <p role="alert" className="w-full text-xs text-red-600">{decisionError}</p>}
          {status?.toLowerCase() === 'pending' && <>
            <button type="button" disabled={decisionLoading} onClick={() => decide('rejected')} className="px-5 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl disabled:opacity-50">Reject</button>
            <button type="button" disabled={decisionLoading} onClick={() => decide('approved')} className="px-5 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl disabled:opacity-50">Approve</button>
          </>}
          <button
            type="button"
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer text-center"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </SideModal>
  )
}
