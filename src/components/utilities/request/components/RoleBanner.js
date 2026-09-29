import CardBasedText from "@/components/cards/CardBasedText";

export default function RoleBanner({ role }) {
  const formatRole = (roleString) => {
    if (!roleString) return 'Role';
    return roleString
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <CardBasedText className="summary-data-icon font-semibold px-10">{formatRole(role)}</CardBasedText>
  )
}
