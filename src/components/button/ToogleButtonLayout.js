import clsx from "clsx"

export default function ToogleButtonLayout({children, className}) {
  return (
    <section className={clsx(className,'button-toogle-layout')}>{children}</section>
  )
}
