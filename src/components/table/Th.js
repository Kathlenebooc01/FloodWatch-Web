import clsx from "clsx"
export default function Th({className, children}) {
  return (
    <th className={clsx("table-th", className)}>{children}</th>
  )
}
