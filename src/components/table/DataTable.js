import clsx from "clsx"
export default function DataTable({children, className}) {
  return (
    <table className={clsx("data-table", className)}>
      {children}
    </table>
  )
}
