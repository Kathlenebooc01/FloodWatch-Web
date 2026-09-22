import clsx from "clsx"
export default function TableBadge({ className, children}) {
  return (
    <span className={clsx("table-badge", className)}>{children}</span>
  )
}
