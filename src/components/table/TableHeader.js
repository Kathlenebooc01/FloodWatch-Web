import clsx from "clsx"
export default function TableHeader({className, children}) {
  return (
    <div className={clsx("table-header", className)}>{children}</div>
  )
}
