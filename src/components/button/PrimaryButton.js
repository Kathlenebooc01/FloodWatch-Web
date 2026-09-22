import clsx from 'clsx'
export default function PrimaryButton({className,children, ...props}) {
  return (
    <button className={clsx(className,'btn-primary')} {...props}>{children}</button>
  )
}