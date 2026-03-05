import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight, FiTruck, FiRefreshCw, FiShield, FiHeadphones } from 'react-icons/fi'
import { productsAPI, categoriesAPI } from '../../api/api'
import ProductCard from '../../components/product/ProductCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function HomePage() {
  const [featured, setFeatured] = useState([])
  const [specialOffers, setSpecialOffers] = useState([])
  const [newArrivals, setNewArrivals] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [heroImage, setHeroImage] = useState(() => localStorage.getItem('sg_heroImage') || null)

  // Keep hero image in sync if admin updates it in another tab
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'sg_heroImage') setHeroImage(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [feat, spec, newArr, cats] = await Promise.all([
          productsAPI.getFeatured(8),
          productsAPI.getSpecialOffers(4),
          productsAPI.getNewArrivals(4),
          categoriesAPI.getAll(),
        ])
        setFeatured(feat.data.data || [])
        setSpecialOffers(spec.data.data || [])
        setNewArrivals(newArr.data.data || [])
        setCategories(cats.data.data || [])
      } catch { /* API may not be running yet */ }
      setLoading(false)
    }
    load()
  }, [])

  const features = [
    { icon: FiTruck, title: 'Free Shipping', desc: 'On orders above ₹999' },
    { icon: FiRefreshCw, title: 'Easy Returns', desc: '7-day return policy' },
    { icon: FiShield, title: 'Secure Payment', desc: '100% secure checkout' },
    { icon: FiHeadphones, title: '24/7 Support', desc: 'Dedicated help desk' },
  ]

  return (
    <div>
      {/* ═══════ Hero Banner ═══════ */}
      <section className="relative gradient-primary overflow-hidden">
        <div className="saree-pattern absolute inset-0 opacity-30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
              <span className="inline-block bg-gold/20 text-gold-light text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                New Collection 2026
              </span>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-tight mb-6">
                Drape Yourself in <span className="text-gold-light">Timeless</span> Elegance
              </h1>
              <p className="text-white/80 text-lg mb-8 max-w-lg">
                Discover exquisite handcrafted sarees from the finest weavers of India. From Banarasi silk to Kanchipuram, every piece tells a story.
              </p>
              <div className="flex gap-4">
                <Link to="/shop"
                  className="bg-white text-primary font-semibold px-8 py-3.5 rounded-full hover:bg-gold hover:text-gray-900 transition inline-flex items-center gap-2">
                  Shop Now <FiArrowRight />
                </Link>
                <Link to="/shop?isSpecialOffer=true"
                  className="border-2 border-white text-white font-semibold px-8 py-3.5 rounded-full hover:bg-white hover:text-primary transition">
                  Special Offers
                </Link>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
              className="hidden md:flex justify-center">
              {heroImage ? (
                <div className="w-80 h-96 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                  <img src={heroImage} alt="Hero saree" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-80 h-96 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-dashed border-white/30 flex flex-col items-center justify-center gap-3">
                  <span className="text-4xl">🎨</span>
                  <span className="text-white/60 text-center px-6 text-sm leading-relaxed">
                    Hero image not set.<br />
                    <Link to="/admin" className="text-gold-light underline underline-offset-2 hover:text-white transition">
                      Go to Admin → Settings
                    </Link>
                    &nbsp;to upload one.
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ Features Bar ═══════ */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <f.icon size={22} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{f.title}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ Categories ═══════ */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-display font-bold text-gray-900">Shop by Category</h2>
            <p className="text-gray-500 mt-2">Explore our curated collection of Indian sarees</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.slice(0, 10).map((cat) => (
              <Link key={cat.id} to={`/shop?categoryId=${cat.id}`}
                className="group relative rounded-xl overflow-hidden aspect-[3/4] bg-gray-100 shadow hover:shadow-xl transition">
                {cat.imageUrl ? (
                  <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/10 to-gold/10 flex items-center justify-center">
                    <span className="text-4xl">🧶</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <h3 className="text-white font-display font-semibold text-sm">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════ Featured Products ═══════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900">Featured Sarees</h2>
            <p className="text-gray-500 mt-1">Handpicked for you</p>
          </div>
          <Link to="/shop?isFeatured=true" className="text-primary font-medium text-sm hover:underline inline-flex items-center gap-1">
            View All <FiArrowRight />
          </Link>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* ═══════ Special Offers Banner ═══════ */}
      <section className="bg-gradient-to-r from-burgundy to-primary-dark py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="inline-block bg-gold/20 text-gold-light text-sm font-medium px-4 py-1.5 rounded-full mb-3">Limited Time</span>
            <h2 className="text-3xl font-display font-bold text-white">Special Offers</h2>
            <p className="text-white/70 mt-2">Exclusive discounts on premium sarees</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {specialOffers.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          <div className="text-center mt-8">
            <Link to="/shop?isSpecialOffer=true"
              className="inline-flex items-center gap-2 bg-gold text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gold-light transition">
              View All Offers <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ New Arrivals ═══════ */}
      {newArrivals.length > 0 && (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-display font-bold text-gray-900">New Arrivals</h2>
            <p className="text-gray-500 mt-1">Fresh from the loom</p>
          </div>
          <Link to="/new-arrivals" className="text-primary font-medium text-sm hover:underline inline-flex items-center gap-1">
            View All <FiArrowRight />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
      )}

      {/* ═══════ Trust Badges ═══════ */}
      <section className="bg-white py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-8">Why Choose SareeGrace?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { emoji: '🏆', title: 'Authentic Handlooms', desc: 'Direct from weavers, every saree is authentic with a quality guarantee.' },
              { emoji: '💰', title: 'Best Prices', desc: 'No middlemen. Get premium sarees at the most competitive prices.' },
              { emoji: '🎁', title: 'Beautiful Packaging', desc: 'Every order comes in elegant gift-ready packaging.' },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl bg-cream">
                <span className="text-4xl mb-4 block">{item.emoji}</span>
                <h3 className="font-display font-semibold text-lg text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
