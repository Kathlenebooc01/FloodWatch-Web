"use client"
import TableScrollWrapper from "@/components/table/TableScrollWrapper"
import Table from "@/components/table/Table"
import DataTable from "@/components/table/DataTable"
import TableHead from "@/components/table/TableHead"
import Th from "@/components/table/Th"
import TableRow from "@/components/table/TableRow"
import TableData from "@/components/table/TableData"
import TableDataMuted from "@/components/table/TableDataMuted"
import TableDataAction from "@/components/table/TableDataAction"
import SideModal from "@/components/Modal/SideModal"
import CardSubHeader from "@/components/cards/CardSubHeader"
import CardBasedText from "@/components/cards/CardBasedText"
import PrimaryButton from "@/components/button/PrimaryButton"
import GeneralInput from "@/components/forms/GeneralInput"
import TagsInput from "@/components/forms/TagsInput"
import SearchInput from "@/components/forms/SearchInput"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { 
  ChevronRight, 
  ShieldAlert, 
  Trash2, 
  X, 
  Tag, 
  SquareDashed, 
  ToolCase, 
  Hash, 
  Package, 
  FileText, 
  CalendarDays, 
  MapPin,
  Pencil,
  Loader2,
  CalendarIcon,
  DollarSign
} from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/supabase/util/supabase"
import SingleLineSkeleton from "@/components/skeleton/SingleLineSkeleton"
import { format } from "date-fns"

export default function IndependentInventory() {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Search and 3-second debouncing state
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 3000)

    return () => {
      clearTimeout(timer)
    }
  }, [searchTerm])

  const [purchasedDateOpen, setPurchasedDateOpen] = useState(false)
  const [expirationDateOpen, setExpirationDateOpen] = useState(false)

  const [editForm, setEditForm] = useState({
    item_name: "",
    control_numbers: [],
    category: "",
    item_type: "",
    total_quantity: "",
    available_quantity: "",
    price_each: "",
    storage_location: "",
    purchased_date: "",
    expiration_date: ""
  })

  const fetchPdrrmoInventory = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('pdrrmo_inventory')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setItems(data)
      }
    } catch (err) {
      console.error("Error fetching pdrrmo_inventory:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPdrrmoInventory()

    const channel = supabase
      .channel('pdrrmo-inventory-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pdrrmo_inventory' }, fetchPdrrmoInventory)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filter items based on debouncedSearch
  const filteredItems = items.filter((item) => {
    if (!debouncedSearch.trim()) return true
    const q = debouncedSearch.toLowerCase().trim()
    const nameMatch = item.item_name?.toLowerCase().includes(q)
    const categoryMatch = item.category?.toLowerCase().includes(q)
    const typeMatch = item.item_type?.toLowerCase().includes(q)
    const controlMatch = item.control_number?.toLowerCase().includes(q)
    const locationMatch = item.storage_location?.toLowerCase().includes(q)
    return nameMatch || categoryMatch || typeMatch || controlMatch || locationMatch
  })

  // Parse control numbers string into array of tags
  const parseControlNumbers = (controlNumStr) => {
    if (!controlNumStr) return []
    return controlNumStr.split(',').map(s => s.trim()).filter(Boolean)
  }

  const openDetails = (item) => {
    setSelectedItem(item)
    setEditForm({
      item_name: item.item_name || "",
      control_numbers: parseControlNumbers(item.control_number),
      category: item.category || "",
      item_type: item.item_type || "",
      total_quantity: item.total_quantity?.toString() || "",
      available_quantity: item.available_quantity?.toString() || "",
      price_each: item.price_each?.toString() || "",
      storage_location: item.storage_location || "",
      purchased_date: item.purchased_date || "",
      expiration_date: item.expiration_date || ""
    })
    setIsEditing(false)
  }

  const handleDelete = async (itemId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this item from PDRRMO inventory?")
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('pdrrmo_inventory')
        .delete()
        .eq('item_id', itemId)

      if (error) throw error

      setSelectedItem(null)
      fetchPdrrmoInventory()
    } catch (err) {
      console.error("Failed to delete item:", err)
      alert("Failed to delete item. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTotalQuantityChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, "")
    const num = parseInt(val) || 0

    setEditForm(prev => {
      let newControlNumbers = prev.control_numbers || []
      if (newControlNumbers.length > num) {
        newControlNumbers = newControlNumbers.slice(0, num)
      }
      return {
        ...prev,
        total_quantity: val,
        available_quantity: prev.available_quantity || val,
        control_numbers: newControlNumbers
      }
    })
  }

  const handleSaveUpdate = async () => {
    const targetQty = parseInt(editForm.total_quantity) || 0
    if (!editForm.item_name.trim() || targetQty <= 0) {
      alert("Item name and total quantity are required.")
      return
    }

    if (editForm.control_numbers.length !== targetQty) {
      alert(`Please add exactly ${targetQty} control numbers to match the total quantity.`)
      return
    }

    setIsUpdating(true)
    try {
      const payload = {
        item_name: editForm.item_name.trim(),
        control_number: editForm.control_numbers.join(', '),
        category: editForm.category.trim() || null,
        item_type: editForm.item_type.trim() || null,
        total_quantity: targetQty,
        available_quantity: parseInt(editForm.available_quantity || editForm.total_quantity),
        price_each: editForm.price_each ? parseFloat(editForm.price_each) : null,
        storage_location: editForm.storage_location.trim() || null,
        purchased_date: editForm.purchased_date || null,
        expiration_date: editForm.expiration_date || null
      }

      const { error } = await supabase
        .from('pdrrmo_inventory')
        .update(payload)
        .eq('item_id', selectedItem.item_id)

      if (error) throw error

      setIsEditing(false)
      fetchPdrrmoInventory()
      
      // Update local selectedItem reference
      setSelectedItem(prev => ({ ...prev, ...payload }))
    } catch (err) {
      console.error("Error updating item:", err)
      alert(err.message || "Failed to update item.")
    } finally {
      setIsUpdating(false)
    }
  }

  // Helper for stock status pill
  const getStockStatusPill = (qty) => {
    const num = Number(qty) || 0
    if (num === 0) return { label: 'Out of Stock', style: 'bg-red-100 text-red-700 border-red-200' }
    if (num <= 2) return { label: 'Low Stock', style: 'bg-amber-100 text-amber-700 border-amber-200' }
    return { label: 'In Stock', style: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  }

  const purchasedDateObj = editForm.purchased_date ? new Date(editForm.purchased_date) : null
  const expirationDateObj = editForm.expiration_date ? new Date(editForm.expiration_date) : null

  return (
    <Table className="w-full min-w-0 overflow-hidden">
      {/* Search Input Bar with 3s Debouncing */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-white">
        <SearchInput 
          placeholder="Search Command Center items by name, category, or control no..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm !== debouncedSearch && (
          <span className="text-xs text-amber-600 font-semibold animate-pulse shrink-0">
            Searching in 3s...
          </span>
        )}
      </div>

      <TableScrollWrapper>
        <DataTable className="w-full min-w-[680px]">
          <TableHead>
            <tr>
              <Th>Command Equipment</Th>
              <Th>Category</Th>
              <Th>Control / Serial No.</Th>
              <Th>Available Qty</Th>
              <Th>Storage Location</Th>
              <Th>Action</Th>
            </tr>
          </TableHead>
          <tbody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableData><SingleLineSkeleton /></TableData>
                  <TableDataAction><SingleLineSkeleton /></TableDataAction>
                </TableRow>
              ))
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const controlTags = parseControlNumbers(item.control_number)
                const stockPill = getStockStatusPill(item.available_quantity)

                return (
                  <TableRow key={item.item_id}>
                    <TableData className="font-semibold text-gray-800 flex items-center gap-2">
                      <ShieldAlert className="size-4 text-primary shrink-0" />
                      {item.item_name}
                    </TableData>
                    <TableDataMuted>{item.category || item.item_type || 'Equipment'}</TableDataMuted>
                    <TableDataMuted className="font-mono text-xs max-w-[200px] truncate">
                      {controlTags.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-bold">
                            {controlTags[0]}
                          </span>
                          {controlTags.length > 1 && (
                            <span className="text-[10px] text-gray-400 font-sans font-semibold">
                              +{controlTags.length - 1} more
                            </span>
                          )}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableDataMuted>
                    <TableData>
                      <span className={`px-3 py-1 font-bold rounded-lg text-xs ${stockPill.style}`}>
                        {item.available_quantity ?? item.total_quantity ?? 0} units
                      </span>
                    </TableData>
                    <TableDataMuted className="truncate max-w-[150px]">
                      {item.storage_location || 'Command Center'}
                    </TableDataMuted>
                    <TableDataAction>
                      <button 
                        onClick={() => openDetails(item)}
                        className="modal-icon-button hover:bg-gray-200"
                        title="View details"
                      >
                        <ChevronRight className="size-5"/>
                      </button>
                    </TableDataAction>
                  </TableRow>
                )
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-sm font-medium">
                  {debouncedSearch 
                    ? `No items matching "${debouncedSearch}"` 
                    : 'No Command Center inventory items found. Click "Add Items" above to register items.'}
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </TableScrollWrapper>

      {/* Side Modal */}
      {selectedItem && (
        <SideModal>
          {/* Header */}
          <div className="p-4 bg-white sticky top-0 flex justify-between items-center border-b border-gray-100 z-10">
            <div>
              <CardSubHeader className="text-lg text-primary">
                {isEditing ? "Edit Command Item" : selectedItem.item_name}
              </CardSubHeader>
              <CardBasedText className="text-xs text-gray-400 font-medium mt-0.5">
                PDRRMO Command Center Inventory
              </CardBasedText>
            </div>
            <button onClick={() => setSelectedItem(null)} className="hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer">
              <X className="size-5 text-gray-500"/>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 grid gap-6 overflow-y-auto">
            {isEditing ? (
              /* ── EDIT MODE ── */
              <div className="grid gap-4">
                {/* Item Name */}
                <div className="grid gap-1">
                  <CardBasedText className="text-xs text-gray-700 font-semibold">Item Name *</CardBasedText>
                  <GeneralInput 
                    value={editForm.item_name} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, item_name: e.target.value }))} 
                  />
                </div>

                {/* Control Numbers */}
                <div className="grid gap-1">
                  <CardBasedText className="text-xs text-gray-700 font-semibold">
                    Control Numbers (Add up to {parseInt(editForm.total_quantity) || 0}) *
                  </CardBasedText>
                  <TagsInput 
                    value={editForm.control_numbers} 
                    onChange={(newTags) => setEditForm(prev => ({ ...prev, control_numbers: newTags }))} 
                    maxTags={parseInt(editForm.total_quantity) || 0}
                    disabled={!editForm.total_quantity || parseInt(editForm.total_quantity) === 0}
                    placeholder="Press space to add control number"
                  />
                  {parseInt(editForm.total_quantity) > 0 && editForm.control_numbers.length < parseInt(editForm.total_quantity) && (
                    <p className="text-xs text-amber-600 font-semibold mt-0.5">
                      Need {parseInt(editForm.total_quantity) - editForm.control_numbers.length} more control number(s).
                    </p>
                  )}
                </div>

                {/* Category & Item Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <CardBasedText className="text-xs text-gray-700 font-semibold">Category</CardBasedText>
                    <GeneralInput 
                      value={editForm.category} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))} 
                    />
                  </div>
                  <div className="grid gap-1">
                    <CardBasedText className="text-xs text-gray-700 font-semibold">Item Type</CardBasedText>
                    <GeneralInput 
                      value={editForm.item_type} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, item_type: e.target.value }))} 
                    />
                  </div>
                </div>

                {/* Total & Available Quantity */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <CardBasedText className="text-xs text-gray-700 font-semibold">Total Quantity *</CardBasedText>
                    <GeneralInput 
                      value={editForm.total_quantity} 
                      onChange={handleTotalQuantityChange} 
                      type="text"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="grid gap-1">
                    <CardBasedText className="text-xs text-gray-700 font-semibold">Available Quantity</CardBasedText>
                    <GeneralInput 
                      value={editForm.available_quantity} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, available_quantity: e.target.value.replace(/[^0-9]/g, "") }))} 
                      type="text"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {/* Price Each & Storage Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <CardBasedText className="text-xs text-gray-700 font-semibold">Price Per Unit (₱)</CardBasedText>
                    <GeneralInput 
                      value={editForm.price_each} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, price_each: e.target.value.replace(/[^0-9.]/g, "") }))} 
                      type="text"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="grid gap-1">
                    <CardBasedText className="text-xs text-gray-700 font-semibold">Storage Location</CardBasedText>
                    <GeneralInput 
                      value={editForm.storage_location} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, storage_location: e.target.value }))} 
                    />
                  </div>
                </div>

                {/* Purchased Date & Expiration Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <CardBasedText className="text-xs text-gray-700 font-semibold">Purchased Date</CardBasedText>
                    <Popover open={purchasedDateOpen} onOpenChange={setPurchasedDateOpen}>
                      <PopoverTrigger asChild>
                        <button 
                          type="button" 
                          className="flex w-full items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800"
                        >
                          <span>{purchasedDateObj ? format(purchasedDateObj, "PPP") : "Pick date"}</span>
                          <CalendarIcon className="size-3.5 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50 bg-white" align="start">
                        <Calendar
                          mode="single"
                          selected={purchasedDateObj}
                          onSelect={(date) => {
                            setEditForm(prev => ({ ...prev, purchased_date: date ? format(date, 'yyyy-MM-dd') : '' }))
                            setPurchasedDateOpen(false)
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid gap-1">
                    <CardBasedText className="text-xs text-gray-700 font-semibold">Expiration / Maint.</CardBasedText>
                    <Popover open={expirationDateOpen} onOpenChange={setExpirationDateOpen}>
                      <PopoverTrigger asChild>
                        <button 
                          type="button" 
                          className="flex w-full items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800"
                        >
                          <span>{expirationDateObj ? format(expirationDateObj, "PPP") : "Pick date"}</span>
                          <CalendarIcon className="size-3.5 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50 bg-white" align="start">
                        <Calendar
                          mode="single"
                          selected={expirationDateObj}
                          onSelect={(date) => {
                            setEditForm(prev => ({ ...prev, expiration_date: date ? format(date, 'yyyy-MM-dd') : '' }))
                            setExpirationDateOpen(false)
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            ) : (
              /* ── DETAILS VIEW MODE ── */
              <div className="grid gap-5">
                {/* Stock Status Banner */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="size-5 text-primary shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-gray-800">{selectedItem.item_name}</h4>
                      <p className="text-xs text-gray-400 font-medium">
                        {selectedItem.category || 'General Equipment'} • {selectedItem.item_type || 'Command Asset'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full border text-[11px] font-extrabold uppercase ${getStockStatusPill(selectedItem.available_quantity).style}`}>
                    {getStockStatusPill(selectedItem.available_quantity).label}
                  </span>
                </div>

                {/* Control Numbers */}
                <div className="grid gap-2">
                  <div className="flex items-center font-semibold gap-2">
                    <Hash className="text-primary size-4"/>
                    <CardSubHeader>Control Numbers</CardSubHeader>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                    {parseControlNumbers(selectedItem.control_number).length > 0 ? (
                      parseControlNumbers(selectedItem.control_number).map((tag, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-white text-gray-800 font-mono text-xs font-bold rounded-lg border border-gray-200 shadow-2xs flex items-center gap-1.5">
                          <Tag className="size-3 text-primary opacity-70" />
                          {tag}
                        </span>
                      ))
                    ) : (
                      <CardBasedText className="text-gray-400 text-xs">No control numbers recorded.</CardBasedText>
                    )}
                  </div>
                </div>

                {/* Quantities */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                    <div className="flex items-center font-semibold gap-2">
                      <Package className="text-primary size-4"/>
                      <CardSubHeader>Total Quantity</CardSubHeader>
                    </div>
                    <CardBasedText className="text-base font-bold text-gray-800">
                      {selectedItem.total_quantity ?? 0} units
                    </CardBasedText>
                  </div>

                  <div className="grid gap-1.5 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                    <div className="flex items-center font-semibold gap-2">
                      <Package className="text-primary size-4"/>
                      <CardSubHeader>Available Quantity</CardSubHeader>
                    </div>
                    <CardBasedText className="text-base font-bold text-primary">
                      {selectedItem.available_quantity ?? 0} units
                    </CardBasedText>
                  </div>
                </div>

                {/* Price & Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                    <div className="flex items-center font-semibold gap-2">
                      <DollarSign className="text-primary size-4"/>
                      <CardSubHeader>Price Per Unit</CardSubHeader>
                    </div>
                    <CardBasedText className="text-sm font-semibold text-gray-800">
                      {selectedItem.price_each ? `₱${Number(selectedItem.price_each).toLocaleString()}` : 'N/A'}
                    </CardBasedText>
                  </div>

                  <div className="grid gap-1.5 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                    <div className="flex items-center font-semibold gap-2">
                      <MapPin className="text-primary size-4"/>
                      <CardSubHeader>Storage Location</CardSubHeader>
                    </div>
                    <CardBasedText className="text-sm font-semibold text-gray-800">
                      {selectedItem.storage_location || 'PDRRMO Command Center'}
                    </CardBasedText>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid gap-3 p-3 bg-gray-50/60 rounded-xl border border-gray-100 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-primary" /> Purchased Date
                    </span>
                    <span className="font-bold text-gray-800">
                      {selectedItem.purchased_date ? format(new Date(selectedItem.purchased_date), 'MMMM dd, yyyy') : 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-200/60">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-amber-600" /> Expiration / Maint.
                    </span>
                    <span className="font-bold text-gray-800">
                      {selectedItem.expiration_date ? format(new Date(selectedItem.expiration_date), 'MMMM dd, yyyy') : 'N/A'}
                    </span>
                  </div>

                  {selectedItem.created_at && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200/60">
                      <span className="text-gray-400 font-medium flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 text-gray-400" /> Date Registered
                      </span>
                      <span className="text-gray-500 font-medium">
                        {format(new Date(selectedItem.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-white sticky bottom-0 z-10">
            {isEditing ? (
              <>
                <button 
                  onClick={() => setIsEditing(false)} 
                  disabled={isUpdating}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <PrimaryButton 
                  onClick={handleSaveUpdate} 
                  disabled={isUpdating}
                  className="flex items-center gap-2"
                >
                  {isUpdating ? <Loader2 className="size-4 animate-spin"/> : null}
                  {isUpdating ? "Saving..." : "Save Changes"}
                </PrimaryButton>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleDelete(selectedItem.item_id)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs text-red-500 font-semibold hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="size-4" />
                  <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                </button>

                <PrimaryButton 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Pencil className="size-3.5" />
                  <span>Edit Item</span>
                </PrimaryButton>
              </>
            )}
          </div>
        </SideModal>
      )}
    </Table>
  )
}
