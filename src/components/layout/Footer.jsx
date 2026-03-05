import { Link } from 'react-router-dom'
import { FiInstagram, FiFacebook, FiTwitter, FiYoutube, FiMail, FiPhone, FiMapPin } from 'react-icons/fi'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      {/* Newsletter */}
      <div className="gradient-primary py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-display font-bold text-white mb-2">Stay Graceful, Stay Updated</h3>
          <p className="text-white/80 mb-6">Subscribe for exclusive offers and new collection alerts</p>
          <form className="flex max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Your email address"
              className="flex-1 px-4 py-3 rounded-l-full text-gray-900 outline-none" />
            <button className="bg-gold text-gray-900 font-semibold px-6 py-3 rounded-r-full hover:bg-gold-light transition">
              Subscribe
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <h2 className="text-2xl font-display font-bold text-gradient mb-4">SareeGrace</h2>
            <p className="text-sm leading-relaxed mb-4">
              Celebrating the timeless elegance of Indian sarees. Handpicked collections from the finest weavers across India.
            </p>
            <div className="flex gap-3">
              {[FiInstagram, FiFacebook, FiTwitter, FiYoutube].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 hover:bg-primary transition">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {[['/', 'Home'], ['/shop', 'All Sarees'], ['/shop?isSpecialOffer=true', 'Special Offers'], ['/new-arrivals', 'New Arrivals']].map(([to, label]) => (
                <li key={to}><Link to={to} className="hover:text-gold transition">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-white font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              {['Track Order', 'Return Policy', 'Shipping Info', 'FAQs', 'Size Guide'].map((item) => (
                <li key={item}><a href="#" className="hover:text-gold transition">{item}</a></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Get in Touch</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2"><FiMapPin className="mt-0.5 shrink-0" /> Mumbai, Maharashtra, India</li>
              <li className="flex items-center gap-2"><FiPhone className="shrink-0" /> +91 98765 43210</li>
              <li className="flex items-center gap-2"><FiMail className="shrink-0" /> hello@sareegrace.com</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-xs">
          <p>© 2026 SareeGrace. All rights reserved.</p>
          <div className="flex gap-4 mt-3 md:mt-0">
            <a href="#" className="hover:text-gold transition">Privacy Policy</a>
            <a href="#" className="hover:text-gold transition">Terms & Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
