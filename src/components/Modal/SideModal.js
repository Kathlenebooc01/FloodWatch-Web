import clsx from "clsx"
export default function SideModal({className,children}) {
  return (
    <div className={clsx(className, "side-modal")}>{children}</div>
  )
}
