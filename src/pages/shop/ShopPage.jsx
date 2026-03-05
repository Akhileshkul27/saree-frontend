import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiFilter, FiX, FiChevronDown } from 'react-icons/fi'
import { productsAPI, categoriesAPI } from '../../api/api'
import ProductCard from '../../components/product/ProductCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

// Fallback values shown while filter-options loads (or if the API fails)
const FALLBACK_FABRICS   = ['Silk', 'Cotton', 'Chiffon', 'Georgette', 'Linen', 'Net', 'Crepe', 'Organza', 'Satin']
const FALLBACK_OCCASIONS = ['Wedding', 'Festival', 'Party', 'Casual', 'Office', 'Bridal']
const FALLBACK_COLORS    = ['Red', 'Blue', 'Green', 'Pink', 'Yellow', 'Orange', 'Purple', 'Black', 'White', 'Gold', 'Maroon']

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
]

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  // Live filter options — start with fallbacks so the UI is never empty
  const [fabricTypes, setFabricTypes] = useState(FALLBACK_FABRICS)
  const [colors, setColors] = useState(FALLBACK_COLORS)
  const [occasions, setOccasions] = useState(FALLBACK_OCCASIONS)

  const filters = {
    search: searchParams.get('search') || '',
    categoryId: searchParams.get('categoryId') || '',
    fabricType: searchParams.get('fabricType') || '',
    color: searchParams.get('color') || '',
    occasion: searchParams.get('occasion') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    isSpecialOffer: searchParams.get('isSpecialOffer') || '',
    isNewArrival: searchParams.get('isNewArrival') || '',
    sortBy: searchParams.get('sortBy') || 'newest',
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: 20,
  }

  // Fetch filter options once on mount — independent of pagination/search changes
  useEffect(() => {
    productsAPI.getFilterOptions().then((res) => {
      if (res.data.success) {
        const opts = res.data.data
        if (opts.fabricTypes?.length) setFabricTypes(opts.fabricTypes)
        if (opts.colors?.length)      setColors(opts.colors)
        if (opts.occasions?.length)   setOccasions(opts.occasions)
      }
    }).catch(() => { /* keep fallback values */ })
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const params = {}
        Object.entries(filters).forEach(([k, v]) => { if (v !== '' && v !== null) params[k] = v })
        const [prodRes, catRes, optsRes] = await Promise.all([
          productsAPI.getAll(params),
          categoriesAPI.getAll(),
          productsAPI.getFilterOptions(),
        ])
        if (prodRes.data.success) {
          setProducts(prodRes.data.data?.items || [])
          setTotalPages(prodRes.data.data?.totalPages || 1)
          setTotalCount(prodRes.data.data?.totalItems || 0)
        }
        if (catRes.data.success) setCategories(catRes.data.data || [])
        if (optsRes.data.success) {
          const opts = optsRes.data.data
          if (opts.fabricTypes?.length) setFabricTypes(opts.fabricTypes)
          if (opts.colors?.length)      setColors(opts.colors)
          if (opts.occasions?.length)   setOccasions(opts.occasions)
        }
      } catch { /* API not running */ }
      setLoading(false)
    }
    load()
  }, [searchParams.toString()])

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    // Only reset to page 1 when changing a filter — not when the user clicks a page number
    if (key !== 'page') params.set('page', '1')
    // Scroll to top on page change
    if (key === 'page') window.scrollTo(0, 0)
    setSearchParams(params)
  }

  const clearFilters = () => setSearchParams({})

  const activeFilterCount = [filters.categoryId, filters.fabricType, filters.color,
    filters.occasion, filters.minPrice, filters.maxPrice, filters.isSpecialOffer, filters.isNewArrival]
    .filter(Boolean).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">
            {filters.isNewArrival ? 'New Arrivals' : filters.search ? `Results for "${filters.search}"` : 'All Sarees'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{totalCount} products found</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium">
            <FiFilter /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          <select value={filters.sortBy} onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white">
            {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <aside className={`w-64 shrink-0 ${showFilters ? 'block' : 'hidden'} md:block`}>
          <div className="bg-white rounded-xl p-5 shadow-sm sticky top-24 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-semibold text-lg">Filters</h3>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-primary hover:underline">Clear All</button>
              )}
            </div>

            {/* Category */}
            <FilterSection title="Category">
              <select value={filters.categoryId} onChange={(e) => updateFilter('categoryId', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FilterSection>

            {/* Fabric */}
            <FilterSection title="Fabric Type">
              <div className="flex flex-wrap gap-2">
                {fabricTypes.map((f) => (
                  <button key={f} onClick={() => updateFilter('fabricType', filters.fabricType === f ? '' : f)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${filters.fabricType === f ? 'bg-primary text-white border-primary' : 'hover:border-primary'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Color */}
            <FilterSection title="Color">
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button key={c} onClick={() => updateFilter('color', filters.color === c ? '' : c)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${filters.color === c ? 'bg-primary text-white border-primary' : 'hover:border-primary'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Occasion */}
            <FilterSection title="Occasion">
              <div className="flex flex-wrap gap-2">
                {occasions.map((o) => (
                  <button key={o} onClick={() => updateFilter('occasion', filters.occasion === o ? '' : o)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${filters.occasion === o ? 'bg-primary text-white border-primary' : 'hover:border-primary'}`}>
                    {o}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Price Range */}
            <FilterSection title="Price Range">
              <div className="flex gap-2">
                <input type="number" placeholder="Min" value={filters.minPrice}
                  onChange={(e) => updateFilter('minPrice', e.target.value)}
                  className="w-1/2 border rounded-lg px-2 py-1.5 text-sm" />
                <input type="number" placeholder="Max" value={filters.maxPrice}
                  onChange={(e) => updateFilter('maxPrice', e.target.value)}
                  className="w-1/2 border rounded-lg px-2 py-1.5 text-sm" />
              </div>
            </FilterSection>

            {/* Special Offers */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.isSpecialOffer === 'true'}
                onChange={(e) => updateFilter('isSpecialOffer', e.target.checked ? 'true' : '')}
                className="w-4 h-4 text-primary rounded" />
              <span className="text-sm text-gray-700">Special Offers Only</span>
            </label>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {loading ? <LoadingSpinner /> : products.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-6xl mb-4 block">🔍</span>
              <h3 className="text-xl font-display font-semibold text-gray-700 mb-2">No sarees found</h3>
              <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
              <button onClick={clearFilters} className="text-primary font-medium hover:underline">Clear all filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-10">
                  <button
                    onClick={() => updateFilter('page', String(filters.page - 1))}
                    disabled={filters.page === 1}
                    className="px-3 py-2 rounded-lg text-sm font-medium border bg-white hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button key={pg} onClick={() => updateFilter('page', String(pg))}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition ${filters.page === pg ? 'bg-primary text-white' : 'bg-white border hover:border-primary'}`}>
                      {pg}
                    </button>
                  ))}
                  <button
                    onClick={() => updateFilter('page', String(filters.page + 1))}
                    disabled={filters.page === totalPages}
                    className="px-3 py-2 rounded-lg text-sm font-medium border bg-white hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterSection({ title, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex justify-between items-center w-full mb-2">
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <FiChevronDown className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && children}
    </div>
  )
}
