import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FiArrowLeft, FiPackage, FiTruck, FiCheckCircle } from 'react-icons/fi'
import { ordersAPI } from '../../api/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const STATUS_STEPS = ['Pending', 'Processing', 'Shipped', 'Delivered']

export default function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await ordersAPI.getById(id)
        if (data.success) setOrder(data.data)
      } catch { /* */ }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <LoadingSpinner />
  if (!order) return <div className="text-center py-20"><p className="text-gray-500">Order not found</p></div>

  const currentStep = STATUS_STEPS.indexOf(order.orderStatus)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/orders" className="text-primary text-sm font-medium flex items-center gap-1 mb-6 hover:underline"><FiArrowLeft /> Back to Orders</Link>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Order #{order.orderNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span className="text-2xl font-bold text-primary">₹{order.totalAmount?.toLocaleString('en-IN')}</span>
        </div>

        {/* Status Tracker */}
        {order.orderStatus !== 'Cancelled' && (
          <div className="flex items-center justify-between mb-8 px-4">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex flex-col items-center flex-1 relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${i <= currentStep ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {i === 0 && <FiPackage size={18} />}
                  {i === 1 && <FiPackage size={18} />}
                  {i === 2 && <FiTruck size={18} />}
                  {i === 3 && <FiCheckCircle size={18} />}
                </div>
                <span className={`text-xs mt-2 ${i <= currentStep ? 'text-primary font-medium' : 'text-gray-400'}`}>{step}</span>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`absolute top-5 left-1/2 w-full h-0.5 ${i < currentStep ? 'bg-primary' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {order.orderStatus === 'Cancelled' && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">This order has been cancelled.</div>
        )}

        {order.trackingNumber && (
          <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm mb-6">
            Tracking Number: <span className="font-mono font-bold">{order.trackingNumber}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-display font-semibold text-lg mb-4">Items</h3>
        <div className="space-y-4">
          {order.items?.map((item) => (
            <div key={item.id} className="flex gap-4">
              <div className="w-16 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                <img src={item.imageUrl || '/placeholder-saree.jpg'} alt={item.productName} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <Link to={`/product/${item.productId}`} className="font-medium text-sm hover:text-primary transition">{item.productName}</Link>
                <p className="text-sm text-gray-500">Qty: {item.quantity} × ₹{item.unitPrice?.toLocaleString('en-IN')}</p>
              </div>
              <span className="font-bold text-sm">₹{item.totalPrice?.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-display font-semibold text-lg mb-4">Payment Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{order.subTotal?.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Discount</span><span>-₹{order.discountAmount?.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Tax (GST)</span><span>₹{order.taxAmount?.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Shipping</span>
            <span className={order.shippingCharge === 0 ? 'text-green-600' : ''}>{order.shippingCharge === 0 ? 'FREE' : `₹${order.shippingCharge}`}</span>
          </div>
          <hr />
          <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">₹{order.totalAmount?.toLocaleString('en-IN')}</span></div>
          <p className="text-gray-500 text-xs mt-2">Payment: {order.paymentMethod} ({order.paymentStatus})</p>
        </div>
      </div>
    </div>
  )
}
