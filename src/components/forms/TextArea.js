import clsx from "clsx"
export default function TextArea({ className, ...props }) {
  return (
    <textarea 
      className={clsx("input-layout w-full outline-0 min-h-[120px] md:min-h-[150px] overflow-y-auto resize-none", className)} 
      {...props}
    />
  )
}
