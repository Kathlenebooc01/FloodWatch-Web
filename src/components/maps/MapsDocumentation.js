import SecondaryButton from "../button/SecondaryButton";
import { FileText } from "lucide-react";
export default function MapsDocumentation() {
  return (
    <SecondaryButton className="text-xs border-none lg:ring lg:ring-gray-300 px-2 py-1"><span className="hidden text-primary lg:block">Documentation </span><span className=" summary-data-icon"><FileText className="size-5"/></span></SecondaryButton>
  )
}