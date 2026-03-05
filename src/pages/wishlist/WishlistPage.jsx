import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { FiHeart, FiShoppingCart, FiTrash2 } from 'react-icons/fi'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { fetchWishlist, toggleWishlist } from '../../store/wishlistSlice'
import { addToCart, fetchCart } from '../../store/cartSlice'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function WishlistPage() {
  const dispatch = useDispatch()
  const { items, loading } = useSelector((s) => s.wishlist)
  const { user } = useSelector((s) => s.auth)

  useEffect(() => {
    if (user) dispatch(fetchWishlist())
  }, [user])

  const handleRemove = async (productId) => {
    await dispatch(toggleWishlist(productId))
    toast.success('Removed from wishlist')
  }

  const handleAddToCart = async (productId) => {
    const res = await dispatch(addToCart({ productId, quantity: 1 }))
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Added to cart!')
      dispatch(fetchCart())
    } else toast.error(res.payload || 'Failed to add')
  }

  if (!user) return (
    <div className="text-center py-20">
      <FiHeart size={60} className="mx-auto text-gray-300 mb-4" />
      <h2 className="text-2xl font-display font-bold text-gray-700 mb-2">Please Login</h2>
      <p className="text-gray-500 mb-4">Sign in to view your wishlist</p>
      <Link to="/login" className="bg-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-primary-dark transition">Login</Link>
    </div>
  )

  if (loading) return <LoadingSpinner text="Loading wishlist..." />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">My Wishlist ({items.length} items)</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <FiHeart size={60} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-display font-bold text-gray-700 mb-2">Your Wishlist is Empty</h2>
          <p className="text-gray-500 mb-4">Save sarees you love for later</p>
          <Link to="/shop" className="bg-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-primary-dark transition">Explore Sarees</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <motion.div key={item.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden group">
              <Link to={`/product/${item.productId}`} className="block relative aspect-[3/4] overflow-hidden bg-gray-100">
                <img src={item.imageUrl || '/placeholder-saree.jpg'} alt={item.productName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {item.discountPercent > 0 && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    {item.discountPercent}% OFF
                  </span>
                )}
              </Link>
              <div className="p-4">
                <Link to={`/product/${item.productId}`}>
                  <h3 className="font-display font-semibold text-gray-900 line-clamp-1 hover:text-primary transition">{item.productName}</h3>
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-primary font-bold">₹{item.sellingPrice?.toLocaleString('en-IN')}</span>
                  {item.discountPercent > 0 && (
                    <span className="text-sm text-gray-400 line-through">₹{item.basePrice?.toLocaleString('en-IN')}</span>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleAddToCart(item.productId)}
                    className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition flex items-center justify-center gap-1.5">
                    <FiShoppingCart size={14} /> Add to Cart
                  </button>
                  <button onClick={() => handleRemove(item.productId)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
