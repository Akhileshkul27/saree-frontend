import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { FiMail, FiLock, FiUser, FiPhone, FiEye, FiEyeOff } from 'react-icons/fi'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { loginUser, registerUser, clearError } from '../../store/authSlice'

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' })
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error } = useSelector((s) => s.auth)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const action = isRegister ? registerUser(form) : loginUser({ email: form.email, password: form.password })
    const result = await dispatch(action)
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(isRegister ? 'Welcome to SareeGrace!' : 'Welcome back!')
      navigate('/')
    } else {
      toast.error(result.payload || 'Something went wrong')
    }
  }

  const toggle = () => { setIsRegister(!isRegister); dispatch(clearError()) }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="gradient-primary p-6 sm:p-8 text-center saree-pattern">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-1">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-white/70 text-sm">
              {isRegister ? 'Join SareeGrace and start shopping' : 'Sign in to your SareeGrace account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4">
            {isRegister && (
              <div className="grid grid-cols-2 gap-3">
                <InputField icon={FiUser} placeholder="First Name" value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                <InputField icon={FiUser} placeholder="Last Name" value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            )}

            <InputField icon={FiMail} type="email" placeholder="Email address" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required />

            {isRegister && (
              <InputField icon={FiPhone} placeholder="Phone number" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            )}

            <div className="relative">
              <InputField icon={FiLock} type={showPass ? 'text' : 'password'} placeholder="Password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowPass(!showPass)}>
                {showPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-dark transition disabled:opacity-50">
              {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
            </button>

            <p className="text-center text-sm text-gray-500">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" onClick={toggle} className="text-primary font-medium hover:underline">
                {isRegister ? 'Sign In' : 'Create Account'}
              </button>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

function InputField({ icon: Icon, ...props }) {
  return (
    <div className="flex items-center border rounded-lg px-3 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition">
      <Icon className="text-gray-400 mr-2 shrink-0" size={18} />
      <input {...props} className="w-full outline-none text-sm" />
    </div>
  )
}
