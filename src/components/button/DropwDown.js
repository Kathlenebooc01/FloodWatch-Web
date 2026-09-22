import clsx from "clsx"
import { ListFilter } from "lucide-react"
import CardBasedText from "../cards/CardBasedText"
export default function DropwDown({ children, className, ...props }) {
  return (
    <button className={clsx('btn-secondary p-2 flex items-center gap-2', className)} {...props}>
      <CardBasedText className='text-xs text-gray-500 hidden lg:block'>{children}</CardBasedText>
      <ListFilter className="size-4" />
    </button>
  )
}
