import { useState, useEffect } from "react"
import SideModal from "@/components/Modal/SideModal"
import CardSubHeader from "@/components/cards/CardSubHeader"
import PrimaryButton from "@/components/button/PrimaryButton"
import CardBasedText from "@/components/cards/CardBasedText"
import GeneralInput from "@/components/forms/GeneralInput"
import TextArea from "@/components/forms/TextArea"
import TagsInput from "@/components/forms/TagsInput"
import { 
  X, 
  SquareDashed, 
  ToolCase, 
  Hash, 
  Package, 
  FileText, 
  CalendarDays, 
  User, 
  Loader2, 
  ShieldAlert, 
  Pencil, 
  Trash2, 
  Tag 
} from "lucide-react"
import { supabase } from "@/supabase/util/supabase"
import DeleteUtilConfirmationModal from "./DeleteUtilConfirmationModal"

export default function UtilTableModal({ item, onClose, onDeleteSuccess }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    type: "",
    serial_number: [],
    quantity: "",
    description: ""
  })

  useEffect(() => {
    if (item) {
      setEditForm({
        name: item.name || "",
        type: item.type || "",
        serial_number: item.serial_number ? item.serial_number.split(',').map(s => s.trim()).filter(Boolean) : [],
        quantity: item.quantity?.toString() || "",
        description: item.description || ""
      })
      setIsEditing(false)
    }
  }, [item])

  const handleQuantityChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, "")
    setEditForm(prev => {
      const num = parseInt(val) || 0
      let newTags = prev.serial_number
      if (newTags.length > num) newTags = newTags.slice(0, num)
      return { ...prev, quantity: val, serial_number: newTags }
    })
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('utilities')
        .delete()
        .eq('id', item.id)
      
      if (error) throw error
      
      setShowDeleteModal(false)
      onDeleteSuccess()
    } catch (error) {
      console.error("Error deleting utility:", error)
      alert("Failed to delete the utility.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveUpdate = async () => {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('utilities')
        .update({
          name: editForm.name,
          type: editForm.type,
          quantity: parseInt(editForm.quantity) || 0,
          serial_number: editForm.serial_number.join(', '),
          description: editForm.description
        })
        .eq('id', item.id)

      if (error) throw error

      setIsEditing(false)
      onDeleteSuccess()
    } catch (error) {
      console.error("Error updating utility:", error)
      alert("Failed to update the utility.")
    } finally {
      setIsUpdating(false)
    }
  }

  if (!item) return null;

  const getStockStatusPill = (qty) => {
    const num = Number(qty) || 0
    if (num === 0) return { label: 'Out of Stock', style: 'bg-red-100 text-red-700 border-red-200' }
    if (num <= 2) return { label: 'Low Stock', style: 'bg-amber-100 text-amber-700 border-amber-200' }
    return { label: 'In Stock', style: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  }

  const stockPill = getStockStatusPill(item.quantity)
  const serialTags = item.serial_number ? item.serial_number.split(',').map(s => s.trim()).filter(Boolean) : []

  return (
    <>
      <SideModal>
        {/* Header */}
        <div className="p-4 bg-white sticky top-0 flex justify-between items-center border-b border-gray-100 z-10">
          <div>
            <CardSubHeader className="text-lg text-primary">
              {isEditing ? "Edit Utility Item" : item.name}
            </CardSubHeader>
            <CardBasedText className="text-xs text-gray-400 font-medium mt-0.5">
              Shared Municipal Inventory
            </CardBasedText>
          </div>
          <button onClick={onClose} className="hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer">
            <X className="size-5 text-gray-500"/>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 grid gap-5 overflow-y-auto">
          {isEditing ? (
            /* ── EDIT MODE ── */
            <div className="grid gap-4">
              {/* Utility Name */}
              <div className="grid gap-1">
                <CardBasedText className="text-xs text-gray-700 font-semibold">Utility Name *</CardBasedText>
                <GeneralInput 
                  value={editForm.name} 
                  onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))} 
                />
              </div>

              {/* Utility Type */}
              <div className="grid gap-1">
                <CardBasedText className="text-xs text-gray-700 font-semibold">Utility Type *</CardBasedText>
                <GeneralInput 
                  value={editForm.type} 
                  onChange={(e) => setEditForm(prev => ({...prev, type: e.target.value}))} 
                />
              </div>

              {/* Serial Numbers */}
              <div className="grid gap-1">
                <CardBasedText className="text-xs text-gray-700 font-semibold">
                  Serial Numbers (Add up to {parseInt(editForm.quantity) || 0})
                </CardBasedText>
                <TagsInput 
                  value={editForm.serial_number}
                  onChange={(tags) => setEditForm(prev => ({...prev, serial_number: tags}))}
                  maxTags={parseInt(editForm.quantity) || 0}
                  disabled={!editForm.quantity}
                  placeholder={editForm.quantity ? `Add up to ${editForm.quantity} serials (press space)` : 'Set quantity first'}
                />
              </div>

              {/* Quantity */}
              <div className="grid gap-1">
                <CardBasedText className="text-xs text-gray-700 font-semibold">Quantity *</CardBasedText>
                <GeneralInput 
                  value={editForm.quantity} 
                  onChange={handleQuantityChange}
                  type="text"
                  inputMode="numeric"
                />
              </div>

              {/* Description */}
              <div className="grid gap-1">
                <CardBasedText className="text-xs text-gray-700 font-semibold">Item Description</CardBasedText>
                <TextArea 
                  value={editForm.description} 
                  onChange={(e) => setEditForm(prev => ({...prev, description: e.target.value}))} 
                  className="text-xs"
                />
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
                    <h4 className="font-bold text-sm text-gray-800">{item.name}</h4>
                    <p className="text-xs text-gray-400 font-medium">{item.type || 'General Utility'}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full border text-[11px] font-extrabold uppercase ${stockPill.style}`}>
                  {stockPill.label}
                </span>
              </div>

              {/* Serial Numbers */}
              <div className="grid gap-2">
                <div className="flex items-center font-semibold gap-2">
                  <Hash className="text-primary size-4"/>
                  <CardSubHeader>Serial Numbers</CardSubHeader>
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                  {serialTags.length > 0 ? (
                    serialTags.map((sn, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white text-gray-800 font-mono text-xs font-bold rounded-lg border border-gray-200 shadow-2xs flex items-center gap-1.5">
                        <Tag className="size-3 text-primary opacity-70" />
                        {sn}
                      </span>
                    ))
                  ) : (
                    <CardBasedText className="text-gray-400 text-xs">No serial numbers recorded.</CardBasedText>
                  )}
                </div>
              </div>

              {/* Utility Type & Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                  <div className="flex items-center font-semibold gap-2">
                    <ToolCase className="text-primary size-4"/>
                    <CardSubHeader>Utility Type</CardSubHeader>
                  </div>
                  <CardBasedText className="text-sm font-semibold text-gray-800">{item.type || 'N/A'}</CardBasedText>
                </div>

                <div className="grid gap-1.5 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                  <div className="flex items-center font-semibold gap-2">
                    <Package className="text-primary size-4"/>
                    <CardSubHeader>Total Quantity</CardSubHeader>
                  </div>
                  <CardBasedText className="text-base font-bold text-primary">{item.quantity} units</CardBasedText>
                </div>
              </div>

              {/* Description */}
              <div className="grid gap-1.5 p-3 bg-gray-50/60 rounded-xl border border-gray-100">
                <div className="flex items-center font-semibold gap-2">
                  <FileText className="text-primary size-4"/>
                  <CardSubHeader>Description</CardSubHeader>
                </div>
                <CardBasedText className="text-xs text-gray-600 leading-relaxed">
                  {item.description || "No description provided."}
                </CardBasedText>
              </div>

              {/* Added By & Date Added */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50/60 rounded-xl border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <User className="size-3.5 text-primary" /> Registered By
                  </span>
                  <span className="font-bold text-gray-800 block mt-0.5">
                    {item.profiles?.full_name || 'System'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-primary" /> Date Registered
                  </span>
                  <span className="font-bold text-gray-800 block mt-0.5">
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
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
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1.5 text-xs text-red-500 font-semibold hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="size-4" />
                <span>Delete</span>
              </button>

              <PrimaryButton 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs"
              >
                <Pencil className="size-3.5" />
                <span>Edit Utility</span>
              </PrimaryButton>
            </>
          )}
        </div>
      </SideModal>

      {showDeleteModal && (
        <DeleteUtilConfirmationModal 
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </>
  )
}
