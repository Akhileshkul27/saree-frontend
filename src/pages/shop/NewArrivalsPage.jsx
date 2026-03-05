import { useEffect, useState } from 'react'
import { productsAPI } from '../../api/api'
import ProductCard from '../../components/product/ProductCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function NewArrivalsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await productsAPI.getNewArrivals(100)
        if (res.data.success) {
          setProducts(res.data.data || [])
        } else {
          setError('Failed to load new arrivals.')
        }
      } catch {
        setError('Something went wrong. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingSpinner text="Loading new arrivals..." />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-display font-bold text-gray-900">New Arrivals</h1>
        <p className="text-gray-500 mt-2">Fresh from the loom — handpicked by our team</p>
      </div>

      {error && (
        <div className="text-center py-16 text-red-500">{error}</div>
      )}

      {!error && products.length === 0 && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🪡</p>
          <h2 className="text-2xl font-display font-semibold text-gray-700 mb-2">No New Arrivals Yet</h2>
          <p className="text-gray-400">Check back soon — new sarees are on their way!</p>
        </div>
      )}

      {products.length > 0 && (
        <>
          <p className="text-sm text-gray-400 mb-6">{products.length} product{products.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
