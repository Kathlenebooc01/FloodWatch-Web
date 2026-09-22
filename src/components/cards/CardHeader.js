import clsx from "clsx"
export default function CardHeader({children, className}) {
  return (
    <label className={clsx('text-xl font-bold', className)}>{children}</label>
  )
}
