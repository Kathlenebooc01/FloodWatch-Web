import CardBasedText from "@/components/cards/CardBasedText"
import { format } from "date-fns"

export default function LogisticsDetail({ allocations }) {
  if (!allocations || allocations.length === 0) {
    return (
        <section className="grid gap-5">
            <div>
                <CardBasedText className='text-sm font-semibold text-gray-500'>Logistics Details</CardBasedText>
            </div>
            <CardBasedText className='text-sm text-gray-500'>No allocations yet</CardBasedText>
        </section>
    )
  }

  return (
    <section className="grid gap-5">
        <div>
            <CardBasedText className='text-sm font-semibold text-gray-500'>Logistics Details</CardBasedText>
        </div>
        
        {allocations.map((alloc, index) => (
            <div key={alloc.id || index} className="grid grid-cols-2 gap-5 mb-4 border-b border-gray-100 pb-4 last:border-0 last:mb-0 last:pb-0">
                <div>
                    <CardBasedText className='text-sm font-semibold text-gray-500'>Batch:</CardBasedText>
                    <CardBasedText className='tag-default w-fit'>Batch {index + 1}</CardBasedText>
                </div>
                <div>
                    <CardBasedText className='text-sm font-semibold text-gray-500'>Status:</CardBasedText>
                    <CardBasedText className='tag-default w-fit'>{(alloc.batch || 'Pending_Dispatch').replace('_', ' ')}</CardBasedText>
                </div>
                <div>
                    <CardBasedText className='text-sm font-semibold text-gray-500'>Quantity Allocated:</CardBasedText>
                    <CardBasedText className='tag-default w-fit'>{alloc.quantity_allocated || 0}</CardBasedText>
                </div>
                <div>
                    <CardBasedText className='text-sm font-semibold text-gray-500'>Expected Returned Date:</CardBasedText>
                    <CardBasedText className='tag-default w-fit'>
                        {alloc.expected_return_date ? format(new Date(alloc.expected_return_date), 'MMMM dd, yyyy') : 'N/A'}
                    </CardBasedText>
                </div>
                <div>
                    <CardBasedText className='text-sm font-semibold text-gray-500'>Dispatch Date:</CardBasedText>
                    <CardBasedText className='tag-default w-fit'>
                        {alloc.dispatched_at ? format(new Date(alloc.dispatched_at), 'MMMM dd, yyyy') : 'Pending'}
                    </CardBasedText>
                </div>
                <div>
                    <CardBasedText className='text-sm font-semibold text-gray-500'>Delivered Date:</CardBasedText>
                    <CardBasedText className='tag-default w-fit'>
                        {alloc.delivered_at ? format(new Date(alloc.delivered_at), 'MMMM dd, yyyy') : 'Pending'}
                    </CardBasedText>
                </div>
                <div>
                    <CardBasedText className='text-sm font-semibold text-gray-500'>Received Date:</CardBasedText>
                    <CardBasedText className='tag-default w-fit'>
                        {alloc.received_at ? format(new Date(alloc.received_at), 'MMMM dd, yyyy') : 'Pending'}
                    </CardBasedText>
                </div>
                <div>
                    <CardBasedText className='text-sm font-semibold text-gray-500'>Returned Date:</CardBasedText>
                    <CardBasedText className='tag-default w-fit'>
                        {alloc.returned_at ? format(new Date(alloc.returned_at), 'MMMM dd, yyyy') : 'Pending'}
                    </CardBasedText>
                </div>
                <div>
                    <CardBasedText className='text-sm font-semibold text-gray-500'>Approved By:</CardBasedText>
                    <CardBasedText className='tag-default w-fit'>{alloc.profiles?.full_name || alloc.approved_by || 'Unknown'}</CardBasedText>
                </div>
            </div>
        ))}
    </section>
  )
}
