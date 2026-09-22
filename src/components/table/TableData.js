import clsx from "clsx"
export default function TableData({ className, children}) {
  return (
    <td className={clsx("table-td", className)}>{children}</td>
  )
}
