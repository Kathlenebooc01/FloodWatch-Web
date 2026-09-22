"use client"
import { useState, useEffect, useRef } from "react"
import { v4 as uuidv4 } from "uuid"
import GeneralCard from "../cards/GeneralCard"
import CardBasedText from "../cards/CardBasedText"
import SecondaryButton from "../button/SecondaryButton"
import { Origami, MessageCircle } from "lucide-react"
import BodyChat from "./BodyChat"
import HistoryModal from "./HistoryModal"
import InputPrompt from "./InputPrompt"
import { supabase } from "@/supabase/util/supabase"

export default function MainChat() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [conversationTitle, setConversationTitle] = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const [userName, setUserName] = useState("")
  const [userId, setUserId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
          
        setUserName(profile?.full_name || "User")
      }
    }
    fetchUser()
  }, [])

  const handleSend = async (userPrompt) => {
    if (!userPrompt.trim() || isLoading) return

    // Start a new conversation if none exists
    const currentConvoId = conversationId || uuidv4()
    if (!conversationId) setConversationId(currentConvoId)

    // Add user message to the chat
    const userMessage = { role: 'user', content: userPrompt.trim() }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const res = await fetch('/api/lantaw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt.trim(),
          conversationId: currentConvoId,
          userId: userId,
        })
      })

      const data = await res.json()

      if (res.ok) {
        const aiMessage = { role: 'assistant', content: data.response }
        setMessages(prev => [...prev, aiMessage])

        // Set title from first prompt
        if (!conversationTitle) {
          const title = userPrompt.trim().substring(0, 80)
          setConversationTitle(title.length >= 80 ? title + "..." : title)
        }
      } else {
        const errorMessage = { role: 'assistant', content: data.error || "Something went wrong. Please try again." }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (err) {
      console.error("Failed to reach Lantaw API:", err)
      const errorMessage = { role: 'assistant', content: "Unable to connect to Lantaw. Please check your network connection." }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const loadConversation = async (convoId) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('ai_chatbot_conversation')
        .select('*')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        setConversationId(convoId)
        setConversationTitle(data[0].conversation_title || "Chat with Lantaw")
        
        // Reconstruct messages array from the flat database rows
        const reconstructedMessages = []
        data.forEach(row => {
          if (row.user_prompt) {
            reconstructedMessages.push({ role: 'user', content: row.user_prompt })
          }
          if (row.ai_output) {
            reconstructedMessages.push({ role: 'assistant', content: row.ai_output })
          }
        })
        
        setMessages(reconstructedMessages)
      }
    } catch (err) {
      console.error("Failed to load conversation:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <GeneralCard className='py-0 px-0 relative w-full min-w-0 overflow-hidden border-none'>
        <div className="lantaw-chat-header">
            <div className="flex items-center gap-2">
                <div className="summary-data-icon">
                <Origami className="size-5"/>
                </div>
                <CardBasedText className='font-semibold'>{conversationTitle || "Chat with Lantaw"}</CardBasedText>

            </div>
            <div>
                <SecondaryButton onClick={() => setIsHistoryOpen(true)}>
                    <MessageCircle className="size-4"/>
                    <CardBasedText className='text-xs hidden lg:block'>History</CardBasedText>
                </SecondaryButton>
            </div>
        </div>
        <BodyChat messages={messages} userName={userName} isLoading={isLoading} />
        <InputPrompt onSend={handleSend} isLoading={isLoading} />
        {isHistoryOpen && <HistoryModal onClose={() => setIsHistoryOpen(false)} onSelectConversation={loadConversation} />}
    </GeneralCard>
  )
}

