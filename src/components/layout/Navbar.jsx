import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { FiShoppingCart, FiHeart, FiUser, FiMenu, FiX, FiSearch, FiLogOut } from 'react-icons/fi'
import { logout } from '../../store/authSlice'
import { clearCartState } from '../../store/cartSlice'
import { clearWishlistState } from '../../store/wishlistSlice'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)
  const { totalItems } = useSelector((s) => s.cart)
  const { items: wishItems } = useSelector((s) => s.wishlist)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    dispatch(logout())
    dispatch(clearCartState())
    dispatch(clearWishlistState())
    navigate('/')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setMenuOpen(false)
    }
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white shadow-sm'}`}>
      {/* Top bar */}
      <div className="gradient-primary text-white text-center text-xs py-1.5 font-medium tracking-wide px-2">
        <span className="hidden sm:inline">✨ Free Shipping on Orders Above ₹999 | Use Code <span className="font-bold">GRACE10</span> for 10% Off ✨</span>
        <span className="sm:hidden">Free Shipping ₹999+ | Code <span className="font-bold">GRACE10</span> — 10% Off</span>
      </div>

      <nav className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold font-display text-gradient">SareeGrace</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-gray-700 hover:text-primary transition">Home</Link>
            <Link to="/shop" className="text-sm font-medium text-gray-700 hover:text-primary transition">Shop</Link>
            <Link to="/shop?isSpecialOffer=true" className="text-sm font-medium text-gray-700 hover:text-primary transition">Special Offers</Link>
            <Link to="/new-arrivals" className="text-sm font-medium text-gray-700 hover:text-primary transition">New Arrivals</Link>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-2 w-64">
            <FiSearch className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search sarees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-sm w-full"
            />
          </form>

          {/* Icons */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/wishlist" className="relative text-gray-700 hover:text-primary transition">
              <FiHeart size={20} />
              {wishItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {wishItems.length}
                </span>
              )}
            </Link>
            <Link to="/cart" className="relative text-gray-700 hover:text-primary transition">
              <FiShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-1 text-gray-700 hover:text-primary transition">
                  <FiUser size={22} />
                  <span className="hidden lg:inline text-sm">{user.firstName}</span>
                </button>
                <div className="absolute right-0 top-full mt-1 bg-white shadow-xl rounded-lg py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Profile</Link>
                  <Link to="/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Orders</Link>
                  <Link to="/addresses" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Addresses</Link>
                  {user.role === 'Admin' && (
                    <Link to="/admin" className="block px-4 py-2 text-sm text-primary font-medium hover:bg-red-50">Admin Panel</Link>
                  )}
                  <hr className="my-1" />
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <FiLogOut size={14} /> Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="bg-primary text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-primary-dark transition">
                Login
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-700">
              {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t py-4 space-y-3">
            <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-full px-4 py-2">
              <FiSearch className="text-gray-400 mr-2" />
              <input type="text" placeholder="Search sarees..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent outline-none text-sm w-full" />
            </form>
            <Link to="/" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 font-medium">Home</Link>
            <Link to="/shop" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 font-medium">Shop</Link>
            <Link to="/shop?isSpecialOffer=true" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 font-medium">Special Offers</Link>
            <Link to="/new-arrivals" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 font-medium">New Arrivals</Link>
            {user && (
              <>
                <hr />
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 font-medium">My Profile</Link>
                <Link to="/orders" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 font-medium">My Orders</Link>
                <Link to="/addresses" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 font-medium">Addresses</Link>
                {user.role === 'Admin' && (
                  <Link to="/admin" onClick={() => setMenuOpen(false)} className="block py-2 text-primary font-medium">Admin Panel</Link>
                )}
                <button onClick={() => { handleLogout(); setMenuOpen(false) }} className="flex items-center gap-2 py-2 text-red-600 font-medium">
                  <FiLogOut size={14} /> Logout
                </button>
              </>
            )}
            {!user && (
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block bg-primary text-white text-center px-4 py-2.5 rounded-full text-sm font-medium">Login / Register</Link>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
