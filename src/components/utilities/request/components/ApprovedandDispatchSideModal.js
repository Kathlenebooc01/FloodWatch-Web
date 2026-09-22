"use client"
import React, { useState } from "react"
import SideModal from "@/components/Modal/SideModal"
import CardBasedText from "@/components/cards/CardBasedText"
import CardSubHeader from "@/components/cards/CardSubHeader"
import { X, Plus, Trash2, Calendar as CalendarIcon } from "lucide-react"
import GeneralInput from "@/components/forms/GeneralInput"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { supabase } from "@/supabase/util/supabase"

export default function ApprovedandDispatchSideModal({ requestId, items, isOpen, onClose, onSuccess }) {
  const [isBatch, setIsBatch] = useState(false);
  const [batches, setBatches] = useState([{ id: 1, quantity: '', expectedDate: null }]);
  const [expectedDate, setExpectedDate] = useState();
  const [singleQuantity, setSingleQuantity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleAddBatch = () => {
    setBatches([...batches, { id: Date.now(), quantity: '', expectedDate: null }]);
  };

  const handleRemoveBatch = (idToRemove) => {
    if (batches.length > 1) {
      setBatches(batches.filter((b) => b.id !== idToRemove));
    }
  };

  const handleBatchDateChange = (id, date) => {
    setBatches(batches.map((b) => b.id === id ? { ...b, expectedDate: date } : b));
  };

  const handleBatchQuantityChange = (id, value) => {
    setBatches(batches.map((b) => b.id === id ? { ...b, quantity: value } : b));
  };

  const handleDispatch = async () => {
    try {
        setIsLoading(true);
        setErrorMessage("");
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        const utilitiesId = items?.[0]?.utilities_id;

        // Calculate total quantity being allocated
        let totalToDeduct = 0;
        if (isBatch) {
            totalToDeduct = batches.reduce((sum, b) => sum + (parseInt(b.quantity) || 0), 0);
        } else {
            totalToDeduct = items?.reduce((sum, item) => sum + (parseInt(item.quantity_requested) || 0), 0) || 0;
        }

        // Check if there is enough quantity in the utilities table
        if (utilitiesId) {
            const { data: utilityData, error: utilityFetchError } = await supabase
                .from('utilities')
                .select('quantity')
                .eq('id', utilitiesId)
                .single();

            if (utilityFetchError) throw utilityFetchError;

            if (utilityData.quantity < totalToDeduct) {
                setErrorMessage(`Insufficient stock! You are trying to allocate ${totalToDeduct}, but only ${utilityData.quantity} are available.`);
                setIsLoading(false);
                return;
            }

            // Deduct from utilities table
            const { error: deductError } = await supabase
                .from('utilities')
                .update({ quantity: utilityData.quantity - totalToDeduct })
                .eq('id', utilitiesId);

            if (deductError) throw deductError;
        }

        const allocationsToInsert = [];

        if (isBatch) {
            batches.forEach((b, index) => {
                allocationsToInsert.push({
                    request_id: requestId,
                    utilities_id: utilitiesId,
                    quantity_allocated: parseInt(b.quantity) || 0,
                    batch: 'Pending_Dispatch',
                    delivered_at: b.expectedDate ? b.expectedDate.toISOString() : null,
                    approved_by: userId
                });
            });
        } else {
            const requestedQuantity = items?.reduce((sum, item) => sum + (parseInt(item.quantity_requested) || 0), 0) || 0;
            allocationsToInsert.push({
                request_id: requestId,
                utilities_id: utilitiesId,
                quantity_allocated: requestedQuantity,
                batch: 'Pending_Dispatch',
                delivered_at: expectedDate ? expectedDate.toISOString() : null,
                approved_by: userId
            });
        }

        const { error: allocError } = await supabase
            .from('resource_allocations')
            .insert(allocationsToInsert);

        if (allocError) throw allocError;

        const requestStatus = isBatch ? 'Partially_Allocated' : 'Fully_Allocated';
        const { error: reqError } = await supabase
            .from('resource_requests')
            .update({ status: requestStatus, reviewed_by: userId })
            .eq('request_id', requestId);

        if (reqError) throw reqError;

        onSuccess?.();
        onClose?.();
    } catch (error) {
        console.error("Error dispatching:", JSON.stringify(error, null, 2));
        alert("Error dispatching: " + (error.message || JSON.stringify(error)));
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <SideModal>
      <div className="flex flex-col bg-white h-full">
        <div className="p-4 bg-white sticky top-0 flex justify-between items-center border-b border-gray-100 z-10">
          <CardSubHeader className='text-gray-600'>Approve and Dispatch</CardSubHeader>
          <button onClick={onClose} className="modal-icon-button hover:bg-gray-100 p-1 rounded-full transition-colors">
            <X className="size-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid gap-8 pb-12">
          {/* Batch Delivery Toggle */}
          <div className="grid gap-3">
            <CardBasedText className="font-bold text-gray-800 text-sm">This will be delivered by Batch?</CardBasedText>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsBatch(false)}
                className={`cursor-pointer text-sm font-semibold px-6 py-2.5 rounded-lg transition-all ${!isBatch ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'}`}
              >
                No
              </button>
              <button 
                onClick={() => setIsBatch(true)}
                className={`cursor-pointer text-sm font-semibold px-6 py-2.5 rounded-lg transition-all ${isBatch ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'}`}
              >
                Yes
              </button>
            </div>
          </div>

          {/* Dynamic Quantity / Batches Section */}
          {isBatch ? (
            <div className="grid gap-5 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
              <div className="grid gap-2">
                <CardBasedText className="font-bold text-gray-800 text-sm">How many batches?</CardBasedText>
                <GeneralInput type="number" placeholder='e.g. 2' value={batches.length} readOnly className="bg-gray-100 text-gray-500 cursor-not-allowed font-semibold text-center" />
              </div>

              <div className="grid gap-4 mt-2">
                <div className="flex items-center justify-between">
                  <CardBasedText className="font-bold text-gray-800 text-sm">Batches Resource Allocations</CardBasedText>
                  <button 
                    onClick={handleAddBatch}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                  >
                    <Plus className="size-4" />
                    Add Batch
                  </button>
                </div>
                
                <div className="grid gap-4">
                  {batches.map((batch, index) => (
                    <div key={batch.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid gap-3 group transition-all">
                      <div className="flex justify-between items-center">
                        <CardBasedText className='text-primary font-black text-xs uppercase tracking-widest'>Batch {index + 1}</CardBasedText>
                        {batches.length > 1 && (
                          <button 
                            onClick={() => handleRemoveBatch(batch.id)}
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                            title="Remove Batch"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                      
                      <fieldset>
                        <CardBasedText className="text-gray-600 mb-1.5 font-medium text-xs">Quantity</CardBasedText>
                        <GeneralInput 
                            type="number" 
                            placeholder='e.g. 100' 
                            value={batch.quantity}
                            onChange={(e) => handleBatchQuantityChange(batch.id, e.target.value)}
                        />
                      </fieldset>

                      {/* Batch Specific Arrival Time */}
                      <fieldset className="mt-1">
                        <CardBasedText className="text-gray-600 mb-1.5 font-medium text-xs">Expected Arrival Time</CardBasedText>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-medium bg-gray-50 border-gray-200 hover:bg-primary/10 hover:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary h-10 text-gray-700 rounded-lg px-3 transition-colors",
                                !batch.expectedDate && "text-gray-400"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                              {batch.expectedDate ? format(batch.expectedDate, "PPP") : <span>Pick an arrival date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-2xl rounded-xl z-[9999]" align="start" sideOffset={8}>
                            <Calendar
                              mode="single"
                              selected={batch.expectedDate}
                              onSelect={(date) => handleBatchDateChange(batch.id, date)}
                              initialFocus
                              className="bg-white rounded-xl pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </fieldset>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* General Expected Arrival Time (Only visible when NOT batching) */}
          {!isBatch && (
            <div className="grid gap-3 pt-4 border-t border-gray-100">
              <CardBasedText className="font-bold text-gray-800 text-sm">Expected Arrival Time</CardBasedText>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-medium bg-gray-50 border-gray-200 hover:bg-primary/10 hover:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary h-12 text-gray-700 rounded-xl px-4 transition-colors",
                      !expectedDate && "text-gray-400"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 text-gray-500" />
                    {expectedDate ? format(expectedDate, "PPP") : <span>Pick an arrival date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-2xl rounded-xl z-[9999]" align="start" sideOffset={8}>
                  <Calendar
                    mode="single"
                    selected={expectedDate}
                    onSelect={setExpectedDate}
                    initialFocus
                    className="bg-white rounded-xl pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 mt-auto border-t border-gray-100 flex flex-col gap-3">
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-semibold flex items-center gap-2">
              <span className="shrink-0 size-2 bg-red-500 rounded-full animate-pulse"></span>
              <span>{errorMessage}</span>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              onClick={handleDispatch}
              disabled={isLoading || (isBatch && batches.length < 2)}
              className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Dispatching...' : 'Dispatch Resources'}
            </button>
          </div>
        </div>
      </div>
    </SideModal>
  )
}
