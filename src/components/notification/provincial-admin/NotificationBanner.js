"use client"

import { useState, useEffect, useRef } from "react"
import { Trash, MoreVertical, CheckCheck } from "lucide-react"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import { supabase } from "@/supabase/util/supabase"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import CircleSkeleton from "@/components/skeleton/CircleSkeleton"

// Audio player helper for Notification.wav
const playNotificationSound = () => {
  try {
    const audio = new Audio('/sfx/Notification.wav')
    audio.volume = 0.75
    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Safe catch for browser autoplay restrictions before user interaction
        console.log("Notification audio playback notice:", err)
      })
    }
  } catch (err) {
    console.warn("Could not play notification sound:", err)
  }
}

export default function NotificationBanner({ searchTerm, sortOrder }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState(null)
  const hasPlayedInitial = useRef(false)

  const fetchNotifications = async (isRealtime = false) => {
    let query = supabase
      .from('notifications')
      .select('*')
      .in('target_role', ['all', 'provincial_admin'])
      .order('created_at', { ascending: sortOrder === 'asc' })

    if (searchTerm && searchTerm.trim()) {
      query = query.or(`title.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching provincial notifications:", error)
    } else {
      setNotifications(data || [])

      // Play notification audio when notifications are displayed or on real-time arrival
      if (data && data.length > 0) {
        if (!hasPlayedInitial.current || isRealtime) {
          playNotificationSound()
          hasPlayedInitial.current = true
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()

    // Realtime subscription: play sound and refresh on incoming notification
    const channel = supabase
      .channel('provincial_notifications_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        playNotificationSound()
        fetchNotifications(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [searchTerm, sortOrder])

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      
    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } else {
      console.error("Error deleting notification:", error)
    }
    setOpenMenuId(null)
  }

  const handleMarkAsDone = async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (!error) {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    } else {
      console.error("Error marking notification as done:", error)
    }
    setOpenMenuId(null)
  }

  const handleMarkAsUnread = async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: false })
      .eq('id', id)

    if (!error) {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: false } : n))
    } else {
      console.error("Error marking notification as unread:", error)
    }
    setOpenMenuId(null)
  }

  if (loading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <section key={i} className='grid gap-3'>
            <div className="flex items-center gap-2">
              <div className="w-[8px]" />
              
              <div className="flex-1 grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-4 w-full">
                <div className="min-w-0 pr-4 grid gap-1.5">
                  <SingleLineSkeleton className="h-5 w-3/4" />
                  <SingleLineSkeleton className="h-3 w-full" />
                </div>
                
                <div className="flex justify-center min-w-0">
                  <SingleLineSkeleton className="h-8 w-20 rounded-lg" />
                </div>
                
                <div className="flex justify-center min-w-0">
                  <SingleLineSkeleton className="h-4 w-24" />
                </div>
                
                <div className="flex justify-end min-w-[32px]">
                  <CircleSkeleton className="size-6" />
                </div>
              </div>
            </div>
            <hr className="border-gray-200/20"/>
          </section>
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center p-10 text-gray-500 text-sm font-medium">
        No provincial notifications found.
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {notifications.map((notif) => (
        <section key={notif.id} className='grid gap-3 group'>
          <div className="flex items-center gap-2">
            {/* Show red dot if unread (is_read === false) */}
            {!notif.is_read ? (
              <div className="notif-banner2" title="Unread notification"/>
            ) : (
              <div className="w-[8px]" />
            )}
            
            <div className="flex-1 grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-4 w-full">
              <div className="min-w-0 pr-4">
                <CardSubHeader className="break-words whitespace-normal">{notif.title}</CardSubHeader>
                <CardBasedText className='text-gray-500 text-xs break-words whitespace-normal mt-0.5 block'>{notif.message}</CardBasedText>
              </div>
              
              <div className="flex justify-center min-w-0">
                <div className="p-2 rounded-lg bg-gray-100/50 h-fit whitespace-nowrap">
                    <CardBasedText className='text-xs font-semibold text-primary capitalize'>
                      {notif.type || 'System'}
                    </CardBasedText>
                </div>
              </div>
              
              <div className="text-center min-w-0 whitespace-nowrap">
                <CardBasedText className='text-gray-500 text-xs'>
                  {new Date(notif.created_at).toLocaleDateString()}
                </CardBasedText>
              </div>
              
              <div className="flex justify-end min-w-[32px] relative">
                <button 
                  onClick={() => setOpenMenuId(openMenuId === notif.id ? null : notif.id)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                  title="Options"
                >
                  <MoreVertical className="size-4"/>
                </button>
                
                {openMenuId === notif.id && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setOpenMenuId(null)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white/90 backdrop-blur-2xl border border-gray-100 shadow-xl rounded-xl z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      {!notif.is_read ? (
                        <button
                          onClick={() => handleMarkAsDone(notif.id)}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-left transition-colors cursor-pointer text-gray-700 hover:bg-gray-50 font-medium"
                        >
                          <CheckCheck className="size-4 text-emerald-600" />
                          Mark as done
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMarkAsUnread(notif.id)}
                          className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-left transition-colors cursor-pointer text-gray-500 hover:bg-gray-50 font-medium"
                        >
                          <CheckCheck className="size-3.5 text-gray-400" />
                          Mark as unread
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notif.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-left transition-colors cursor-pointer text-red-600 hover:bg-red-50 font-medium"
                      >
                        <Trash className="size-4 text-red-500" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <hr className="border-gray-200/20"/>
        </section>
      ))}
    </div>
  )
}
