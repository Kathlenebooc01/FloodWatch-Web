import clsx from "clsx"
export default function TableDataMuted({ className, children}) {
  return (
    <td className={clsx("table-td-muted", className)}>{children}</td>
  )
}
