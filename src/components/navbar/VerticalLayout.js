import clsx from "clsx"
export default function VerticalLayout({children, className}) {
  return (
    <aside className={clsx('vertical-nav-layout', className)}>{children}</aside>
  )
}
