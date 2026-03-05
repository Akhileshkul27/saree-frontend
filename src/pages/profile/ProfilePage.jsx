import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { FiUser, FiMail, FiPhone, FiCamera, FiSave } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { fetchCurrentUser } from '../../store/authSlice'
import { authAPI } from '../../api/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function ProfilePage() {
  const dispatch = useDispatch()
  const { user, loading: authLoading } = useSelector((s) => s.auth)
  const [form, setForm] = useState({ fullName: '', email: '', phoneNumber: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({ fullName: user.fullName || '', email: user.email || '', phoneNumber: user.phoneNumber || '' })
    }
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await authAPI.updateProfile(form)
      if (data.success) {
        toast.success('Profile updated')
        dispatch(fetchCurrentUser())
      } else toast.error(data.message)
    } catch (err) { toast.error('Failed to update profile') }
    setSaving(false)
  }

  if (authLoading) return <LoadingSpinner />

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">My Profile</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-burgundy p-6 text-white text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-3 relative">
            <FiUser size={32} />
          </div>
          <h2 className="text-xl font-display font-bold">{user?.fullName}</h2>
          <p className="text-white/80 text-sm">{user?.email}</p>
          <p className="text-xs bg-white/20 inline-block px-3 py-1 rounded-full mt-2 capitalize">{user?.role}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" value={form.email} disabled
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="tel" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="+91 XXXXXXXXXX" />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-gray-400">
              Joined: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
            </div>
            <button type="submit" disabled={saving}
              className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition flex items-center gap-2 disabled:opacity-50">
              <FiSave size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
