import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { FiTrash2, FiMinus, FiPlus, FiShoppingCart, FiArrowRight } from 'react-icons/fi'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { fetchCart, updateCartItem, removeCartItem } from '../../store/cartSlice'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function CartPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, subTotal, loading } = useSelector((s) => s.cart)
  const { user } = useSelector((s) => s.auth)

  useEffect(() => {
    if (user) dispatch(fetchCart())
  }, [user])

  const handleQtyChange = async (itemId, newQty) => {
    if (newQty < 1) return
    const res = await dispatch(updateCartItem({ itemId, quantity: newQty }))
    if (res.meta.requestStatus !== 'fulfilled') toast.error(res.payload || 'Failed to update')
  }

  const handleRemove = async (itemId) => {
    await dispatch(removeCartItem(itemId))
    toast.success('Removed from cart')
  }

  const shipping = subTotal >= 999 ? 0 : 0
  const total = subTotal + shipping

  if (!user) return (
    <div className="text-center py-20">
      <FiShoppingCart size={60} className="mx-auto text-gray-300 mb-4" />
      <h2 className="text-2xl font-display font-bold text-gray-700 mb-2">Please Login</h2>
      <p className="text-gray-500 mb-4">Sign in to view your cart</p>
      <Link to="/login" className="bg-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-primary-dark transition">Login</Link>
    </div>
  )

  if (loading) return <LoadingSpinner text="Loading your cart..." />

  if (items.length === 0) return (
    <div className="text-center py-20">
      <FiShoppingCart size={60} className="mx-auto text-gray-300 mb-4" />
      <h2 className="text-2xl font-display font-bold text-gray-700 mb-2">Your Cart is Empty</h2>
      <p className="text-gray-500 mb-4">Start adding beautiful sarees to your cart!</p>
      <Link to="/shop" className="bg-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-primary-dark transition inline-flex items-center gap-2">
        Continue Shopping <FiArrowRight />
      </Link>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mb-6 sm:mb-8">Shopping Cart ({items.length} items)</h1>

      <div className="grid lg:grid-cols-3 gap-5 sm:gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {items.map((item) => (
            <motion.div key={item.id} layout className="bg-white rounded-xl p-3 sm:p-4 shadow-sm flex gap-3 sm:gap-4">
              <Link to={`/product/${item.productId}`} className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                <img src={item.imageUrl || '/placeholder-saree.jpg'} alt={item.productName} className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/product/${item.productId}`} className="font-display font-semibold text-gray-900 hover:text-primary transition line-clamp-2 text-sm sm:text-base block">{item.productName}</Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-primary font-bold text-sm sm:text-base">₹{item.sellingPrice?.toLocaleString('en-IN')}</span>
                  {item.discountPercent > 0 && <span className="text-xs sm:text-sm text-gray-400 line-through">₹{item.basePrice?.toLocaleString('en-IN')}</span>}
                </div>
                <div className="flex items-center justify-between mt-2 sm:mt-3">
                  <div className="flex items-center border rounded-lg">
                    <button onClick={() => handleQtyChange(item.id, item.quantity - 1)} className="px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-gray-50"><FiMinus size={12} /></button>
                    <span className="px-2 sm:px-3 py-1 sm:py-1.5 border-x text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => handleQtyChange(item.id, item.quantity + 1)} className="px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-gray-50"><FiPlus size={12} /></button>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <span className="font-bold text-gray-900 text-sm sm:text-base">₹{item.totalPrice?.toLocaleString('en-IN')}</span>
                    <button onClick={() => handleRemove(item.id)} className="text-red-500 hover:bg-red-50 p-1.5 sm:p-2 rounded-lg transition"><FiTrash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm h-fit sticky top-24">
          <h3 className="font-display font-semibold text-lg mb-4">Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{subTotal?.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Shipping</span>
              <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
            </div>
            {shipping > 0 && <p className="text-xs text-gray-400">Free shipping on orders above ₹999</p>}
            <hr />
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">₹{total?.toLocaleString('en-IN')}</span></div>
          </div>
          <button onClick={() => navigate('/checkout')}
            className="w-full bg-primary text-white font-semibold py-3 rounded-lg mt-6 hover:bg-primary-dark transition flex items-center justify-center gap-2">
            Proceed to Checkout <FiArrowRight />
          </button>
          <Link to="/shop" className="block text-center text-sm text-primary mt-3 hover:underline">Continue Shopping</Link>
        </div>
      </div>
    </div>
  )
}
