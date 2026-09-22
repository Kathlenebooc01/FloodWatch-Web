import clsx from "clsx"
export default function CardSubHeader({children, className}) {
  return (
    <label className={clsx('text-base font-semibold', className)}>{children}</label>
  )
}
