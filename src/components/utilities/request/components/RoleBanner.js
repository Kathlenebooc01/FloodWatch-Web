import CardBasedText from "@/components/cards/CardBasedText";

export default function RoleBanner({ role }) {
  return (
    <CardBasedText className="summary-data-icon font-semibold px-10">{role || 'Role'}</CardBasedText>
  )
}
