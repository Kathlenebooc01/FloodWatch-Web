"use client"
import { useEffect, useRef } from "react"
import { Origami } from "lucide-react"
import LantawMessageBox from "./LantawMessageBox"
import UserMessageBox from "./UserMessageBox"
import WaveLoader from "../loader/WaveLoader"

export default function BodyChat({ messages = [], userName = "User", isLoading = false }) {
  const bottomRef = useRef(null)

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <section className='min-h-[55vh] lg:min-h-[63vh] max-h-[70vh] p-4 overflow-y-auto overflow-x-hidden w-full min-w-0 flex flex-col gap-4'>
      {messages.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center flex-1 my-auto opacity-70 mt-10">
            <div className="w-16 h-16">
                <WaveLoader/>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Hello {userName}</h2>
            <p className="text-sm text-gray-500 mt-2">How can Lantaw assist you today?</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {messages.map((msg, index) => {
            // Find if this is the latest AI message
            const isLastAi = msg.role === 'assistant' && 
              index === messages.map((m, i) => m.role === 'assistant' ? i : -1).filter(i => i !== -1).pop()

            return msg.role === 'user' ? 
            <UserMessageBox key={index}>{msg.content}</UserMessageBox> :
            <LantawMessageBox key={index} isNew={isLastAi}>{msg.content}</LantawMessageBox>
          })}
          {isLoading && (
            <section className="flex items-center gap-2">
              <div className="summary-data-icon shrink-0">
                <Origami className="size-4"/>
              </div>
              <div className="w-12">
                <WaveLoader />
              </div>
            </section>
          )}
        </div>
      )}
      <div ref={bottomRef} />
    </section>
  )
}

