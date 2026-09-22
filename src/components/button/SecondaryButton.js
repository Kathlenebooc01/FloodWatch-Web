import React from 'react'
import clsx from 'clsx'
export default function SecondaryButton({children, className, ...props}) {
  return (
    <button className={clsx('btn-secondary', className)} {...props}>{children}</button>
  )
}
