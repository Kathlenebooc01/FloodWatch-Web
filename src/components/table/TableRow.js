import { forwardRef } from "react";
import clsx from "clsx";

const TableRow = forwardRef(({ children, className, onClick }, ref) => {
  return (
    <tr ref={ref} className={clsx("table-row", className)} onClick={onClick}>
      {children}
    </tr>
  );
});

TableRow.displayName = "TableRow";
export default TableRow;
