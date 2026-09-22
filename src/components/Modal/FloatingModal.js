import clsx from "clsx"
export default function FloatingModal({children, className}) {
  return (
    <section className={clsx(className, 'modal-layout')}>{children}</section>
  )
}
