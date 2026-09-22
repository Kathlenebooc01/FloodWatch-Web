import clsx from "clsx"

export default function Table({className, children}) {
  return (
    <div className={clsx("table-container", className)}>{children}</div>
  )
}
