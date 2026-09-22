import clsx from "clsx"
export default function TableHead({className, children}) {
  return (
    <thead className={clsx("table-head", className)}>
      {children}
    </thead>
  )
}
