import { Link } from 'react-router-dom'
import { FiHeart, FiShoppingCart, FiStar } from 'react-icons/fi'
import { useDispatch, useSelector } from 'react-redux'
import { addToCart } from '../../store/cartSlice'
import { toggleWishlist } from '../../store/wishlistSlice'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function ProductCard({ product }) {
  const dispatch = useDispatch()
  const { user } = useSelector((s) => s.auth)
  const { items: wishItems } = useSelector((s) => s.wishlist)
  const isWished = wishItems.some((i) => i.productId === product.id)

  const handleAddToCart = async (e) => {
    e.preventDefault()
    if (!user) { toast.error('Please login first'); return }
    const res = await dispatch(addToCart({ productId: product.id }))
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Added to cart!')
    } else {
      toast.error(res.payload || 'Failed to add')
    }
  }

  const handleWishlist = async (e) => {
    e.preventDefault()
    if (!user) { toast.error('Please login first'); return }
    dispatch(toggleWishlist(product.id))
  }

  const discountBadge = product.discountPercent > 0
  const specialBadge = product.isSpecialOffer

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link to={`/product/${product.id}`} className="group block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300">
        {/* Image */}
        <div className="relative overflow-hidden aspect-[3/4]">
          <img
            src={product.primaryImageUrl || '/placeholder-saree.jpg'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {discountBadge && (
              <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full">
                -{product.discountPercent}%
              </span>
            )}
            {specialBadge && (
              <span className="bg-gold text-gray-900 text-xs font-bold px-2.5 py-1 rounded-full">
                Special Offer
              </span>
            )}
          </div>

          {/* Wishlist button */}
          <button onClick={handleWishlist}
            className={`absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full shadow-md transition ${isWished ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-primary hover:text-white'}`}>
            <FiHeart size={16} fill={isWished ? 'currentColor' : 'none'} />
          </button>

          {/* Quick Add */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button onClick={handleAddToCart}
              className="w-full bg-white text-primary font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition">
              <FiShoppingCart size={16} /> Add to Cart
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">{product.categoryName}</p>
          <h3 className="font-display font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-primary transition">
            {product.name}
          </h3>

          {/* Rating */}
          {product.averageRating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <FiStar key={i} size={12}
                  className={i < Math.round(product.averageRating) ? 'text-gold fill-gold' : 'text-gray-300'} />
              ))}
              <span className="text-xs text-gray-500 ml-1">({product.reviewCount})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">₹{product.sellingPrice?.toLocaleString('en-IN')}</span>
            {product.discountPercent > 0 && (
              <span className="text-sm text-gray-400 line-through">₹{product.basePrice?.toLocaleString('en-IN')}</span>
            )}
          </div>

          {/* Fabric */}
          <p className="text-xs text-gray-500 mt-1">{product.fabricType} • {product.color}</p>
        </div>
      </Link>
    </motion.div>
  )
}
