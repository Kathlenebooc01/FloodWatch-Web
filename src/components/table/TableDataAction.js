import clsx from "clsx"
export default function TableDataAction({className, children}) {
  return (
    <td className={clsx("table-action-cell", className)}>{children}</td>
  )
}
