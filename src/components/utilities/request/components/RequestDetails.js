import CardBasedText from "@/components/cards/CardBasedText"
import { format } from "date-fns"
import { ExternalLink, MapPin } from "lucide-react"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"

export default function RequestDetails({ requestId, items, dropOffAddress }) {
  const parseCoordinates = (address) => {
    if (!address) return null;
    
    // 1. Check if it's EWKB Hex String (PostGIS default for geography) e.g., 0101000020...
    if (typeof address === 'string' && address.startsWith('0101000020') && address.length >= 50) {
      const lonHex = address.substring(18, 34);
      const latHex = address.substring(34, 50);
      
      const parseHexDouble = (hex) => {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        for (let i = 0; i < 8; i++) {
          view.setUint8(i, parseInt(hex.substring(i * 2, i * 2 + 2), 16));
        }
        return view.getFloat64(0, true); // true for little-endian
      };
      
      return { lat: parseHexDouble(latHex), lng: parseHexDouble(lonHex) };
    }
    
    // 2. Check if it's WKT format: POINT(lng lat)
    const wktMatch = typeof address === 'string' && address.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i);
    if (wktMatch) {
      return { lat: wktMatch[2], lng: wktMatch[1] };
    }
    
    // 3. Check if it's GeoJSON
    if (typeof address === 'object' && address.type === 'Point' && Array.isArray(address.coordinates)) {
      return { lat: address.coordinates[1], lng: address.coordinates[0] };
    }
    
    return null;
  }

  const coords = parseCoordinates(dropOffAddress);
  const mapQuery = coords ? `${coords.lat},${coords.lng}` : (typeof dropOffAddress === 'string' ? dropOffAddress : '');
  const googleMapsUrl = mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : '#';

  if (!items) {
      return (
          <section className="grid gap-5">
              <div className="flex items-center justify-between mb-2">
                  <div className="w-24"><SingleLineSkeleton /></div>
                  <div className="w-32"><SingleLineSkeleton /></div>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-4 border-b border-gray-100 pb-4">
                  <div className="grid gap-2">
                      <div className="w-32"><SingleLineSkeleton /></div>
                      <div className="w-24 h-6 bg-gray-100 rounded-md animate-pulse mt-1"></div>
                  </div>
                  <div className="grid gap-2">
                      <div className="w-20"><SingleLineSkeleton /></div>
                      <div className="w-12 h-6 bg-gray-100 rounded-md animate-pulse mt-1"></div>
                  </div>
                  <div className="grid gap-2">
                      <div className="w-32"><SingleLineSkeleton /></div>
                      <div className="w-36 h-6 bg-gray-100 rounded-md animate-pulse mt-1"></div>
                  </div>
                  <div className="grid gap-2">
                      <div className="w-40"><SingleLineSkeleton /></div>
                      <div className="w-32 h-6 bg-gray-100 rounded-md animate-pulse mt-1"></div>
                  </div>
              </div>
          </section>
      )
  }

  return (
    <section className="grid gap-5">
        <div className="flex items-center justify-between">
        <CardBasedText className="text-gray-500 font-semibold">Item Details</CardBasedText>
        <div className="flex items-center gap-1 font-semibold">
            <CardBasedText className='text-gray-500 text-xs'>Request Id#:</CardBasedText>
            <CardBasedText className="text-gray-500 text-xs">{(requestId || '').substring(0, 8)}</CardBasedText>
        </div>
        </div>

        {items?.map((item, index) => (
            <div key={item.id || index} className="grid grid-cols-2 gap-5 mb-4 border-b border-gray-100 pb-4 last:border-0 last:mb-0 last:pb-0">
                <div className="grid gap-1">
                <CardBasedText className='text-gray-500 font-semibold'>Requested Items:</CardBasedText>
                <CardBasedText className='tag-default w-fit'>{item.utilities?.name || 'Unknown Item'}</CardBasedText>
                </div>
                <div className="grid gap-1">
                <CardBasedText className='text-gray-500 font-semibold'>Quantity:</CardBasedText>
                <CardBasedText className='tag-default w-fit'>{item.quantity_requested || 0}</CardBasedText>
                </div>
                <div className="grid gap-1">
                <CardBasedText className='text-gray-500 font-semibold'>Drop Off Location:</CardBasedText>
                {dropOffAddress ? (
                    <a 
                        href={googleMapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className='tag-default w-fit flex items-center gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer text-xs font-semibold'
                    >
                        <MapPin className="size-3.5" />
                        <span>View on Google Maps</span>
                        <ExternalLink className="size-3" />
                    </a>
                ) : (
                    <CardBasedText className='tag-default w-fit'>Not specified</CardBasedText>
                )}
                </div>
                <div className="grid gap-1">
                <CardBasedText className='text-gray-500 font-semibold'>Expected Returned Date:</CardBasedText>
                <CardBasedText className='tag-default w-fit'>
                    {item.expected_return_date ? format(new Date(item.expected_return_date), 'MMMM dd, yyyy') : 'N/A'}
                </CardBasedText>
                </div>
            </div>
        ))}
    </section>
  )
}
