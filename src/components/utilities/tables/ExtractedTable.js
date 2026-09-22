import TableScrollWrapper from "@/components/table/TableScrollWrapper"
import Table from "@/components/table/Table"
import DataTable from "@/components/table/DataTable"
import TableHead from "@/components/table/TableHead"
import Th from "@/components/table/Th"
import TableRow from "@/components/table/TableRow"
import TableData from "@/components/table/TableData"
import TableDataMuted from "@/components/table/TableDataMuted"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"

export default function ExtractedTable({ data, isRendering }) {
  return (
    <Table className="w-full min-w-0 overflow-hidden">
      <TableScrollWrapper>
        <DataTable className="w-full min-w-[680px]">
          <TableHead>
            <tr>
              <Th>Item Name</Th>
              <Th>Type / Category</Th>
              <Th>Control / Serial No.</Th>
              <Th>Quantity</Th>
              <Th>Location / Description</Th>
            </tr>
          </TableHead>
          <tbody>
            {isRendering ? (
              // Show skeleton rows while rendering
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                </TableRow>
              ))
            ) : data && data.length > 0 ? (
              data.map((item) => (
                <TableRow key={item.id}>
                  <TableData className="font-semibold text-gray-800">
                    {item.item_name || item.name || "N/A"}
                  </TableData>
                  <TableDataMuted>
                    {item.category || item.type || item.item_type || "N/A"}
                  </TableDataMuted>
                  <TableDataMuted className="font-mono text-xs">
                    {item.control_number || item.serial_number || "N/A"}
                  </TableDataMuted>
                  <TableData className="font-bold text-primary">
                    {item.total_quantity ?? item.quantity ?? 1} units
                  </TableData>
                  <TableDataMuted className="truncate max-w-[200px]">
                    {item.storage_location || item.description || "N/A"}
                  </TableDataMuted>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableData colSpan={5} className="text-center text-gray-400 py-8">
                  No data extracted yet
                </TableData>
              </TableRow>
            )}
          </tbody>
        </DataTable>
      </TableScrollWrapper>
    </Table>
  )
}
