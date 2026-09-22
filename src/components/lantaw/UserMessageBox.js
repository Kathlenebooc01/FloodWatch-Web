import { memo } from "react"

function UserMessageBox({ children }) {
  return (
    <section className="flex justify-end w-full min-w-0 overflow-hidden">
        <div className="bg-primary/10 p-3 rounded-2xl rounded-tr-sm max-w-[85%] lg:max-w-2xl text-sm text-start whitespace-pre-wrap break-words min-w-0 overflow-hidden">
          {children}
        </div>
    </section>
  )
}

export default memo(UserMessageBox)

