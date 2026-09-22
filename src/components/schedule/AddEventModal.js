"use client"
import { useState } from "react"
import SideModal from "@/components/Modal/SideModal"
import CardBasedText from "@/components/cards/CardBasedText"
import GeneralInput from "@/components/forms/GeneralInput"
import TextArea from "@/components/forms/TextArea"
import PrimaryButton from "@/components/button/PrimaryButton"
import SecondaryButton from "@/components/button/SecondaryButton"
import { supabase } from "@/supabase/util/supabase"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon, ChevronDown, Check, Clock } from "lucide-react"

const EVENT_TYPES = ["Meeting", "Dispatch", "Maintenance", "Training", "Other"]
const PRIORITIES = ["Low", "Medium", "High", "Critical"]

export default function AddEventModal({ isOpen, onClose, initialDate }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    event_type: 'Meeting',
    priority_level: 'Medium'
  })
  
  const [startDate, setStartDate] = useState(initialDate || null)
  const [endDate, setEndDate] = useState(null)

  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false)
  const [startTimeOpen, setStartTimeOpen] = useState(false)
  const [endTimeOpen, setEndTimeOpen] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Generate time options (every 30 mins)
  const timeOptions = Array.from({ length: 48 }).map((_, i) => {
    const hours = Math.floor(i / 2).toString().padStart(2, '0')
    const mins = (i % 2 === 0 ? '00' : '30')
    return `${hours}:${mins}`
  })

  const formatTimeDisplay = (timeString) => {
      if (!timeString) return "Select time";
      const [h, m] = timeString.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${m} ${ampm}`;
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!startDate) {
        setError("Start Date is required")
        setIsLoading(false)
        return
    }

    try {
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      // Determine end date: database requires it, so default to start_date if not selected
      const finalEndDate = endDate ? endDate : startDate;

      const payload = {
        title: formData.title,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(finalEndDate, 'yyyy-MM-dd'),
        event_type: formData.event_type,
        priority_level: formData.priority_level,
        created_by: userData?.user?.id
      }
      
      // Only attach optional fields if they have a value (prevents invalid cast errors for empty strings)
      if (formData.description) payload.description = formData.description;
      if (formData.start_time) payload.start_time = formData.start_time;
      if (formData.end_time) payload.end_time = formData.end_time;

      const { error: insertError } = await supabase
        .from('scheduled_events')
        .insert(payload)

      if (insertError) {
          console.error("Insert Error:", insertError);
          throw insertError;
      }
      
      onClose()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to create event. Please check your inputs.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SideModal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white relative">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Add New Event</h2>
            <CardBasedText className="text-gray-500 text-xs mt-1">Schedule an event on the calendar</CardBasedText>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="grid gap-2">
            <label className="text-sm font-bold text-gray-700">Event Title <span className="text-red-500">*</span></label>
            <GeneralInput name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. Relief Distribution" />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-bold text-gray-700">Description</label>
            <TextArea name="description" value={formData.description} onChange={handleChange} placeholder="Event details..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-bold text-gray-700">Start Date <span className="text-red-500">*</span></label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className={`flex w-full items-center justify-between px-3 py-2 border rounded-lg transition-colors ${startDate ? 'text-gray-900 border-gray-300' : 'text-gray-400 border-gray-200'} hover:border-primary/50 focus:ring-2 focus:ring-primary/10`}>
                    <span className="text-sm">{startDate ? format(startDate, "PPP") : "Pick a date"}</span>
                    <CalendarIcon className="size-4 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                        setStartDate(date)
                        setStartDateOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-bold text-gray-700">End Date</label>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className={`flex w-full items-center justify-between px-3 py-2 border rounded-lg transition-colors ${endDate ? 'text-gray-900 border-gray-300' : 'text-gray-400 border-gray-200'} hover:border-primary/50 focus:ring-2 focus:ring-primary/10`}>
                    <span className="text-sm">{endDate ? format(endDate, "PPP") : "Pick a date"}</span>
                    <CalendarIcon className="size-4 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                        setEndDate(date)
                        setEndDateOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Custom Start Time Dropdown */}
            <div className="grid gap-2 relative">
              <label className="text-sm font-bold text-gray-700">Start Time <span className="text-red-500">*</span></label>
              <button
                  type="button"
                  onClick={() => {
                      setStartTimeOpen(!startTimeOpen)
                      setEndTimeOpen(false)
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-primary/10 hover:border-gray-300 ${startTimeOpen ? 'border-primary shadow-sm' : 'border-gray-200'} ${formData.start_time ? 'text-gray-900' : 'text-gray-400'}`}
              >
                  <span>{formatTimeDisplay(formData.start_time)}</span>
                  <Clock className="size-4 opacity-50" />
              </button>
              
              {startTimeOpen && (
                  <>
                      <div className="fixed inset-0 z-40" onClick={() => setStartTimeOpen(false)} />
                      <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-gray-100 shadow-xl rounded-xl z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-200 max-h-48 overflow-y-auto custom-scrollbar">
                          {timeOptions.map(time => (
                              <button
                                  key={time}
                                  type="button"
                                  onClick={() => {
                                      setFormData(p => ({ ...p, start_time: time }))
                                      setStartTimeOpen(false)
                                  }}
                                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${formData.start_time === time ? 'bg-primary/10 text-primary font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                              >
                                  {formatTimeDisplay(time)}
                                  {formData.start_time === time && <Check className="size-4 text-primary" />}
                              </button>
                          ))}
                      </div>
                  </>
              )}
            </div>

            {/* Custom End Time Dropdown */}
            <div className="grid gap-2 relative">
              <label className="text-sm font-bold text-gray-700">End Time</label>
              <button
                  type="button"
                  onClick={() => {
                      setEndTimeOpen(!endTimeOpen)
                      setStartTimeOpen(false)
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-primary/10 hover:border-gray-300 ${endTimeOpen ? 'border-primary shadow-sm' : 'border-gray-200'} ${formData.end_time ? 'text-gray-900' : 'text-gray-400'}`}
              >
                  <span>{formatTimeDisplay(formData.end_time)}</span>
                  <Clock className="size-4 opacity-50" />
              </button>

              {endTimeOpen && (
                  <>
                      <div className="fixed inset-0 z-40" onClick={() => setEndTimeOpen(false)} />
                      <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-gray-100 shadow-xl rounded-xl z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-200 max-h-48 overflow-y-auto custom-scrollbar">
                          {timeOptions.map(time => (
                              <button
                                  key={time}
                                  type="button"
                                  onClick={() => {
                                      setFormData(p => ({ ...p, end_time: time }))
                                      setEndTimeOpen(false)
                                  }}
                                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${formData.end_time === time ? 'bg-primary/10 text-primary font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                              >
                                  {formatTimeDisplay(time)}
                                  {formData.end_time === time && <Check className="size-4 text-primary" />}
                              </button>
                          ))}
                      </div>
                  </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Custom Event Type Dropdown */}
            <div className="grid gap-2 relative">
              <label className="text-sm font-bold text-gray-700">Event Type</label>
              <button
                  type="button"
                  onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                  className={`flex items-center justify-between w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-primary/10 hover:border-gray-300 ${typeDropdownOpen ? 'border-primary shadow-sm' : 'border-gray-200'}`}
              >
                  <span className="font-medium text-gray-700">{formData.event_type}</span>
                  <ChevronDown className={`size-4 text-gray-400 transition-transform duration-200 ${typeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {typeDropdownOpen && (
                  <>
                      <div className="fixed inset-0 z-40" onClick={() => setTypeDropdownOpen(false)} />
                      <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-gray-100 shadow-xl rounded-xl z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-200">
                          {EVENT_TYPES.map(type => (
                              <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                      setFormData(p => ({ ...p, event_type: type }))
                                      setTypeDropdownOpen(false)
                                  }}
                                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${formData.event_type === type ? 'bg-primary/10 text-primary font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                              >
                                  {type}
                                  {formData.event_type === type && <Check className="size-4 text-primary" />}
                              </button>
                          ))}
                      </div>
                  </>
              )}
            </div>

            {/* Custom Priority Level Dropdown */}
            <div className="grid gap-2 relative">
              <label className="text-sm font-bold text-gray-700">Priority Level</label>
              <button
                  type="button"
                  onClick={() => setPriorityDropdownOpen(!priorityDropdownOpen)}
                  className={`flex items-center justify-between w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-primary/10 hover:border-gray-300 ${priorityDropdownOpen ? 'border-primary shadow-sm' : 'border-gray-200'}`}
              >
                  <span className="font-medium text-gray-700">{formData.priority_level}</span>
                  <ChevronDown className={`size-4 text-gray-400 transition-transform duration-200 ${priorityDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {priorityDropdownOpen && (
                  <>
                      <div className="fixed inset-0 z-40" onClick={() => setPriorityDropdownOpen(false)} />
                      <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-gray-100 shadow-xl rounded-xl z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-200">
                          {PRIORITIES.map(priority => (
                              <button
                                  key={priority}
                                  type="button"
                                  onClick={() => {
                                      setFormData(p => ({ ...p, priority_level: priority }))
                                      setPriorityDropdownOpen(false)
                                  }}
                                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${formData.priority_level === priority ? 'bg-primary/10 text-primary font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                              >
                                  {priority}
                                  {formData.priority_level === priority && <Check className="size-4 text-primary" />}
                              </button>
                          ))}
                      </div>
                  </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <SecondaryButton type="button" onClick={onClose} disabled={isLoading} className='px-6 py-2 border-gray-200 hover:bg-gray-100 text-gray-600'>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={isLoading} className='px-6 py-2 shadow-sm'>{isLoading ? 'Saving...' : 'Add Event'}</PrimaryButton>
        </div>
      </form>
    </SideModal>
  )
}
