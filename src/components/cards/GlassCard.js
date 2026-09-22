import clsx from "clsx"
export default function GlassCard({children, className}) {
  return (
    <section className={clsx('glass-card', className)}>{children}</section>
  )
}
