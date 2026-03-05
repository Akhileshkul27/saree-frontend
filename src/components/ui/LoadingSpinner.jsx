import { motion } from 'framer-motion'

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <motion.div
        className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <p className="mt-4 text-gray-500 text-sm">{text}</p>
    </div>
  )
}
