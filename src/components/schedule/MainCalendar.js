"use client"
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import CardBasedText from "@/components/cards/CardBasedText";
import GeneralCard from "@/components/cards/GeneralCard";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, addMonths, subMonths, isSameMonth, isToday } from "date-fns";
import { supabase } from "@/supabase/util/supabase";
import AddEventModal from "./AddEventModal";
import ViewEventModal from "./ViewEventModal";

export default function MainCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState(null);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calendar Math using date-fns
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const fetchEvents = async () => {
    // Fetch events overlapping with the visible calendar grid
    const { data, error } = await supabase
      .from('scheduled_events')
      .select('*')
      .gte('start_date', format(startDate, 'yyyy-MM-dd'))
      .lte('start_date', format(endDate, 'yyyy-MM-dd'));
      
    if (!error && data) {
      setEvents(data);
    }
  };

  useEffect(() => {
    fetchEvents();
    
    // Subscribe to realtime updates on scheduled_events
    const channel = supabase
      .channel('calendar-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, [currentMonth]); // refetch when month changes

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
        case 'critical':
            return 'bg-red-50 border-red-200 text-red-700 shadow-red-500/10';
        case 'high':
            return 'bg-amber-50 border-amber-200 text-amber-700 shadow-amber-500/10';
        case 'low':
            return 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-500/10';
        case 'medium':
        default:
            return 'bg-blue-50 border-blue-200 text-blue-700 shadow-blue-500/10';
    }
  }

  return (
    <>
      <GeneralCard className="p-0 overflow-hidden border border-gray-200">
        {/* Calendar Header */}
        <div className="p-5 md:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between bg-white gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">{format(currentMonth, 'MMMM yyyy')}</h2>
            <CardBasedText className="text-gray-500 text-xs md:text-sm font-medium mt-1">Resource Schedule and Dispatch Timeline</CardBasedText>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 transition-colors border-r border-gray-200 group">
                  <ChevronLeft className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors" />
              </button>
              <button onClick={goToToday} className="px-5 py-2 font-bold text-sm text-gray-700 hover:text-primary hover:bg-gray-100 transition-colors">
                  Today
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 transition-colors border-l border-gray-200 group">
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors" />
              </button>
            </div>
            <button onClick={() => {
              setSelectedDate(new Date()) // Default to today if clicking top button
              setIsModalOpen(true)
            }} className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>
        </div>
        
        {/* Days of Week Row */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80">
          {daysOfWeek.map(day => (
            <div key={day} className="p-3 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 bg-gray-200 gap-[1px]">
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isCurrentDay = isToday(day);
            const dateStr = format(day, 'yyyy-MM-dd');
            // Find events that match this day
            const dayEvents = events.filter(e => e.start_date === dateStr);

            return (
              <div 
                key={idx} 
                onClick={() => {
                    setSelectedDate(day);
                    setIsModalOpen(true);
                }}
                className={`min-h-[120px] md:min-h-[160px] bg-white p-2 md:p-3 flex flex-col gap-2 transition-all hover:bg-gray-50 group cursor-pointer ${
                    !isCurrentMonth ? 'opacity-40 bg-gray-50/50' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-black flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                      isCurrentDay 
                        ? 'bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/10' 
                        : 'text-gray-600 group-hover:text-primary group-hover:bg-primary/10'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1.5 mt-1 overflow-y-auto custom-scrollbar pr-1">
                    {dayEvents.map((evt, i) => {
                        const colorClasses = getPriorityColor(evt.priority_level);

                        return (
                            <div 
                                key={evt.event_id || i} 
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent opening the Add Event modal
                                    setSelectedEventForView(evt);
                                    setIsViewModalOpen(true);
                                }}
                                className={`px-2.5 py-2 rounded-lg border shadow-sm transition-transform hover:scale-[1.02] cursor-pointer ${colorClasses}`}
                            >
                                <div className="font-bold text-xs truncate">{evt.title}</div>
                                <div className="flex items-center gap-1.5 mt-1 opacity-80 text-[10px] font-semibold">
                                    <Clock className="w-3 h-3" />
                                    {evt.start_time ? evt.start_time.substring(0,5) : 'All Day'}
                                </div>
                            </div>
                        );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </GeneralCard>

      {isModalOpen && <AddEventModal 
          isOpen={isModalOpen} 
          initialDate={selectedDate}
          onClose={() => {
              setIsModalOpen(false)
              setSelectedDate(null)
              fetchEvents() // Force an immediate refresh when the modal closes
          }} 
      />}

      <ViewEventModal 
          isOpen={isViewModalOpen}
          event={selectedEventForView}
          onClose={() => {
              setIsViewModalOpen(false)
              setSelectedEventForView(null)
          }}
          onRefresh={fetchEvents}
      />
    </>
  )
}
