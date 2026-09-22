import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
export default function RequestorsDetails({ profile }) {
  return (
    <div className="grid grid-cols-2 gap-5">
        <div>
            <CardSubHeader className='text-sm text-gray-500'>Name</CardSubHeader>
            <CardBasedText className='text-xs'>{profile?.full_name}</CardBasedText>
        </div>
        <div>
            <CardSubHeader className='text-sm text-gray-500'>Email</CardSubHeader>
            <CardBasedText className='text-xs'>{profile?.email}</CardBasedText>
        </div>
        <div>
            <CardSubHeader className='text-sm text-gray-500'>Contact Number</CardSubHeader>
            <CardBasedText className='text-xs'>{profile?.mobile_number}</CardBasedText>
        </div>
        <div>
            <CardSubHeader className='text-sm text-gray-500'>Province</CardSubHeader>
            <CardBasedText className='text-xs'>Cebu</CardBasedText>
        </div>
        <div>
            <CardSubHeader className='text-sm text-gray-500'>Municipality</CardSubHeader>
            <CardBasedText className='text-xs'>{profile?.municipality_or_city?.name}</CardBasedText>
        </div>
        <div>
            <CardSubHeader className='text-sm text-gray-500'>Organization</CardSubHeader>
            <CardBasedText className='text-xs'>{profile?.organization_name}</CardBasedText>
        </div>
    </div>
  )
}
