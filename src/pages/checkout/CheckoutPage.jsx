import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { FiMapPin, FiPlus } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { addressesAPI, ordersAPI } from '../../api/api'
import { clearCartState } from '../../store/cartSlice'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { items, subTotal } = useSelector((s) => s.cart)
  const { user } = useSelector((s) => s.auth)

  const [addresses, setAddresses] = useState([])
  const [selectedAddr, setSelectedAddr] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [coupon, setCoupon] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [showAddrForm, setShowAddrForm] = useState(false)
  const [addrForm, setAddrForm] = useState({
    fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', addressType: 'Home', isDefault: false
  })

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (items.length === 0) { navigate('/cart'); return }
    loadAddresses()
  }, [])

  const loadAddresses = async () => {
    try {
      const { data } = await addressesAPI.getAll()
      if (data.success) {
        setAddresses(data.data || [])
        const def = data.data?.find((a) => a.isDefault) || data.data?.[0]
        if (def) setSelectedAddr(def.id)
      }
    } catch { /* */ }
    setLoading(false)
  }

  const handleAddAddress = async (e) => {
    e.preventDefault()
    try {
      const { data } = await addressesAPI.add(addrForm)
      if (data.success) {
        toast.success('Address added')
        setAddresses((prev) => [...prev, data.data])
        setSelectedAddr(data.data.id)
        setShowAddrForm(false)
      } else toast.error(data.message)
    } catch (err) { toast.error('Failed to add address') }
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddr) { toast.error('Select a delivery address'); return }
    setPlacing(true)
    try {
      const { data } = await ordersAPI.create({
        shippingAddressId: selectedAddr,
        paymentMethod,
        couponCode: coupon || null,
        notes: notes || null,
      })
      if (data.success) {
        toast.success('Order placed successfully! 🎉')
        dispatch(clearCartState())
        navigate(`/orders/${data.data.id}`)
      } else toast.error(data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to place order') }
    setPlacing(false)
  }

  const shipping = subTotal >= 999 ? 0 : 79
  const total = subTotal + shipping

  if (loading) return <LoadingSpinner text="Loading checkout..." />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Address */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2"><FiMapPin /> Delivery Address</h3>
              <button onClick={() => setShowAddrForm(!showAddrForm)}
                className="text-primary text-sm font-medium flex items-center gap-1"><FiPlus size={14} /> Add New</button>
            </div>

            {showAddrForm && (
              <form onSubmit={handleAddAddress} className="grid grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
                <input placeholder="Full Name" required value={addrForm.fullName} onChange={(e) => setAddrForm({ ...addrForm, fullName: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Phone" required value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Address Line 1" required value={addrForm.addressLine1} onChange={(e) => setAddrForm({ ...addrForm, addressLine1: e.target.value })} className="col-span-2 border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Address Line 2" value={addrForm.addressLine2} onChange={(e) => setAddrForm({ ...addrForm, addressLine2: e.target.value })} className="col-span-2 border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="City" required value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="State" required value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Pincode" required value={addrForm.pincode} onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <select value={addrForm.addressType} onChange={(e) => setAddrForm({ ...addrForm, addressType: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="Home">Home</option><option value="Work">Work</option><option value="Other">Other</option>
                </select>
                <button type="submit" className="col-span-2 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition">Save Address</button>
              </form>
            )}

            <div className="space-y-3">
              {addresses.map((addr) => (
                <label key={addr.id} className={`block p-4 rounded-lg border-2 cursor-pointer transition ${selectedAddr === addr.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="address" checked={selectedAddr === addr.id} onChange={() => setSelectedAddr(addr.id)} className="mr-3" />
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{addr.addressType}</span>
                  {addr.isDefault && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded font-medium ml-1">Default</span>}
                  <p className="font-medium mt-1">{addr.fullName}</p>
                  <p className="text-sm text-gray-600">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
                  <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                  <p className="text-sm text-gray-500">Phone: {addr.phone}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-display font-semibold text-lg mb-4">Payment Method</h3>
            <div className="space-y-3">
              {[['COD', 'Cash on Delivery', '💰'], ['UPI', 'UPI / Google Pay / PhonePe', '📱'], ['Card', 'Credit / Debit Card', '💳']].map(([val, label, icon]) => (
                <label key={val} className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${paymentMethod === val ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                  <input type="radio" name="payment" value={val} checked={paymentMethod === val} onChange={(e) => setPaymentMethod(e.target.value)} />
                  <span className="text-xl">{icon}</span>
                  <span className="font-medium text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-display font-semibold text-lg mb-3">Order Notes (optional)</h3>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions..."
              className="w-full border rounded-lg px-3 py-2 text-sm h-20 resize-none" />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm h-fit sticky top-24">
          <h3 className="font-display font-semibold text-lg mb-4">Order Summary</h3>
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600 truncate max-w-[60%]">{item.productName} × {item.quantity}</span>
                <span>₹{item.totalPrice?.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
          <hr />
          <div className="space-y-3 mt-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{subTotal?.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Shipping</span>
              <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
            </div>

            {/* Coupon */}
            <div className="flex gap-2">
              <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
              <button className="text-primary text-sm font-medium">Apply</button>
            </div>

            <hr />
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">₹{total?.toLocaleString('en-IN')}</span></div>
          </div>
          <button onClick={handlePlaceOrder} disabled={placing}
            className="w-full bg-primary text-white font-semibold py-3 rounded-lg mt-6 hover:bg-primary-dark transition disabled:opacity-50">
            {placing ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
