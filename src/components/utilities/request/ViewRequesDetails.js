"use client"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import GeneralCard from "@/components/cards/GeneralCard"
import CardSubHeader from "@/components/cards/CardSubHeader"
import RequestStatus from "./components/RequestStatus"
import StatusBar from "./components/StatusBar"
import CardBasedText from "@/components/cards/CardBasedText"
import LogisticsLocationMap from "./components/LogisticsLocationMap"
import RequestDetails from "./components/RequestDetails"
import WorkFlowTool from "./components/WorkFlowTool"
import LogisticsDetail from "./components/LogisticsDetail"
import ApprovedandDispatchSideModal from "./components/ApprovedandDispatchSideModal"
import { supabase } from "@/supabase/util/supabase"
import { requestProgress } from "@/lib/domain-values.mjs"
import { DEFAULT_MAPBOX_TOKEN } from "@/lib/constants/mapbox"

export default function ViewRequesDetails({ id }) {
  const [request, setRequest] = useState(null)
  const [items, setItems] = useState([])
  const [allocations, setAllocations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const isMountedRef = useRef(true)

  const currentFetch = useRef(null)
  const refreshQueued = useRef(false)
  const refetchData = useCallback(async function loadData(isInitial = false) {
    if (currentFetch.current) {
      refreshQueued.current = true
      return
    }
    const controller = new AbortController()
    currentFetch.current = controller
    if (isInitial) setIsLoading(true)
    try {
      const [reqRes, itemsRes, allocRes] = await Promise.all([
        supabase.from('resource_requests')
          .select('*, profiles:requested_by(id, municipality_or_city:municipality_id(name))')
          .eq('request_id', id).abortSignal(controller.signal).single(),
        supabase.from('resource_request_items').select('*, utilities:utilities_id(name, type)')
          .eq('request_id', id).abortSignal(controller.signal),
        supabase.from('resource_allocations').select('*, profiles:approved_by(full_name)')
          .eq('request_id', id).order('batch', { ascending: true }).abortSignal(controller.signal),
      ])
      if (!isMountedRef.current || controller.signal.aborted) return
      if (!reqRes.error && reqRes.data) setRequest(reqRes.data)
      if (!itemsRes.error) setItems(itemsRes.data || [])
      if (!allocRes.error) setAllocations(allocRes.data || [])
    } catch (error) {
      if (!controller.signal.aborted) console.error(error)
    } finally {
      if (currentFetch.current === controller) {
        currentFetch.current = null
        if (isMountedRef.current && !controller.signal.aborted) {
          setIsLoading(false)
          if (refreshQueued.current) {
            refreshQueued.current = false
            queueMicrotask(() => { if (isMountedRef.current && !controller.signal.aborted) loadData(false) })
          }
        }
      }
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    isMountedRef.current = true
    const initialFetch = setTimeout(() => refetchData(true), 0)
    let refreshTimer
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => refetchData(false), 350)
    }
    const channel = supabase.channel('request-' + id + '-v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_requests', filter: 'request_id=eq.' + id }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_request_items', filter: 'request_id=eq.' + id }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_allocations', filter: 'request_id=eq.' + id }, scheduleRefresh)
      .subscribe()
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') scheduleRefresh()
    }
    document.addEventListener('visibilitychange', refreshVisible)
    const pollInterval = setInterval(refreshVisible, 30000)
    return () => {
      isMountedRef.current = false
      clearTimeout(initialFetch)
      clearTimeout(refreshTimer)
      clearInterval(pollInterval)
      document.removeEventListener('visibilitychange', refreshVisible)
      currentFetch.current?.abort()
      currentFetch.current = null
      refreshQueued.current = false
      supabase.removeChannel(channel)
    }
  }, [id, refetchData])

  const mapStatusToStatusBar = (status, allocs) => {
    return requestProgress(status, allocs || [])
  }

  const parseCoordinates = (address) => {
    if (!address) return null;
    
    if (typeof address === 'string' && address.startsWith('0101000020') && address.length >= 50) {
      const lonHex = address.substring(18, 34);
      const latHex = address.substring(34, 50);
      
      const parseHexDouble = (hex) => {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        for (let i = 0; i < 8; i++) {
          view.setUint8(i, parseInt(hex.substring(i * 2, i * 2 + 2), 16));
        }
        return view.getFloat64(0, true);
      };
      
      return { lat: parseHexDouble(latHex), lng: parseHexDouble(lonHex) };
    }
    
    const wktMatch = typeof address === 'string' && address.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i);
    if (wktMatch) {
      return { lat: parseFloat(wktMatch[2]), lng: parseFloat(wktMatch[1]) };
    }
    
    if (typeof address === 'object' && address.type === 'Point' && Array.isArray(address.coordinates)) {
      return { lat: address.coordinates[1], lng: address.coordinates[0] };
    }
    
    return null;
  }

  const coords = useMemo(() => parseCoordinates(request?.drop_off_address), [request?.drop_off_address]);
  const [geocodeCoords, setGeocodeCoords] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const fetchGeocode = async (address) => {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || DEFAULT_MAPBOX_TOKEN;
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`, {
          signal: controller.signal
        });
        if (!active) return;
        const data = await res.json();
        if (active && data.features && data.features.length > 0) {
          setGeocodeCoords({
            lat: data.features[0].center[1],
            lng: data.features[0].center[0]
          });
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Geocoding error:", error);
        }
      }
    };

    const addressToGeocode = request?.drop_off_address || request?.profiles?.municipality_or_city?.name;

    if (addressToGeocode && !coords) {
      fetchGeocode(addressToGeocode);
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, [request?.drop_off_address, request?.profiles?.municipality_or_city?.name, coords]);

  if (isLoading) return <div className="p-5 text-gray-500">Loading details...</div>

  const finalCoords = coords || geocodeCoords;

  return (
    <GeneralCard className='grid gap-5'>
        <div className="flex justify-between items-center">
            <CardSubHeader className='text-gray-600'>Request Details</CardSubHeader>
            <RequestStatus status={allocations.length > 0 ? mapStatusToStatusBar(request?.status, allocations) : request?.status}/>
        </div>
        <div>
            <CardBasedText className='font-semibold text-gray-500'>Logistics Details</CardBasedText>
            <StatusBar currentStatus={mapStatusToStatusBar(request?.status, allocations)}/>
            {finalCoords ? (
              <LogisticsLocationMap latitude={finalCoords.lat} longitude={finalCoords.lng} />
            ) : (
              <LogisticsLocationMap />
            )}
        </div>
        <div>
            <RequestDetails requestId={id} items={items} dropOffAddress={request?.drop_off_address}/>
        </div>
        <div>
            <LogisticsDetail allocations={allocations}/>
        </div>
        <div>
            <WorkFlowTool 
                status={request?.status} 
                requestId={id} 
                allocations={allocations} 
                onStatusChange={refetchData} 
                onApprove={() => setIsModalOpen(true)}
                userId={request?.profiles?.id}
            />
        </div>
        <ApprovedandDispatchSideModal 
            requestId={id} 
            items={items} 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={refetchData}
            userId={request?.profiles?.id}
        />
    </GeneralCard>
  )
}
