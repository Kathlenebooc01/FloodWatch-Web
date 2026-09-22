import clsx from "clsx"
import { Search } from "lucide-react"

export default function SearchInput({ className, ...props }) {
  return (
    <div className={clsx('input-layout flex items-center gap-2 w-full lg:w-sm', className)}>
      <span className="text-gray-500">
        <Search className="size-4" />
      </span>
      <input 
        className="outline-0 bg-transparent text-sm border-0 w-full flex-1"
        {...props} 
      />
    </div>
  )
}
