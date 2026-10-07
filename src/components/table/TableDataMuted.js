import clsx from "clsx"
export default function TableDataMuted({ className, children, ...props}) {
  return (
    <td {...props} className={clsx("table-td-muted", className)}>{children}</td>
  )
}
