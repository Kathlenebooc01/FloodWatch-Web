
import GeneralCard from "../cards/GeneralCard"
import clsx from "clsx"
export default function PopUp({children, className}) {
  return (
    <div className={clsx(className,'pop-up')}>
        <GeneralCard>
        {children}
        </GeneralCard>
    </div>
  )
}
