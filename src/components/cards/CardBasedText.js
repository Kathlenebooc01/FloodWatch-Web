import clsx from "clsx"
export default function CardBasedText({children, className}) {
  return (
    <p className={clsx('text-sm break-words', className)}>{children}</p>
  )
}