import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FiPackage, FiEye } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { ordersAPI } from '../../api/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Processing: 'bg-blue-100 text-blue-700',
  Shipped: 'bg-purple-100 text-purple-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
}

export default function OrdersPage() {
  const { user } = useSelector((s) => s.auth)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await ordersAPI.getAll()
        if (data.success) setOrders(data.data || [])
      } catch { /* */ }
      setLoading(false)
    }
    if (user) load()
  }, [user])

  const handleCancel = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    try {
      const { data } = await ordersAPI.cancel(orderId)
      if (data.success) {
        toast.success('Order cancelled')
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, orderStatus: 'Cancelled' } : o))
      } else toast.error(data.message)
    } catch (err) { toast.error('Failed to cancel order') }
  }

  if (!user) return <div className="text-center py-20"><Link to="/login" className="text-primary font-medium">Login to view orders</Link></div>
  if (loading) return <LoadingSpinner text="Loading orders..." />

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <FiPackage size={60} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-display font-bold text-gray-700 mb-2">No Orders Yet</h2>
          <Link to="/shop" className="text-primary font-medium hover:underline">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
                  <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[order.orderStatus] || 'bg-gray-100 text-gray-700'}`}>
                    {order.orderStatus}
                  </span>
                  <span className="text-lg font-bold text-primary">₹{order.totalAmount?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 shrink-0 bg-gray-50 rounded-lg p-2 pr-4">
                    <div className="w-12 h-16 rounded overflow-hidden bg-gray-200">
                      <img src={item.imageUrl || '/placeholder-saree.jpg'} alt={item.productName} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{item.productName}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity} × ₹{item.unitPrice?.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Link to={`/orders/${order.id}`} className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
                  <FiEye size={14} /> View Details
                </Link>
                {(order.orderStatus === 'Pending' || order.orderStatus === 'Processing') && (
                  <button onClick={() => handleCancel(order.id)} className="text-red-500 text-sm font-medium hover:underline">Cancel Order</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
