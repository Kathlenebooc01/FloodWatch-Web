"use client"
import { useState } from "react"
import FloatingModal from "@/components/Modal/FloatingModal"
import GeneralCard from "@/components/cards/GeneralCard"
import CardHeader from "@/components/cards/CardHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import { format } from "date-fns"
import { X, Trash, Calendar as CalendarIcon, Tag, AlertCircle } from "lucide-react"
import { supabase } from "@/supabase/util/supabase"

export default function ViewEventModal({ isOpen, onClose, event, onRefresh }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen || !event) return null;

  const handleDelete = async () => {
      // Optional browser confirm; can remove if you want instant delete
      const confirmDelete = window.confirm("Are you sure you want to delete this event?");
      if (!confirmDelete) return;

      setIsDeleting(true);
      setError("");

      try {
          const { error: deleteError } = await supabase
            .from('scheduled_events')
            .delete()
            .eq('event_id', event.event_id);

          if (deleteError) throw deleteError;

          if (onRefresh) onRefresh();
          onClose();
      } catch (err) {
          console.error(err);
          setError("Failed to delete event. Please try again.");
      } finally {
          setIsDeleting(false);
      }
  }

  const formatTimeDisplay = (timeString) => {
      if (!timeString) return "All Day";
      const [h, m] = timeString.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${m} ${ampm}`;
  }

  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
        case 'critical': return 'text-red-700 bg-red-50 border-red-200';
        case 'high': return 'text-amber-700 bg-amber-50 border-amber-200';
        case 'low': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
        case 'medium':
        default: return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  }

  return (
    <FloatingModal>
        <GeneralCard className="w-full max-w-md p-0 overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-gray-50/80">
                <div className="flex-1 pr-4">
                    <div className="flex items-center gap-3 mb-1">
                        <CardHeader className="text-xl leading-tight font-black text-gray-800">{event.title}</CardHeader>
                        <button 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors focus:ring-2 focus:ring-red-100"
                            title="Delete Event"
                        >
                            <Trash className="size-4" />
                        </button>
                    </div>
                    <CardBasedText className="text-gray-400 text-xs font-semibold">
                        Added on {event.created_at ? format(new Date(event.created_at), 'MMMM dd, yyyy') : 'Unknown'}
                    </CardBasedText>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"
                >
                    <X className="size-5" />
                </button>
            </div>

            {/* Body */}
            <div className="p-6 grid gap-6 bg-white">
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-semibold p-3 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="grid gap-5">
                    {/* Date & Time */}
                    <div className="flex items-start gap-3.5">
                        <div className="p-2.5 bg-gray-50 text-gray-400 rounded-xl border border-gray-100 shadow-sm">
                            <CalendarIcon className="size-5" />
                        </div>
                        <div className="pt-0.5">
                            <CardBasedText className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Date & Time</CardBasedText>
                            <p className="text-sm font-bold text-gray-800">
                                {format(new Date(event.start_date), 'MMMM dd, yyyy')}
                                {event.end_date && event.end_date !== event.start_date ? ` - ${format(new Date(event.end_date), 'MMMM dd, yyyy')}` : ''}
                            </p>
                            <p className="text-xs font-semibold text-gray-500 mt-1">
                                {formatTimeDisplay(event.start_time)}
                                {event.end_time ? ` to ${formatTimeDisplay(event.end_time)}` : ''}
                            </p>
                        </div>
                    </div>

                    {/* Metadata Tags */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-bold text-gray-600 shadow-sm">
                            <Tag className="size-3.5 opacity-70" />
                            {event.event_type}
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold shadow-sm ${getPriorityColor(event.priority_level)}`}>
                            <AlertCircle className="size-3.5 opacity-70" />
                            {event.priority_level} Priority
                        </div>
                    </div>

                    {/* Description */}
                    {event.description && (
                        <div className="mt-1 bg-gray-50 border border-gray-200 p-4 rounded-xl shadow-inner">
                            <CardBasedText className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Description</CardBasedText>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                                {event.description}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </GeneralCard>
    </FloatingModal>
  )
}
