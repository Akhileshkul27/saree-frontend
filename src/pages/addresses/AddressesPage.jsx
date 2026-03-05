import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { FiMapPin, FiEdit2, FiTrash2, FiPlus, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { addressesAPI } from '../../api/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const EMPTY_FORM = { fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', addressType: 'Home', isDefault: false }

export default function AddressesPage() {
  const { user } = useSelector((s) => s.auth)
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) load() }, [user])

  const load = async () => {
    try {
      const { data } = await addressesAPI.getAll()
      if (data.success) setAddresses(data.data || [])
    } catch { /* */ }
    setLoading(false)
  }

  const openAdd = () => { setForm(EMPTY_FORM); setEditMode(null); setShowForm(true) }
  const openEdit = (addr) => {
    setForm({ fullName: addr.fullName, phone: addr.phone, addressLine1: addr.addressLine1, addressLine2: addr.addressLine2 || '', city: addr.city, state: addr.state, pincode: addr.pincode, addressType: addr.addressType, isDefault: addr.isDefault })
    setEditMode(addr.id); setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editMode) {
        const { data } = await addressesAPI.update(editMode, form)
        if (data.success) { toast.success('Address updated'); load(); setShowForm(false) }
        else toast.error(data.message)
      } else {
        const { data } = await addressesAPI.add(form)
        if (data.success) { toast.success('Address added'); load(); setShowForm(false) }
        else toast.error(data.message)
      }
    } catch { toast.error('Failed to save address') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this address?')) return
    try {
      const { data } = await addressesAPI.delete(id)
      if (data.success) { toast.success('Address deleted'); setAddresses((prev) => prev.filter((a) => a.id !== id)) }
      else toast.error(data.message)
    } catch { toast.error('Failed to delete') }
  }

  if (loading) return <LoadingSpinner text="Loading addresses..." />

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900">My Addresses</h1>
        <button onClick={openAdd} className="bg-primary text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary-dark transition flex items-center gap-1.5">
          <FiPlus size={16} /> Add Address
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h3 className="font-display font-semibold text-lg mb-4">{editMode ? 'Edit Address' : 'Add New Address'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Full Name *" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="border rounded-lg px-3 py-2.5" />
            <input placeholder="Phone *" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border rounded-lg px-3 py-2.5" />
            <input placeholder="Address Line 1 *" required value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} className="md:col-span-2 border rounded-lg px-3 py-2.5" />
            <input placeholder="Address Line 2" value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} className="md:col-span-2 border rounded-lg px-3 py-2.5" />
            <input placeholder="City *" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="border rounded-lg px-3 py-2.5" />
            <input placeholder="State *" required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="border rounded-lg px-3 py-2.5" />
            <input placeholder="Pincode *" required value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="border rounded-lg px-3 py-2.5" />
            <select value={form.addressType} onChange={(e) => setForm({ ...form, addressType: e.target.value })} className="border rounded-lg px-3 py-2.5">
              <option value="Home">Home</option><option value="Work">Work</option><option value="Other">Other</option>
            </select>
            <label className="md:col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="rounded" />
              Set as default address
            </label>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition disabled:opacity-50">
                {saving ? 'Saving...' : editMode ? 'Update Address' : 'Add Address'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 border rounded-lg text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="text-center py-20">
          <FiMapPin size={60} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-display font-bold text-gray-700 mb-2">No Addresses Yet</h2>
          <p className="text-gray-500 mb-4">Add a delivery address to get started</p>
          <button onClick={openAdd} className="bg-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-primary-dark transition">Add Address</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-white rounded-xl p-5 shadow-sm relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{addr.addressType}</span>
                {addr.isDefault && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded font-medium flex items-center gap-0.5"><FiCheck size={10} /> Default</span>}
              </div>
              <h3 className="font-semibold text-gray-900">{addr.fullName}</h3>
              <p className="text-sm text-gray-600 mt-1">{addr.addressLine1}</p>
              {addr.addressLine2 && <p className="text-sm text-gray-600">{addr.addressLine2}</p>}
              <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
              <p className="text-sm text-gray-500 mt-1">Phone: {addr.phone}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(addr)} className="text-primary text-sm font-medium flex items-center gap-1 hover:underline"><FiEdit2 size={13} /> Edit</button>
                <button onClick={() => handleDelete(addr.id)} className="text-red-500 text-sm font-medium flex items-center gap-1 hover:underline"><FiTrash2 size={13} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
