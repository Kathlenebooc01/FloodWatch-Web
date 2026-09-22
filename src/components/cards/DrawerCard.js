import clsx from "clsx"
export default function DrawerCard({className, children}) {
  return (
    <section className={clsx('drawer-card', className)}>{children}</section>
  )
}
