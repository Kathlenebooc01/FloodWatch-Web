import { forwardRef } from "react";
import clsx from "clsx";

const TableScrollWrapper = forwardRef(({ className, children }, ref) => {
  return (
    <div ref={ref} className={clsx("table-scroll-wrapper w-full overflow-x-auto", className)}>
      {children}
    </div>
  );
});

TableScrollWrapper.displayName = "TableScrollWrapper";
export default TableScrollWrapper;
