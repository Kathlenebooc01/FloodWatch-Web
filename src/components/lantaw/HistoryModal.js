"use client"
import { useState, useEffect } from "react"
import { X, MessageSquare, Trash2 } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"
import WaveLoader from "../loader/WaveLoader"
import FloatingModal from "@/components/Modal/FloatingModal"

export default function HistoryModal({ onClose, onSelectConversation }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirmationId, setDeleteConfirmationId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch interactions for this user ordered by newest
        const { data, error } = await supabase
          .from('ai_chatbot_conversation')
          .select('conversation_id, conversation_title, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Filter to only show unique conversations based on conversation_id
        const uniqueConversations = []
        const seenIds = new Set()
        
        data?.forEach(item => {
            if (!seenIds.has(item.conversation_id)) {
                seenIds.add(item.conversation_id)
                uniqueConversations.push(item)
            }
        })

        setHistory(uniqueConversations)
      } catch (err) {
        console.error("Error fetching history:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [])

  const confirmDelete = async () => {
    if (!deleteConfirmationId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('ai_chatbot_conversation')
        .delete()
        .eq('conversation_id', deleteConfirmationId);
      
      if (error) throw error;
      setHistory(prev => prev.filter(c => c.conversation_id !== deleteConfirmationId));
    } catch (err) {
      console.error("Error deleting conversation:", err);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmationId(null);
    }
  }

  return (
    <>
      <section className="bg-gray-50 h-full absolute w-full top-0 right-0 z-40 p-4 lg:w-1/4 rounded-lg border-l border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-800">Conversation History</h2>
              <button onClick={onClose} className="modal-icon-button transition-colors">
                  <X className="size-4" />
              </button>
          </div>
          
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
              {loading ? (
                  <div className="flex items-center justify-center h-full">
                      <WaveLoader/>
                  </div>
              ) : history.length > 0 ? (
                  history.map((conv) => (
                      <div 
                          key={conv.conversation_id} 
                          onClick={() => {
                              onSelectConversation(conv.conversation_id)
                              onClose()
                          }}
                          className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-100 hover:border-primary/50 cursor-pointer transition-colors group"
                      >
                          <div className="flex items-start gap-3 w-full overflow-hidden">
                              <MessageSquare className="size-4 text-gray-400 mt-0.5 min-w-[16px]" />
                              <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-medium text-gray-700 line-clamp-1">{conv.conversation_title || "New Conversation"}</span>
                                  <span className="text-xs text-gray-400">{new Date(conv.created_at).toLocaleDateString()}</span>
                              </div>
                          </div>
                          <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmationId(conv.conversation_id);
                              }}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                              title="Delete conversation"
                          >
                              <Trash2 className="size-4" />
                          </button>
                      </div>
                  ))
              ) : (
                  <div className="flex items-center justify-center h-full">
                      <span className="text-xs text-gray-400">No history yet</span>
                  </div>
              )}
          </div>
      </section>

      {deleteConfirmationId && (
        <FloatingModal>
          <div className="bg-white rounded-xl p-6 w-[320px] shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-800">Delete Conversation?</h3>
            <p className="text-sm text-gray-500">Are you sure you want to delete this conversation? This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3 mt-2">
              <button 
                onClick={() => setDeleteConfirmationId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center justify-center min-w-[80px] cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </FloatingModal>
      )}
    </>
  )
}
