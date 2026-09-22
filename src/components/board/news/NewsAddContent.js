"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabase/util/supabase"
import CardBasedText from "@/components/cards/CardBasedText"
import CardSubHeader from "@/components/cards/CardSubHeader"
import TextArea from "@/components/forms/TextArea"
import FileInput from "@/components/forms/FileInput"
import GeneralInput from "@/components/forms/GeneralInput"
import TagsInput from "@/components/forms/TagsInput"
import SecondaryButton from "@/components/button/SecondaryButton"
import { Origami } from "lucide-react"
import NewsPromptAssist from "./NewsPromptAssist"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import NewsEditHeader from "./NewsEditHeader"

export default function NewsAddContent() {
  const router = useRouter()
  const [isAssistOpen, setIsAssistOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Form state for fields that Lantaw can fill
  const [headline, setHeadline] = useState("")
  const [tag, setTag] = useState([])
  const [referenceLink, setReferenceLink] = useState("")
  const [detailedContent, setDetailedContent] = useState("")
  const [author, setAuthor] = useState("")
  const [userId, setUserId] = useState(null)
  const [coverFile, setCoverFile] = useState(null)

  // Fetch logged-in user's name
  useEffect(() => {
    const fetchAuthor = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single()
        
        if (data?.full_name) {
          setAuthor(data.full_name)
        }
      }
    }
    fetchAuthor()
  }, [])

  // Capture the selected cover image from FileInput (images only)
  const handleCoverChange = (e) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setCoverFile(file)
    }
  }

  // Handle saving to database
  const handlePublish = async () => {
    if (!headline.trim() || !detailedContent.trim()) {
      alert("Please fill in the headline and detailed content.")
      return
    }
    if (!userId) {
      alert("You must be logged in to publish.")
      return
    }

    setIsPublishing(true)
    try {
      // Upload the cover image to the private bucket
      let coverImageUrl = null
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop()
        const filePath = `${userId}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('news-cover')
          .upload(filePath, coverFile, {
            contentType: coverFile.type,
          })

        if (uploadError) {
          console.error("[STORAGE UPLOAD] failed:", uploadError.message, uploadError)
          throw uploadError
        }

        // Private bucket: getPublicUrl returns a link that 403s, so create a
        // signed URL the news board can actually load.
        const { data: signedData, error: signedError } = await supabase.storage
          .from('news-cover')
          .createSignedUrl(filePath, 60 * 60 * 24 * 365) // valid for 1 year

        if (signedError) {
          console.error("[SIGNED URL] failed:", signedError.message, signedError)
          throw signedError
        }

        coverImageUrl = signedData.signedUrl
      }

      const { error } = await supabase.from('news_board').insert({
        headline: headline,
        tags: tag, // already an array from TagsInput
        profile_id: userId,
        external_reference_link: referenceLink,
        detailed_content: detailedContent,
        cover_image: coverImageUrl,
      })

      if (error) {
        console.error("[NEWS_BOARD INSERT] failed:", error.message, error)
        throw error
      }

      router.push("/provincial-admin/board/news")
    } catch (err) {
      console.error("[PUBLISH] aborted:", err?.message, err)
    } finally {
      setIsPublishing(false)
    }
  }

  // Handler for when Lantaw generates content
  const handleAssistGenerate = (generatedFields) => {
    if (generatedFields.headline && !headline.trim()) setHeadline(generatedFields.headline)
    if (generatedFields.tag && tag.length === 0) setTag([generatedFields.tag])
    if (generatedFields.referenceLink && !referenceLink.trim()) setReferenceLink(generatedFields.referenceLink)
    if (generatedFields.detailedContent && !detailedContent.trim()) setDetailedContent(generatedFields.detailedContent)
    setIsAssistOpen(false)
    setIsGenerating(false)
  }

  return (
    <>
      <NewsEditHeader
        onPublish={handlePublish}
        isLoading={isPublishing}
        disabled={!headline.trim() || !detailedContent.trim()}
      />
      <section className="grid gap-5">
          
          <fieldset className="grid gap-3">
            <CardSubHeader>Cover Photo</CardSubHeader>
            <FileInput accept="image/*" onChange={handleCoverChange} />
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
        <fieldset>
            <CardSubHeader>Headline</CardSubHeader>
            {isGenerating && !headline.trim() ? (
              <div className="input-layout"><SingleLineSkeleton /></div>
            ) : (
              <GeneralInput 
                placeholder="Add headline" 
                value={headline} 
                onChange={(e) => setHeadline(e.target.value)}
              />
            )}
        </fieldset>
        <fieldset>
            <CardSubHeader className='flex items-center gap-1'>Tags <span className="text-xs text-gray-500">(can be multiple)</span></CardSubHeader>
            {isGenerating && tag.length === 0 ? (
              <div className="input-layout"><SingleLineSkeleton /></div>
            ) : (
              <TagsInput 
                placeholder="Add tags" 
                value={tag} 
                onChange={(newTags) => setTag(newTags)}
              />
            )}
        </fieldset>
        
        </div>
        <div className="grid grid-cols-2 gap-2">
        <fieldset>
            <CardSubHeader>Reference Link</CardSubHeader>
            {isGenerating && !referenceLink.trim() ? (
              <div className="input-layout"><SingleLineSkeleton /></div>
            ) : (
              <GeneralInput 
                placeholder="https://example.com" 
                value={referenceLink} 
                onChange={(e) => setReferenceLink(e.target.value)}
              />
            )}
        </fieldset>
        <fieldset>
            <CardSubHeader className='flex items-center gap-1'>Author</CardSubHeader>
            <GeneralInput 
              placeholder="Name of the author" 
              value={author} 
              disabled 
            />
        </fieldset>
        
        </div>
        <div>
            <fieldset className="grid gap-3">
                <div className="flex items-center justify-between">
                <CardSubHeader>Detailed Content</CardSubHeader>
                <SecondaryButton 
                  className='rounded-full p-2 hover:bg-primary/5 transition-colors'
                  onClick={(e) => { e.preventDefault(); setIsAssistOpen(true); }}
                >
                  <span className="summary-data-icon"><Origami className="size-4"/></span> 
                  <CardBasedText className="font-semibold text-primary">Let Lantaw Help</CardBasedText>
                </SecondaryButton>
                </div>
                {isGenerating && !detailedContent.trim() ? (
                  <div className="input-layout grid gap-2 py-4">
                    <SingleLineSkeleton />
                    <SingleLineSkeleton />
                    <SingleLineSkeleton />
                    <SingleLineSkeleton />
                  </div>
                ) : (
                  <TextArea 
                    placeholder="Write detailed content here..." 
                    value={detailedContent} 
                    onChange={(e) => setDetailedContent(e.target.value)}
                  />
                )}
            </fieldset>
        </div>

        <NewsPromptAssist 
          isOpen={isAssistOpen} 
          onClose={() => { setIsAssistOpen(false); setIsGenerating(false); }} 
          onGenerate={handleAssistGenerate}
          onGenerateStart={() => { setIsAssistOpen(false); setIsGenerating(true); }}
          existingFields={{ headline, tag, referenceLink, detailedContent }}
        />
      </section>
    </>
  )
}
