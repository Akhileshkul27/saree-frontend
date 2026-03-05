// ──────────────────────────────────────────────────────────────────────────────
// ProductDetailPage — Amazon-inspired layout
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  FiShoppingCart, FiHeart, FiStar, FiTruck, FiRefreshCw, FiShield,
  FiChevronLeft, FiChevronRight, FiCheckCircle, FiPackage, FiTag,
  FiZoomIn, FiShare2, FiChevronDown, FiChevronUp, FiX
} from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { productsAPI, reviewsAPI } from '../../api/api'
import { addToCart } from '../../store/cartSlice'
import { toggleWishlist } from '../../store/wishlistSlice'
import ProductCard from '../../components/product/ProductCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

/* ── helpers ── */
const isGuid = (s) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

function StarRow({ rating = 0, size = 16 }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? '#f5a623' : 'none'}
          stroke={i <= Math.round(rating) ? '#f5a623' : '#d1d5db'}
          strokeWidth="1.5">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  )
}

function RatingBar({ label, pct }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-primary w-10 shrink-0">{label} ★</span>
      <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

function SpecPill({ icon, label, value }) {
  if (!value) return null
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <span className="text-xs text-gray-400">{icon} {label}</span>
      <p className="font-semibold text-gray-800 text-sm mt-0.5 truncate">{value}</p>
    </div>
  )
}

export default function ProductDetailPage() {
  // Route: /product/:idOrSlug  — MUST match param name in App.jsx
  const { idOrSlug } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)
  const { items: wishItems } = useSelector((s) => s.wishlist)

  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg]   = useState(0)
  const [isZoomed,  setIsZoomed]    = useState(false)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' })

  // isWished uses the loaded product.id (not the route param)
  const isWished = wishItems.some((i) => i.productId === product?.id)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setProduct(null)
      setActiveImg(0)
      try {
        // Support both GUID ids and slug-based URLs
        const prodRes = isGuid(idOrSlug)
          ? await productsAPI.getById(idOrSlug)
          : await productsAPI.getBySlug(idOrSlug)

        if (prodRes.data.success) {
          const p = prodRes.data.data
          setProduct(p)
          // Load related & reviews using the confirmed numeric/guid id
          const [relRes, revRes] = await Promise.all([
            productsAPI.getRelated(p.id, 4),
            reviewsAPI.getForProduct(p.id),
          ])
          setRelated(relRes.data.data || [])
          setReviews(revRes.data.data || [])
        }
      } catch { /* silently handled — product stays null → shows not-found */ }
      setLoading(false)
    }
    if (idOrSlug) { load(); window.scrollTo(0, 0) }
  }, [idOrSlug])

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return }
    const res = await dispatch(addToCart({ productId: product.id, quantity: qty }))
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Added to cart!')
    } else {
      toast.error(res.payload || 'Failed to add to cart')
    }
  }

  const handleBuyNow = async () => {
    if (!user) { navigate('/login'); return }
    await dispatch(addToCart({ productId: product.id, quantity: qty }))
    navigate('/checkout')
  }

  const handleToggleWishlist = () => {
    if (!user) { navigate('/login'); return }
    dispatch(toggleWishlist(product.id))
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    try {
      const { data } = await reviewsAPI.add({ productId: product.id, ...reviewForm })
      if (data.success) {
        toast.success('Review submitted!')
        setReviews((prev) => [data.data, ...prev])
        setReviewForm({ rating: 5, title: '', comment: '' })
      } else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review')
    }
  }

  /* ── render guards ── */
  if (loading) return <LoadingSpinner />
  if (!product) return (
    <div className="text-center py-24">
      <span className="text-7xl mb-4 block">🪷</span>
      <h2 className="text-2xl font-display font-bold text-gray-700 mb-2">Product Not Found</h2>
      <p className="text-gray-500 mb-6">The saree you're looking for may have been moved or removed.</p>
      <Link to="/shop" className="inline-block bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-dark transition">Back to Shop</Link>
    </div>
  )

  const images = product.images?.length > 0
    ? product.images
    : [{ imageUrl: product.primaryImageUrl || '/placeholder-saree.jpg', altText: product.name }]

  // Rating breakdown from reviews
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    pct: reviews.length ? Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100) : 0,
  }))
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null

  /* ────────────── JSX ────────────── */
  return (
    <>
      {/* ── Lightbox ── */}
      {isZoomed && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setIsZoomed(false)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setIsZoomed(false)}><FiX size={28} /></button>
          <img src={images[activeImg]?.imageUrl} alt={product.name}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} />
          {images.length > 1 && (
            <div className="absolute bottom-6 flex gap-2">
              {images.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setActiveImg(i) }}
                  className={`w-2.5 h-2.5 rounded-full transition ${i === activeImg ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-5 flex items-center gap-1 flex-wrap">
          <Link to="/" className="hover:text-primary">Home</Link>
          <FiChevronRight size={12} />
          <Link to="/shop" className="hover:text-primary">Shop</Link>
          {product.categoryName && <><FiChevronRight size={12} /><Link to={`/shop?category=${product.categoryId}`} className="hover:text-primary">{product.categoryName}</Link></>}
          <FiChevronRight size={12} />
          <span className="text-gray-800 font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* Main 3-column Grid */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Col 1: Image Gallery ── */}
          <div className="lg:w-5/12">
            {/* Thumbnails + Main image */}
            <div className="flex gap-3">
              {/* Thumbnail column */}
              {images.length > 1 && (
                <div className="flex flex-col gap-2 w-16 shrink-0">
                  {images.map((img, i) => (
                    <button key={i} onMouseEnter={() => setActiveImg(i)} onClick={() => setActiveImg(i)}
                      className={`w-16 h-20 rounded border-2 overflow-hidden transition ${activeImg === i ? 'border-primary shadow' : 'border-gray-200 opacity-70 hover:opacity-100'}`}>
                      <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Main image */}
              <div className="relative flex-1 rounded-xl overflow-hidden bg-white shadow-md aspect-[3/4] group cursor-zoom-in"
                onClick={() => setIsZoomed(true)}>
                <AnimatePresence mode="wait">
                  <motion.img key={activeImg} src={images[activeImg]?.imageUrl}
                    alt={images[activeImg]?.altText || product.name}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} />
                </AnimatePresence>

                {/* Prev/Next arrows */}
                {images.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setActiveImg((p) => (p - 1 + images.length) % images.length) }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition">
                      <FiChevronLeft size={18} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveImg((p) => (p + 1) % images.length) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition">
                      <FiChevronRight size={18} />
                    </button>
                  </>
                )}

                {/* Zoom hint */}
                <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  <FiZoomIn size={12} /> Zoom
                </div>

                {/* Discount badge */}
                {product.discountPercent > 0 && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    -{product.discountPercent}% OFF
                  </span>
                )}
              </div>
            </div>

            {/* Share row */}
            <div className="flex items-center justify-end gap-3 mt-3 text-sm text-gray-500">
              <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!') }}
                className="flex items-center gap-1 hover:text-primary transition">
                <FiShare2 size={14} /> Share
              </button>
            </div>
          </div>

          {/* ── Col 2: Product Info ── */}
          <div className="lg:w-4/12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">{product.categoryName}</p>
            <h1 className="text-2xl font-display font-bold text-gray-900 leading-snug mb-2">{product.name}</h1>

            {/* Rating summary */}
            {avgRating && (
              <div className="flex items-center gap-2 mb-3">
                <StarRow rating={parseFloat(avgRating)} size={15} />
                <span className="text-sm text-primary font-semibold">{avgRating}</span>
                <span className="text-sm text-gray-400">&nbsp;{reviews.length} rating{reviews.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            <hr className="mb-4" />

            {/* Price block */}
            <div className="mb-4">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-bold text-gray-900">₹{product.sellingPrice?.toLocaleString('en-IN')}</span>
                {product.discountPercent > 0 && (
                  <>
                    <span className="text-lg text-gray-400 line-through">₹{product.basePrice?.toLocaleString('en-IN')}</span>
                    <span className="text-green-600 font-semibold text-sm">Save ₹{((product.basePrice - product.sellingPrice) || 0).toLocaleString('en-IN')}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Inclusive of all taxes &nbsp;|&nbsp; Free delivery available</p>
            </div>

            {/* Short description */}
            {product.shortDescription && <p className="text-sm text-gray-600 mb-4">{product.shortDescription}</p>}

            {/* Spec pills */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <SpecPill icon="🧵" label="Fabric" value={product.fabricType} />
              <SpecPill icon="🎨" label="Color" value={product.color} />
              <SpecPill icon="🌸" label="Pattern" value={product.pattern} />
              <SpecPill icon="✨" label="Occasion" value={product.occasion} />
              <SpecPill icon="📏" label="Length" value={product.length ? `${product.length} m` : null} />
              <SpecPill icon="↔" label="Width" value={product.width ? `${product.width} m` : null} />
              {product.hasBlousePiece && <SpecPill icon="👗" label="Blouse" value={`Yes — ${product.blouseLength || ''}m`} />}
              <SpecPill icon="🏷" label="SKU" value={product.sku} />
            </div>

            {/* Full description (collapsible) */}
            {product.description && (
              <div className="mb-4">
                <button className="text-sm text-primary font-medium flex items-center gap-1 mb-2"
                  onClick={() => setShowFullDesc((v) => !v)}>
                  {showFullDesc ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                  {showFullDesc ? 'Hide' : 'Show'} full description
                </button>
                {showFullDesc && <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>}
              </div>
            )}

            {/* Wash care */}
            {product.washCare && (
              <div className="text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2 mb-4">
                <span className="font-semibold text-blue-700">Wash Care: </span>{product.washCare}
              </div>
            )}

            {/* Stock */}
            <div className="mb-4">
              {product.stockCount > 0 ? (
                <span className="flex items-center gap-1 text-green-700 font-medium text-sm">
                  <FiCheckCircle size={15} /> In Stock
                  {product.stockCount <= 10 && <span className="text-orange-500 ml-1">— Only {product.stockCount} left!</span>}
                </span>
              ) : (
                <span className="text-red-600 font-semibold text-sm">Out of Stock</span>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex gap-4 text-xs text-gray-500 pt-3 border-t">
              <span className="flex items-center gap-1"><FiTruck size={13} className="text-primary" /> Free Shipping</span>
              <span className="flex items-center gap-1"><FiRefreshCw size={13} className="text-primary" /> 7-Day Returns</span>
              <span className="flex items-center gap-1"><FiShield size={13} className="text-primary" /> 100% Genuine</span>
            </div>
          </div>

          {/* ── Col 3: Buy Box ── */}
          <div className="lg:w-3/12">
            <div className="border rounded-xl p-5 shadow-sm sticky top-24 space-y-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">₹{product.sellingPrice?.toLocaleString('en-IN')}</p>
                {product.discountPercent > 0 && (
                  <p className="text-xs text-green-600 font-medium mt-0.5">
                    You save ₹{((product.basePrice - product.sellingPrice) || 0).toLocaleString('en-IN')} ({product.discountPercent}%)
                  </p>
                )}
              </div>

              {/* Delivery info */}
              <div className="text-sm text-gray-600 flex items-start gap-2">
                <FiPackage size={15} className="text-primary mt-0.5 shrink-0" />
                <span>Free delivery on orders above ₹999. Usually ships in 2–4 business days.</span>
              </div>

              {product.stockCount > 0 ? (
                <>
                  {/* Qty selector */}
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Quantity</label>
                    <div className="flex items-center border rounded-lg w-fit">
                      <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-lg hover:bg-gray-50 rounded-l-lg">−</button>
                      <span className="px-4 py-2 font-semibold border-x min-w-[2.5rem] text-center">{qty}</span>
                      <button onClick={() => setQty((q) => Math.min(product.stockCount, q + 1))} className="px-3 py-2 text-lg hover:bg-gray-50 rounded-r-lg">+</button>
                    </div>
                  </div>

                  {/* CTA buttons */}
                  <button onClick={handleAddToCart}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition">
                    <FiShoppingCart size={17} /> Add to Cart
                  </button>
                  <button onClick={handleBuyNow}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-lg transition">
                    Buy Now
                  </button>

                  {/* Wishlist */}
                  <button onClick={handleToggleWishlist}
                    className={`w-full py-2.5 rounded-lg border font-medium text-sm flex items-center justify-center gap-2 transition ${isWished ? 'bg-pink-50 border-pink-400 text-pink-600' : 'hover:border-primary hover:text-primary text-gray-600'}`}>
                    <FiHeart size={16} fill={isWished ? 'currentColor' : 'none'} />
                    {isWished ? 'Saved to Wishlist' : 'Add to Wishlist'}
                  </button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-red-600 font-semibold mb-3">Currently Out of Stock</p>
                  <button onClick={handleToggleWishlist} className="w-full py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:border-primary hover:text-primary transition flex items-center justify-center gap-2">
                    <FiHeart size={15} /> Notify Me
                  </button>
                </div>
              )}

              {/* Secure tag */}
              <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                <FiShield size={12} /> Secure transaction
              </p>

              {/* Sold by */}
              <div className="text-xs text-gray-500 pt-2 border-t">
                <p>Sold by &nbsp;<span className="font-semibold text-gray-700">SareeGrace Official</span></p>
                <p className="mt-0.5">Ships from &nbsp;<span className="font-semibold text-gray-700">SareeGrace Warehouse</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Product Details Table ── */}
        <section className="mt-12">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-4 pb-2 border-b">Product Details</h2>
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-2 text-sm max-w-2xl">
            {[
              ['Fabric / Material', product.fabricType],
              ['Color', product.color],
              ['Pattern / Print', product.pattern],
              ['Occasion', product.occasion],
              ['Saree Length', product.length ? `${product.length} metres` : null],
              ['Width', product.width ? `${product.width} metres` : null],
              ['Blouse Piece', product.hasBlousePiece ? `Yes (${product.blouseLength || '0.8'} m)` : 'No'],
              ['Wash Care', product.washCare],
              ['Weight', product.weight ? `${product.weight} g` : null],
              ['SKU', product.sku],
              ['Category', product.categoryName],
            ].map(([label, value]) => value ? (
              <div key={label} className="flex gap-3 py-1.5 border-b border-gray-100">
                <span className="text-gray-500 w-36 shrink-0">{label}</span>
                <span className="text-gray-800 font-medium">{value}</span>
              </div>
            ) : null)}
          </div>
        </section>

        {/* ── Ratings & Reviews ── */}
        <section className="mt-12">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-6 pb-2 border-b">
            Customer Reviews {reviews.length > 0 && <span className="text-gray-500 font-normal text-base">({reviews.length})</span>}
          </h2>
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Left: summary + write form */}
            <div className="lg:w-80 shrink-0">
              {/* Summary */}
              {reviews.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-5xl font-bold text-gray-900">{avgRating}</span>
                    <div>
                      <StarRow rating={parseFloat(avgRating)} size={18} />
                      <p className="text-xs text-gray-500 mt-1">{reviews.length} verified rating{reviews.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {ratingCounts.map(({ star, pct }) => <RatingBar key={star} label={star} pct={pct} />)}
                  </div>
                </div>
              )}

              {/* Write a review */}
              {user ? (
                <form onSubmit={handleReviewSubmit} className="bg-white rounded-xl border px-5 py-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Write a Review</h3>
                  <div className="mb-3">
                    <label className="text-xs text-gray-500 block mb-1">Your Rating</label>
                    <div className="flex gap-1">{[1, 2, 3, 4, 5].map((r) => (
                      <button key={r} type="button" onClick={() => setReviewForm((p) => ({ ...p, rating: r }))}>
                        <svg width={22} height={22} viewBox="0 0 24 24"
                          fill={r <= reviewForm.rating ? '#f5a623' : 'none'}
                          stroke={r <= reviewForm.rating ? '#f5a623' : '#d1d5db'}
                          strokeWidth="1.5">
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                        </svg>
                      </button>
                    ))}</div>
                  </div>
                  <input type="text" placeholder="Review title (optional)" value={reviewForm.title}
                    onChange={(e) => setReviewForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 mb-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  <textarea placeholder="Describe your experience…" value={reviewForm.comment}
                    onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 mb-3 text-sm h-24 resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition">
                    Submit Review
                  </button>
                </form>
              ) : (
                <div className="bg-gray-50 rounded-xl border px-5 py-4 text-center">
                  <p className="text-sm text-gray-600 mb-3">Sign in to leave a review</p>
                  <Link to="/login" className="inline-block bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition">Sign In</Link>
                </div>
              )}
            </div>

            {/* Right: reviews list */}
            <div className="flex-1 space-y-4">
              {reviews.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">💬</p>
                  <p className="font-medium text-gray-600">No reviews yet</p>
                  <p className="text-sm mt-1">Be the first to review this saree!</p>
                </div>
              ) : reviews.map((rev) => (
                <div key={rev.id} className="bg-white rounded-xl border px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StarRow rating={rev.rating} size={13} />
                      {rev.isVerifiedPurchase && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                          <FiCheckCircle size={11} /> Verified Purchase
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(rev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mb-0.5">{rev.title || ''}</p>
                  <p className="text-sm text-gray-600">{rev.comment}</p>
                  <p className="text-xs text-gray-400 mt-2">— {rev.userName}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Related Products ── */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-display font-bold text-gray-900 mb-5 pb-2 border-b">Customers Also Viewed</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
