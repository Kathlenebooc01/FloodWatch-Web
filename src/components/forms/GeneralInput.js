import clsx from 'clsx';

export default function GeneralInput({className, children, iconRight, disabled, ...props}) {
  return (
    <fieldset className={clsx(
      className,
      'input-layout transition-all duration-200',
      disabled && 'bg-gray-100 border-gray-100 opacity-70 cursor-not-allowed select-none'
    )}>
      {children}
      <input 
        {...props} 
        disabled={disabled}
        className='outline-0 bg-transparent text-sm border-0 w-full flex-1 disabled:text-gray-400 disabled:cursor-not-allowed'
      />
      {iconRight}
    </fieldset>
  )
}

