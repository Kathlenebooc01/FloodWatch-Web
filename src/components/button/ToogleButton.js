import React from 'react'
import clsx from 'clsx'
export default function ToogleButton({children, className, active, ...props}) {
  return (
    <button 
      type="button" 
      className={clsx(className, 'button-toogle', active && 'button-toogle-active')} 
      {...props}
    >
      {children}
    </button>
  )
}
