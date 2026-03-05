import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  FiPackage, FiUsers, FiDollarSign, FiShoppingBag, FiPlus, FiEdit2, FiTrash2, FiImage,
  FiUpload, FiGrid, FiList, FiSearch, FiX, FiStar, FiSettings, FiCheckCircle, FiTrash,
  FiDownload, FiAlertCircle, FiFileText
} from 'react-icons/fi'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { adminAPI, categoriesAPI, productsAPI } from '../../api/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

/* ─── BulkImportModal ──────────────────────────────────────────────────────────────
   Parses an uploaded Excel file client-side, previews rows,
   submits to POST /admin/products/bulk, and shows row-level results.
── */

// Excel column header → DTO field mapping (case-insensitive)
const EXCEL_COLUMNS = [
  { header: 'Name',             field: 'name',             required: true,  type: 'string'  },
  { header: 'CategoryName',     field: 'categoryName',     required: true,  type: 'string'  },
  { header: 'BasePrice',        field: 'basePrice',        required: true,  type: 'number'  },
  { header: 'StockCount',       field: 'stockCount',       required: true,  type: 'integer' },
  { header: 'ShortDescription', field: 'shortDescription',                  type: 'string'  },
  { header: 'Description',      field: 'description',                       type: 'string'  },
  { header: 'DiscountPercent',  field: 'discountPercent',                   type: 'number'  },
  { header: 'FabricType',       field: 'fabricType',                        type: 'string'  },
  { header: 'Color',            field: 'color',                             type: 'string'  },
  { header: 'Pattern',          field: 'pattern',                           type: 'string'  },
  { header: 'Occasion',         field: 'occasion',                          type: 'string'  },
  { header: 'Length',           field: 'length',                            type: 'number'  },
  { header: 'Width',            field: 'width',                             type: 'number'  },
  { header: 'HasBlousePiece',   field: 'hasBlousePiece',                    type: 'boolean' },
  { header: 'BlouseLength',     field: 'blouseLength',                      type: 'number'  },
  { header: 'WashCare',         field: 'washCare',                          type: 'string'  },
  { header: 'Weight',           field: 'weight',                            type: 'number'  },
  { header: 'IsFeatured',       field: 'isFeatured',                        type: 'boolean' },
  { header: 'IsNewArrival',     field: 'isNewArrival',                      type: 'boolean' },
  { header: 'ManufactureDate',  field: 'manufactureDate',                   type: 'string'  },
  // ── Image columns (Image1 = primary; up to 10 per product; all optional) ──
  { header: 'Image1',           field: 'image1',                            type: 'string'  },
  { header: 'Image2',           field: 'image2',                            type: 'string'  },
  { header: 'Image3',           field: 'image3',                            type: 'string'  },
  { header: 'Image4',           field: 'image4',                            type: 'string'  },
  { header: 'Image5',           field: 'image5',                            type: 'string'  },
  { header: 'Image6',           field: 'image6',                            type: 'string'  },
  { header: 'Image7',           field: 'image7',                            type: 'string'  },
  { header: 'Image8',           field: 'image8',                            type: 'string'  },
  { header: 'Image9',           field: 'image9',                            type: 'string'  },
  { header: 'Image10',          field: 'image10',                           type: 'string'  },
]

const TEMPLATE_SAMPLE = [
  ['Kanjivaram Silk Saree', 'Silk Sarees', 4500, 25, 'Elegant Kanjivaram silk', 'Full description here', 10,
   'Silk', 'Red', 'Zari', 'Wedding', 5.5, 1.1, 'TRUE', 0.8, 'Dry clean only', 650, 'FALSE',
   new Date().toISOString().slice(0, 10),
   '/images/saree1.jpg', '/images/saree1-back.jpg', '', '', '', '', '', '', '', ''],
]

function downloadTemplate() {
  const headers = EXCEL_COLUMNS.map((c) => c.header)
  const requiredNote = EXCEL_COLUMNS.map((c) => c.required ? 'REQUIRED' : 'optional')
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, requiredNote, ...TEMPLATE_SAMPLE])

  // Column widths
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }))

  // Style header row cells bold + light blue background (xlsx lite approach via cell format)
  headers.forEach((_, i) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i })
    if (!ws[cellRef]) return
    ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: 'DBEAFE' } } }
  })

  XLSX.utils.book_append_sheet(wb, ws, 'Products')
  XLSX.writeFile(wb, 'SareeGrace_Product_Template.xlsx')
}

function parseBoolean(val) {
  if (val === true || val === 1) return true
  if (val === false || val === 0) return false
  const s = String(val).toLowerCase().trim()
  return s === 'true' || s === 'yes' || s === '1'
}

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (raw.length < 2) { reject('File has no data rows.'); return }

        // Find header row (first row that has 'Name')
        const headerRowIdx = raw.findIndex((row) =>
          row.some((cell) => String(cell).toLowerCase().trim() === 'name')
        )
        if (headerRowIdx === -1) { reject('Could not find header row. Make sure the first row has column names.'); return }

        const headers = raw[headerRowIdx].map((h) => String(h).toLowerCase().trim())
        const rows = []
        const parseErrors = []

        for (let i = headerRowIdx + 1; i < raw.length; i++) {
          const xlRow = raw[i]
          // Skip completely empty rows
          if (xlRow.every((c) => c === '' || c == null)) continue

          const rowNum = i + 1  // 1-based for user display
          const obj = { rowNumber: rowNum }
          let rowError = null

          for (const col of EXCEL_COLUMNS) {
            const colIdx = headers.indexOf(col.header.toLowerCase())
            const raw_val = colIdx >= 0 ? xlRow[colIdx] : undefined
            const strVal = raw_val != null && raw_val !== '' ? String(raw_val).trim() : ''

            if (col.required && strVal === '') {
              rowError = `Row ${rowNum}: "${col.header}" is required`
              break
            }

            if (strVal === '') {
              obj[col.field] = col.type === 'boolean' ? false : col.type === 'number' || col.type === 'integer' ? undefined : ''
              continue
            }

            if (col.type === 'number') {
              const n = parseFloat(strVal)
              if (isNaN(n)) { rowError = `Row ${rowNum}: "${col.header}" must be a number`; break }
              obj[col.field] = n
            } else if (col.type === 'integer') {
              const n = parseInt(strVal)
              if (isNaN(n)) { rowError = `Row ${rowNum}: "${col.header}" must be a whole number`; break }
              obj[col.field] = n
            } else if (col.type === 'boolean') {
              obj[col.field] = parseBoolean(raw_val)
            } else {
              // Handle Excel date objects for ManufactureDate
              if (col.field === 'manufactureDate' && raw_val instanceof Date) {
                obj[col.field] = raw_val.toISOString().slice(0, 10)
              } else {
                obj[col.field] = strVal
              }
            }
          }

          if (rowError) { parseErrors.push(rowError); continue }

          // Collect Image1–Image10 into an ordered, deduplicated images array
          const images = []
          const seenImgUrls = new Set()
          for (let n = 1; n <= 10; n++) {
            const key = `image${n}`
            const url = obj[key] ? String(obj[key]).trim() : ''
            if (url && !seenImgUrls.has(url.toLowerCase())) {
              images.push(url)
              seenImgUrls.add(url.toLowerCase())
            }
            delete obj[key]  // remove individual fields — backend receives images array
          }
          obj.images = images

          rows.push(obj)
        }

        resolve({ rows, parseErrors })
      } catch (err) {
        reject('Failed to read file: ' + err.message)
      }
    }
    reader.onerror = () => reject('Could not read file')
    reader.readAsBinaryString(file)
  })
}

function BulkImportModal({ categories, onDone, onClose }) {
  const [step, setStep] = useState('upload')   // 'upload' | 'preview' | 'result'
  const [parsedRows, setParsedRows] = useState([])
  const [parseErrors, setParseErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(ext)) {
      toast.error('Please upload an .xlsx or .xls file')
      return
    }
    try {
      const { rows, parseErrors: errs } = await parseExcel(file)
      setParsedRows(rows)
      setParseErrors(errs)
      setStep('preview')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to parse file')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleImport = async () => {
    if (parsedRows.length === 0) return
    setImporting(true)
    try {
      const { data } = await adminAPI.bulkCreateProducts(parsedRows)
      setResult(data.data)
      setStep('result')
      if (data.data?.insertedCount > 0) onDone()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed')
    }
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <FiFileText size={20} className="text-primary" />
            <h2 className="font-display font-bold text-lg">Bulk Import Products</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><FiX size={20} /></button>
        </div>

        <div className="p-6">
          {/* ── STEP 1: Upload ── */}
          {step === 'upload' && (
            <div>
              {/* Download Template */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <FiDownload size={20} className="text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-800 text-sm">Step 1: Download the template</p>
                  <p className="text-xs text-blue-600 mt-0.5">Fill in product data using the correct column format. Required fields: <strong>Name, CategoryName, BasePrice, StockCount</strong>.</p>
                  <button onClick={downloadTemplate}
                    className="mt-2 inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
                    <FiDownload size={12} /> Download Excel Template
                  </button>
                </div>
              </div>

              {/* Drop zone */}
              <p className="font-semibold text-sm text-gray-700 mb-2">Step 2: Upload your completed Excel file</p>
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <FiUpload size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="font-medium text-gray-600">Drag & drop your Excel file here</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse · .xlsx / .xls · Max 500 rows</p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])} />
              </div>

              {/* Column reference */}
              <details className="mt-4 text-xs text-gray-500">
                <summary className="cursor-pointer font-medium text-gray-600 hover:text-primary">View all supported columns</summary>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
                  {EXCEL_COLUMNS.map((c) => (
                    <div key={c.field} className={`px-2 py-1 rounded border text-xs ${
                      c.required ? 'border-red-200 bg-red-50 text-red-600 font-medium' : 'border-gray-200 bg-gray-50'
                    }`}>
                      {c.header} {c.required && '*'}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* ── STEP 2: Preview ── */}
          {step === 'preview' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-gray-800">{parsedRows.length} row(s) ready to import</p>
                  {parseErrors.length > 0 && (
                    <p className="text-xs text-amber-600 mt-0.5">{parseErrors.length} row(s) skipped due to missing required fields</p>
                  )}
                </div>
                <button onClick={() => { setStep('upload'); setParsedRows([]); setParseErrors([]) }}
                  className="text-xs text-gray-500 hover:text-primary underline">← Upload different file</button>
              </div>

              {/* Parse errors */}
              {parseErrors.length > 0 && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="font-semibold text-amber-700 text-sm mb-1 flex items-center gap-1"><FiAlertCircle size={14} /> Skipped rows (fix and re-upload to include these):</p>
                  <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5">
                    {parseErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-x-auto border rounded-lg mb-5">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Category</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Base Price</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Stock</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Fabric</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Color</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Discount%</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Images</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedRows.map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{row.rowNumber}</td>
                        <td className="px-3 py-2 font-medium text-gray-800 max-w-[160px] truncate">{row.name}</td>
                        <td className="px-3 py-2 text-gray-600">{row.categoryName}</td>
                        <td className="px-3 py-2 text-gray-600">₹{row.basePrice?.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 text-gray-600">{row.stockCount}</td>
                        <td className="px-3 py-2 text-gray-500">{row.fabricType || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{row.color || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{row.discountPercent || 0}%</td>
                        <td className="px-3 py-2">
                          {row.images?.length > 0
                            ? <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium">{row.images.length} img</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button onClick={handleImport} disabled={importing || parsedRows.length === 0}
                  className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-dark disabled:opacity-50 transition flex items-center gap-2">
                  {importing ? 'Importing…' : `Import ${parsedRows.length} Product${parsedRows.length !== 1 ? 's' : ''}`}
                </button>
                <button onClick={onClose} className="border px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Result ── */}
          {step === 'result' && result && (
            <div>
              {/* Summary banner */}
              <div className={`rounded-xl p-5 mb-5 flex items-start gap-3 ${
                result.insertedCount > 0 || result.updatedCount > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                {result.insertedCount > 0 || result.updatedCount > 0
                  ? <FiCheckCircle size={22} className="text-green-600 mt-0.5 shrink-0" />
                  : <FiAlertCircle size={22} className="text-red-500 mt-0.5 shrink-0" />}
                <div>
                  <p className={`font-bold text-sm ${
                    result.insertedCount > 0 || result.updatedCount > 0 ? 'text-green-800' : 'text-red-700'
                  }`}>
                    {result.insertedCount > 0 && `✓ ${result.insertedCount} product${result.insertedCount !== 1 ? 's' : ''} imported`}
                    {result.insertedCount > 0 && result.updatedCount > 0 && ' · '}
                    {result.updatedCount > 0 && `↻ ${result.updatedCount} product${result.updatedCount !== 1 ? 's' : ''} updated`}
                    {!result.insertedCount && !result.updatedCount && 'No products were imported or updated.'}
                  </p>
                  {result.imagesAttached > 0 && (
                    <p className="text-xs text-green-700 mt-0.5">🖼 {result.imagesAttached} image{result.imagesAttached !== 1 ? 's' : ''} attached to products.</p>
                  )}
                  {result.errorCount > 0 && (
                    <p className="text-xs text-amber-700 mt-0.5">{result.errorCount} row(s) had errors — see details below.</p>
                  )}
                </div>
              </div>

              {/* Row errors */}
              {result.errors?.length > 0 && (
                <div className="border rounded-lg overflow-hidden mb-5">
                  <div className="bg-red-50 px-4 py-2 border-b flex items-center gap-2">
                    <FiAlertCircle size={14} className="text-red-500" />
                    <p className="text-sm font-semibold text-red-700">Row-level Errors</p>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Row</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Product Name</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.errors.map((err, i) => (
                        <tr key={i} className="bg-red-50/50">
                          <td className="px-3 py-2 text-gray-500">{err.row}</td>
                          <td className="px-3 py-2 text-gray-700 font-medium">{err.productName || '—'}</td>
                          <td className="px-3 py-2 text-red-600">{err.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3">
                {result.errorCount > 0 && (
                  <button onClick={() => { setStep('upload'); setParsedRows([]); setParseErrors([]); setResult(null) }}
                    className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-dark transition">
                    Fix & Re-import
                  </button>
                )}
                <button onClick={onClose}
                  className="border px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50">
                  {result.insertedCount > 0 || result.updatedCount > 0 ? 'Done' : 'Close'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Dashboard Tab ─── */
function DashboardTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await adminAPI.getDashboard()
        if (data.success) setStats(data.data)
      } catch { /* */ }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <LoadingSpinner />
  if (!stats) return <p className="text-gray-500 text-center py-10">Failed to load dashboard</p>

  const cards = [
    { label: 'Total Revenue', value: `₹${stats.totalRevenue?.toLocaleString('en-IN') || 0}`, icon: FiDollarSign, color: 'bg-green-500' },
    { label: 'Total Orders', value: stats.totalOrders || 0, icon: FiPackage, color: 'bg-blue-500' },
    { label: 'Total Products', value: stats.totalProducts || 0, icon: FiShoppingBag, color: 'bg-purple-500' },
    { label: 'Total Customers', value: stats.totalCustomers || 0, icon: FiUsers, color: 'bg-orange-500' },
  ]

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm">
            <div className={`w-10 h-10 ${c.color} rounded-lg flex items-center justify-center text-white mb-3`}><c.icon size={20} /></div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-sm text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      {stats.recentOrders?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-display font-semibold text-lg mb-4">Recent Orders</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Order #</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-primary">{o.orderNumber}</td>
                    <td className="py-3">{o.customerName}</td>
                    <td className="py-3 font-medium">₹{o.totalAmount?.toLocaleString('en-IN')}</td>
                    <td className="py-3"><span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{o.orderStatus}</span></td>
                    <td className="py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── empty form state matching CreateProductDto / UpdateProductDto ─── */
const EMPTY_PRODUCT = {
  name: '', shortDescription: '', description: '', basePrice: '', discountPercent: '0',
  fabricType: '', color: '', pattern: '', occasion: '', length: '5.5', width: '1.1',
  hasBlousePiece: false, blouseLength: '', washCare: '', weight: '', stockCount: '',
  categoryId: '', isActive: true, isFeatured: false, isNewArrival: false,
  manufactureDate: new Date().toISOString().slice(0, 10),
}

/* ─── CreatableCombobox ────────────────────────────────────────────────────────
   A free-text input that also shows a suggestion dropdown built from `options`.
   If the admin types something not in the list, a "+  Add …" row appears.
   No extra API call — the value is just stored as a string on the product.
── */
function CreatableCombobox({ value, onChange, options, placeholder, className = '' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const ref = useRef(null)

  // keep the text box in sync when a parent sets a new value (edit mode)
  useEffect(() => { setQuery(value || '') }, [value])

  // close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
  const canCreate = query.trim() && !options.some((o) => o.toLowerCase() === query.trim().toLowerCase())

  const pick = (val) => { setQuery(val); onChange(val); setOpen(false) }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      {open && (filtered.length > 0 || canCreate) && (
        <ul className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
          {filtered.map((o) => (
            <li key={o} onMouseDown={() => pick(o)}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                o.toLowerCase() === value?.toLowerCase() ? 'bg-primary/5 text-primary font-medium' : ''
              }`}>
              {o}
            </li>
          ))}
          {canCreate && (
            <li onMouseDown={() => pick(query.trim())}
              className="px-3 py-2 cursor-pointer hover:bg-primary/5 text-primary font-medium flex items-center gap-1 border-t">
              <FiPlus size={13} /> Add &ldquo;{query.trim()}&rdquo;
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

/* ─── InlineCategorySelect ─────────────────────────────────────────────────────
   Renders a normal category <select> plus a + button.
   Clicking + reveals a mini text input to create a new category via API;
   on success the fresh category is auto-selected and added to the list.
── */
function InlineCategorySelect({ value, onChange, categories, onCategoryCreated }) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    try {
      const { data } = await adminAPI.createCategory({ name, displayOrder: 0 })
      if (data.success) {
        toast.success(`Category "${name}" created!`)
        onCategoryCreated(data.data)           // add to parent list
        onChange(data.data.id.toString())      // auto-select
        setNewName('')
        setShowCreate(false)
      } else {
        toast.error(data.message || 'Failed to create category')
      }
    } catch {
      toast.error('Failed to create category')
    }
    setCreating(false)
  }

  return (
    <div>
      <div className="flex gap-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Select Category *</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          title="Create new category"
          className={`px-2.5 rounded-lg border text-sm transition ${
            showCreate ? 'bg-primary text-white border-primary' : 'text-primary border-primary/40 hover:bg-primary/5'
          }`}
        >
          <FiPlus size={14} />
        </button>
      </div>
      {showCreate && (
        <div className="mt-2 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }}
            placeholder="New category name…"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            autoFocus
          />
          <button
            type="button"
            disabled={creating || !newName.trim()}
            onClick={handleCreate}
            className="bg-primary text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {creating ? '…' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => { setShowCreate(false); setNewName('') }}
            className="border px-2.5 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            <FiX size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── DeleteProductModal ─────────────────────────────────────────────────────
   Checks order history then offers the admin the right actions:
   • No orders  →  "Permanently Delete"  or  "Deactivate"
   • Has orders →  "Deactivate" only (order records must be preserved)
─── */
function DeleteProductModal({ product, onClose, onDeleted }) {
  const [checking, setChecking]   = useState(true)
  const [hasOrders, setHasOrders] = useState(false)
  const [busy, setBusy]           = useState(false)

  useEffect(() => {
    adminAPI.checkProductOrders(product.id)
      .then(({ data }) => setHasOrders(data.data === true))
      .catch(() => setHasOrders(false))
      .finally(() => setChecking(false))
  }, [product.id])

  const execute = async (permanent) => {
    setBusy(true)
    try {
      const { data } = await adminAPI.deleteProduct(product.id, permanent)
      if (data.success) {
        toast.success(data.message || (permanent ? 'Product permanently deleted' : 'Product deactivated'))
        onDeleted()
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error('Operation failed')
    }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-display font-bold text-lg text-gray-800">Delete Product</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><FiX size={18} /></button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          <span className="font-semibold text-gray-800">"{product.name}"</span>
        </p>

        {checking ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
            <LoadingSpinner /> Checking order history…
          </div>
        ) : hasOrders ? (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-800">
              <p className="font-semibold mb-1">⚠ This product has order history</p>
              <p>It cannot be permanently deleted because it is referenced by past orders. You can deactivate it — it will be hidden from the shop but order records remain intact.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => execute(false)} disabled={busy}
                className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition">
                {busy ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-sm text-blue-800">
              <p className="font-semibold mb-1">No order history found</p>
              <p>Choose how to remove this product:</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li><span className="font-semibold">Permanently Delete</span> — removes the product and all its data from the database forever.</li>
                <li><span className="font-semibold">Deactivate</span> — hides it from the shop but keeps the record (can be re-added via Excel later).</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-end flex-wrap">
              <button onClick={onClose} className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => execute(false)} disabled={busy}
                className="border border-amber-400 text-amber-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-50 disabled:opacity-50 transition">
                {busy ? 'Working…' : 'Deactivate'}
              </button>
              <button onClick={() => execute(true)} disabled={busy}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition">
                {busy ? 'Deleting…' : 'Permanently Delete'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Products Tab ─── */
function ProductsTab() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState([])
  const [uploadingImg, setUploadingImg] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [deleteTarget, setDeleteTarget]   = useState(null)  // product object to delete
  const [statusFilter, setStatusFilter]   = useState('all') // 'all' | 'active' | 'inactive'
  // fileRef = image picker used inside edit mode
  const fileRef = useRef()
  // createFileRef = image picker inside the create-new-product form
  const createFileRef = useRef()
  // editProduct holds the full ProductDetailDto so existing images can be displayed
  const [editProduct, setEditProduct] = useState(null)
  // track how many files are selected in the edit upload input
  const [editSelectedCount, setEditSelectedCount] = useState(0)
  const [form, setForm] = useState(EMPTY_PRODUCT)

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      // Pass proper params object so axios serialises page & pageSize correctly
      const { data } = await adminAPI.getProducts({ page: 1, pageSize: 200, includeInactive: true })
      if (data.success) setProducts(data.data?.items || [])
      else toast.error(data.message || 'Failed to load products')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load products')
    }
    setLoading(false)
  }

  const loadCategories = async () => {
    try {
      const { data } = await categoriesAPI.getAll()
      if (data.success) setCategories(data.data || [])
    } catch { /* */ }
  }

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    // ─ Client-side: block duplicate product name when creating ─
    if (!editId) {
      const trimmedName = form.name.trim().toLowerCase()
      const duplicate = products.some(p => p.name.trim().toLowerCase() === trimmedName)
      if (duplicate) {
        toast.error(`A product named "${form.name.trim()}" already exists. Use the Edit button to update it.`)
        return
      }
    }
    // Build payload matching CreateProductDto / UpdateProductDto exactly
    const payload = {
      name: form.name,
      shortDescription: form.shortDescription,
      description: form.description,
      basePrice: parseFloat(form.basePrice) || 0,
      discountPercent: parseFloat(form.discountPercent) || 0,
      fabricType: form.fabricType,
      color: form.color,
      pattern: form.pattern,
      occasion: form.occasion,
      length: parseFloat(form.length) || 5.5,
      width: parseFloat(form.width) || 1.1,
      hasBlousePiece: form.hasBlousePiece,
      blouseLength: form.blouseLength ? parseFloat(form.blouseLength) : null,
      washCare: form.washCare,
      weight: form.weight ? parseFloat(form.weight) : null,
      stockCount: parseInt(form.stockCount) || 0,
      categoryId: parseInt(form.categoryId),
      isFeatured: form.isFeatured,
      isNewArrival: form.isNewArrival,
      manufactureDate: form.manufactureDate || new Date().toISOString().slice(0, 10),
      ...(editId ? { isActive: form.isActive } : {}),
    }
    try {
      const res = editId
        ? await adminAPI.updateProduct(editId, payload)
        : await adminAPI.createProduct(payload)
      if (res.data.success) {
        const savedId = editId || res.data.data?.id
        // If creating a new product and user picked images, upload them now
        if (!editId && savedId) {
          const files = createFileRef.current?.files
          if (files?.length) {
            setUploadingImg(true)
            for (let i = 0; i < files.length; i++) {
              try {
                await adminAPI.uploadProductImage(savedId, files[i], i === 0)
              } catch {
                toast.error(`Failed to upload image: ${files[i].name}`)
              }
            }
            setUploadingImg(false)
            if (createFileRef.current) createFileRef.current.value = ''
          }
        }
        toast.success(editId ? 'Product updated!' : 'Product created!')
        loadProducts()
        setShowForm(false)
        setEditId(null)
        setEditProduct(null)
      } else {
        toast.error(res.data.message || 'Operation failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  const handleImageUpload = async (productId) => {
    const files = fileRef.current?.files
    if (!files?.length) {
      // Programmatically open the file picker if nothing is selected
      fileRef.current?.click()
      return
    }
    setUploadingImg(true)
    let allOk = true
    // First file is primary when product has no existing images
    const hasExisting = (editProduct?.images?.length ?? 0) > 0
    for (let i = 0; i < files.length; i++) {
      const isPrimary = !hasExisting && i === 0
      try {
        const { data } = await adminAPI.uploadProductImage(productId, files[i], isPrimary)
        if (!data.success) { toast.error(`Failed: ${files[i].name}`); allOk = false; break }
      } catch {
        toast.error(`Upload error: ${files[i].name}`); allOk = false; break
      }
    }
    if (allOk) toast.success('Image(s) uploaded!')
    setUploadingImg(false)
    fileRef.current.value = ''
    setEditSelectedCount(0)
    // Refresh the detail so the images grid updates instantly
    try {
      const { data } = await productsAPI.getById(productId)
      if (data.success) setEditProduct(data.data)
    } catch { /* */ }
    loadProducts()
  }

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Delete this image?')) return
    try {
      const { data } = await adminAPI.deleteProductImage(imageId)
      if (data.success) {
        toast.success('Image deleted')
        setEditProduct((prev) => prev ? { ...prev, images: prev.images.filter((img) => img.id !== imageId) } : prev)
        loadProducts()
      } else toast.error(data.message)
    } catch { toast.error('Failed to delete image') }
  }

  const handleDelete = (product) => setDeleteTarget(product)

  const handleToggleNewArrival = async (p) => {
    try {
      const { data: detail } = await productsAPI.getById(p.id)
      if (!detail.success) { toast.error('Could not load product details'); return }
      const d = detail.data
      const payload = {
        name: d.name, shortDescription: d.shortDescription, description: d.description || '',
        basePrice: d.basePrice, discountPercent: d.discountPercent, fabricType: d.fabricType,
        color: d.color, pattern: d.pattern, occasion: d.occasion, length: d.length || 5.5,
        width: d.width || 1.1, hasBlousePiece: d.hasBlousePiece || false, blouseLength: d.blouseLength,
        washCare: d.washCare, weight: d.weight, stockCount: d.stockCount, categoryId: d.categoryId,
        isFeatured: d.isFeatured, isNewArrival: !p.isNewArrival,
        manufactureDate: d.manufactureDate || new Date().toISOString().slice(0, 10),
        isActive: d.isActive, isDeleted: d.isDeleted,
      }
      const { data } = await adminAPI.updateProduct(p.id, payload)
      if (data.success) {
        toast.success(`"${p.name}" ${!p.isNewArrival ? 'added to' : 'removed from'} New Arrivals`)
        loadProducts()
      } else toast.error(data.message)
    } catch { toast.error('Failed to update') }
  }

  const handleToggleStatus = async (p) => {
    try {
      if (p.isActive) {
        // Deactivate — use the delete endpoint with permanent=false (soft delete)
        const { data } = await adminAPI.deleteProduct(p.id, false)
        if (data.success) { toast.success(`"${p.name}" deactivated`); loadProducts() }
        else toast.error(data.message)
      } else {
        // Reactivate — fetch full detail then update
        const { data: detail } = await productsAPI.getById(p.id)
        if (!detail.success) { toast.error('Could not load product details'); return }
        const d = detail.data
        const payload = {
          name: d.name, shortDescription: d.shortDescription, description: d.description || '',
          basePrice: d.basePrice, discountPercent: d.discountPercent, fabricType: d.fabricType,
          color: d.color, pattern: d.pattern, occasion: d.occasion, length: d.length || 5.5,
          width: d.width || 1.1, hasBlousePiece: d.hasBlousePiece || false, blouseLength: d.blouseLength,
          washCare: d.washCare, weight: d.weight, stockCount: d.stockCount, categoryId: d.categoryId,
          isFeatured: d.isFeatured, isNewArrival: d.isNewArrival ?? false, manufactureDate: d.manufactureDate || new Date().toISOString().slice(0, 10),
          isActive: true, isDeleted: false,
        }
        const { data } = await adminAPI.updateProduct(p.id, payload)
        if (data.success) { toast.success(`"${p.name}" activated`); loadProducts() }
        else toast.error(data.message)
      }
    } catch { toast.error('Failed to update status') }
  }

  const populateForm = (detail) => ({
    name: detail.name || '',
    shortDescription: detail.shortDescription || '',
    description: detail.description || '',
    basePrice: detail.basePrice?.toString() || '',
    discountPercent: detail.discountPercent?.toString() || '0',
    fabricType: detail.fabricType || '',
    color: detail.color || '',
    pattern: detail.pattern || '',
    occasion: detail.occasion || '',
    length: detail.length?.toString() || '5.5',
    width: detail.width?.toString() || '1.1',
    hasBlousePiece: detail.hasBlousePiece ?? false,
    blouseLength: detail.blouseLength?.toString() || '',
    washCare: detail.washCare || '',
    weight: detail.weight?.toString() || '',
    stockCount: detail.stockCount?.toString() || '',
    categoryId: detail.categoryId?.toString() || '',
    isActive: detail.isActive ?? true,
    isFeatured: detail.isFeatured ?? false,
    isNewArrival: detail.isNewArrival ?? false,
    manufactureDate: detail.manufactureDate
      ? new Date(detail.manufactureDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  })

  const startEdit = async (p) => {
    // First open the form with the basic list data so UI responds immediately
    setForm(populateForm(p))
    setEditId(p.id)
    setEditProduct(null)
    setEditSelectedCount(0)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // Then fetch the full ProductDetailDto (has description, length, categoryId, images, etc.)
    try {
      const { data } = await productsAPI.getById(p.id)
      if (data.success && data.data) {
        setForm(populateForm(data.data))
        setEditProduct(data.data)
      }
    } catch { /* non-fatal — form still works with list data */ }
  }

  const filtered = products
    .filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => {
      if (statusFilter === 'active')   return p.isActive
      if (statusFilter === 'inactive') return !p.isActive
      return true
    })

  // Derive unique option lists from already-loaded products for CreatableCombobox
  const fabricOptions  = [...new Set(products.map((p) => p.fabricType).filter(Boolean))].sort()
  const colorOptions   = [...new Set(products.map((p) => p.color).filter(Boolean))].sort()
  const patternOptions = [...new Set(products.map((p) => p.pattern).filter(Boolean))].sort()
  const occasionOptions = [...new Set(products.map((p) => p.occasion).filter(Boolean))].sort()

  // Called by InlineCategorySelect when a brand-new category is created
  const handleCategoryCreated = (newCat) => {
    setCategories((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)))
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="pl-10 pr-4 py-2 border rounded-lg text-sm w-56" />
          </div>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download Template */}
          <button
            onClick={downloadTemplate}
            className="border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:border-primary hover:text-primary transition"
            title="Download Excel template for bulk import"
          >
            <FiDownload size={14} /> Template
          </button>
          {/* Import Excel */}
          <button
            onClick={() => setShowBulkModal(true)}
            className="border border-primary text-primary px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-primary/5 transition"
          >
            <FiUpload size={14} /> Import Excel
          </button>
          {/* Add Product */}
          <button
            onClick={() => { setForm(EMPTY_PRODUCT); setEditId(null); setShowForm(true) }}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
          >
            <FiPlus /> Add Product
          </button>
        </div>
      </div>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <BulkImportModal
          categories={categories}
          onDone={() => { loadProducts(); setShowBulkModal(false) }}
          onClose={() => setShowBulkModal(false)}
        />
      )}

      {/* Delete Product Modal */}
      {deleteTarget && (
        <DeleteProductModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
            setDeleteTarget(null)
          }}
        />
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border border-primary/20">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-display font-semibold text-lg">{editId ? 'Edit Product' : 'New Product'}</h3>
            <button onClick={() => { setShowForm(false); setEditId(null) }} className="text-gray-400 hover:text-gray-700"><FiX size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Row 1 */}
            <input placeholder="Product Name *" required value={form.name} onChange={(e) => set('name', e.target.value)} className="md:col-span-2 border rounded-lg px-3 py-2 text-sm" />
            <InlineCategorySelect
              value={form.categoryId}
              onChange={(val) => set('categoryId', val)}
              categories={categories}
              onCategoryCreated={handleCategoryCreated}
            />

            {/* Short description */}
            <input placeholder="Short Description" value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} className="md:col-span-3 border rounded-lg px-3 py-2 text-sm" />

            {/* Full description */}
            <textarea placeholder="Full Description" value={form.description} onChange={(e) => set('description', e.target.value)} className="md:col-span-3 border rounded-lg px-3 py-2 text-sm h-20 resize-none" />

            {/* Pricing */}
            <input placeholder="Base Price (₹) *" required type="number" min="0" step="0.01" value={form.basePrice} onChange={(e) => set('basePrice', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Discount %" type="number" min="0" max="100" value={form.discountPercent} onChange={(e) => set('discountPercent', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Stock Count *" required type="number" min="0" value={form.stockCount} onChange={(e) => set('stockCount', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />

            {/* Product details — CreatableCombobox: pick existing or type a new value */}
            <CreatableCombobox
              value={form.fabricType}
              onChange={(v) => set('fabricType', v)}
              options={fabricOptions}
              placeholder="Fabric Type (e.g. Silk)"
            />
            <CreatableCombobox
              value={form.color}
              onChange={(v) => set('color', v)}
              options={colorOptions}
              placeholder="Color"
            />
            <CreatableCombobox
              value={form.pattern}
              onChange={(v) => set('pattern', v)}
              options={patternOptions}
              placeholder="Pattern (e.g. Zari, Plain)"
            />

            <CreatableCombobox
              value={form.occasion}
              onChange={(v) => set('occasion', v)}
              options={occasionOptions}
              placeholder="Occasion (e.g. Wedding, Casual)"
            />
            <input placeholder="Length (metres)" type="number" step="0.1" value={form.length} onChange={(e) => set('length', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Width (metres)" type="number" step="0.01" value={form.width} onChange={(e) => set('width', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />

            <input placeholder="Weight (kg)" type="number" step="0.01" value={form.weight} onChange={(e) => set('weight', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Blouse Length (metres)" type="number" step="0.1" value={form.blouseLength} onChange={(e) => set('blouseLength', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Wash Care Instructions" value={form.washCare} onChange={(e) => set('washCare', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />

            {/* Manufacture date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Manufacture Date *</label>
              <input type="date" value={form.manufactureDate} onChange={(e) => set('manufactureDate', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
            </div>

            {/* Flags */}
            <div className="md:col-span-2 flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.hasBlousePiece} onChange={(e) => set('hasBlousePiece', e.target.checked)} /> Has Blouse Piece
              </label>
              {editId && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active
                </label>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} /> Featured
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isNewArrival} onChange={(e) => set('isNewArrival', e.target.checked)} /> New Arrival
              </label>
            </div>

            {/* Image upload for NEW product — shown inline in the create form */}
            {!editId && (
              <div className="md:col-span-3 border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5 text-gray-700"><FiImage /> Product Images <span className="text-gray-400 font-normal">(optional — you can add them later too)</span></h4>
                <input
                  type="file"
                  ref={createFileRef}
                  multiple
                  accept=".jpg,.jpeg,.png,.webp"
                  className="text-sm w-full"
                />
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP • Max 5 MB each • First file becomes the primary image</p>
              </div>
            )}

            {/* Submit */}
            <div className="md:col-span-3 flex gap-3 pt-2">
              <button type="submit" disabled={uploadingImg} className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition text-sm disabled:opacity-60">
                {uploadingImg ? 'Saving…' : editId ? 'Update Product' : 'Create Product'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); setEditProduct(null) }} className="border px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>

          {/* Image management — only for editing an existing product */}
          {editId && (
            <div className="mt-5 pt-5 border-t">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-1.5 text-gray-700"><FiImage /> Product Images</h4>

              {/* Existing images grid */}
              {editProduct?.images?.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {editProduct.images.map((img) => (
                    <div key={img.id} className="relative group w-24 h-28 rounded-lg overflow-hidden border bg-gray-50">
                      <img src={img.imageUrl} alt={img.altText || 'product'} className="w-full h-full object-cover" />
                      {img.isPrimary && (
                        <span className="absolute top-1 left-1 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full">Primary</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                        title="Delete image"
                      >
                        <FiX size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {editProduct && editProduct.images?.length === 0 && (
                <p className="text-sm text-gray-400 mb-3">No images yet.</p>
              )}
              {!editProduct && (
                <p className="text-sm text-gray-400 mb-3">Loading images…</p>
              )}

              {/* Upload new images */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 border border-dashed border-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
                    <FiImage size={14} />
                    {editSelectedCount > 0 ? `${editSelectedCount} file${editSelectedCount > 1 ? 's' : ''} selected` : 'Choose Images'}
                    <input
                      type="file"
                      ref={fileRef}
                      multiple
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => setEditSelectedCount(e.target.files?.length ?? 0)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleImageUpload(editId)}
                    disabled={uploadingImg || editSelectedCount === 0}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <FiUpload size={14} /> {uploadingImg ? 'Uploading…' : 'Upload'}
                  </button>
                  {editSelectedCount === 0 && (
                    <span className="text-xs text-amber-600">⚠ Select image files first, then click Upload</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">JPG, PNG, WebP • Max 5 MB each • First upload becomes primary when no images exist</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            {statusFilter === 'all' && products.length > 0 && (
              <span className="ml-2 text-xs text-gray-400">
                ({products.filter(p => p.isActive).length} active · {products.filter(p => !p.isActive).length} inactive)
              </span>
            )}
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
            <p>{search || statusFilter !== 'all' ? 'No products match your filters.' : 'No products yet. Click "Add Product" to get started.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 bg-gray-50 border-b">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">New Arrival</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((p) => (
                  <tr key={p.id} className={`hover:bg-gray-50 ${!p.isActive ? 'opacity-60 bg-gray-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 bg-gray-100 rounded overflow-hidden shrink-0">
                          {p.primaryImageUrl
                            ? <img src={p.primaryImageUrl} alt={p.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-300"><FiImage size={16} /></div>
                          }
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.fabricType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.categoryName}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">₹{p.sellingPrice?.toLocaleString('en-IN')}</span>
                      {p.discountPercent > 0 && <span className="text-xs text-red-500 ml-1">-{p.discountPercent}%</span>}
                    </td>
                    {/* stockCount is the correct field from ProductDto */}
                    <td className="px-4 py-3">
                      <span className={p.stockCount < 10 ? 'text-red-500 font-medium' : ''}>{p.stockCount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        title={p.isActive ? 'Click to deactivate' : 'Click to activate'}
                        className={`text-xs px-2 py-1 rounded-full font-medium border transition hover:opacity-80 cursor-pointer ${
                          p.isActive
                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                            : 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200'
                        }`}
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleNewArrival(p)}
                        title={p.isNewArrival ? 'Click to remove from New Arrivals' : 'Click to add to New Arrivals'}
                        className={`text-xs px-2 py-1 rounded-full font-medium border transition cursor-pointer ${
                          p.isNewArrival
                            ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
                            : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {p.isNewArrival ? '✦ Yes' : 'No'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(p)} title="Edit" className="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><FiEdit2 size={14} /></button>
                        <button onClick={() => handleDelete(p)} title="Delete" className="text-red-500 hover:bg-red-50 p-1.5 rounded"><FiTrash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Orders Tab ─── */
function OrdersTab() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [trackingInputs, setTrackingInputs] = useState({})

  useEffect(() => {
    async function load() {
      try {
        // Use correct API name: getAllOrders, pass proper params object
        const { data } = await adminAPI.getAllOrders({ page: 1, pageSize: 50 })
        if (data.success) setOrders(data.data?.items || [])
        else toast.error(data.message || 'Failed to load orders')
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load orders')
      }
      setLoading(false)
    }
    load()
  }, [])

  const updateStatus = async (orderId, status) => {
    const trackingNumber = trackingInputs[orderId] || undefined
    try {
      // UpdateOrderStatusDto expects { status, trackingNumber?, courierName? }
      const { data } = await adminAPI.updateOrderStatus(orderId, { status, trackingNumber })
      if (data.success) {
        toast.success(`Status updated to ${status}`)
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, orderStatus: status } : o))
      } else toast.error(data.message)
    } catch { toast.error('Failed to update status') }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl">
          <FiPackage size={40} className="mx-auto mb-3 opacity-30" />
          <p>No orders yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 bg-gray-50 border-b">
                  <th className="px-4 py-3 font-medium">Order #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Tracking #</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">View</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                    <td className="px-4 py-3">{o.customerName}</td>
                    <td className="px-4 py-3 font-medium">₹{o.totalAmount?.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-gray-600">{o.paymentMethod}</td>
                    <td className="px-4 py-3">
                      <input
                        value={trackingInputs[o.id] ?? o.trackingNumber ?? ''}
                        onChange={(e) => setTrackingInputs((prev) => ({ ...prev, [o.id]: e.target.value }))}
                        placeholder="Add tracking"
                        className="text-xs border rounded px-2 py-1 w-28"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={o.orderStatus}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        className="text-xs border rounded px-2 py-1"
                      >
                        {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <Link to={`/orders/${o.id}`} className="text-primary hover:underline text-xs">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Categories Tab ─── */
function CategoriesTab() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', displayOrder: '0', isActive: true })
  // image upload state
  const [imgPreview, setImgPreview] = useState(null)   // data-url for preview
  const [imgFile, setImgFile] = useState(null)          // File object to upload
  const [uploadingImg, setUploadingImg] = useState(false)
  const catFileRef = useRef(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await categoriesAPI.getAll()
      if (data.success) setCategories(data.data || [])
    } catch { /* */ }
    setLoading(false)
  }

  const openForm = (cat = null) => {
    if (cat) {
      setForm({ name: cat.name, description: cat.description || '', displayOrder: cat.displayOrder?.toString() || '0', isActive: cat.isActive })
      setEditId(cat.id)
      setImgPreview(cat.imageUrl || null)
    } else {
      setForm({ name: '', description: '', displayOrder: '0', isActive: true })
      setEditId(null)
      setImgPreview(null)
    }
    setImgFile(null)
    setShowForm(true)
    if (catFileRef.current) catFileRef.current.value = ''
  }

  const handleImgChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    setImgFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImgPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      description: form.description,
      displayOrder: parseInt(form.displayOrder) || 0,
      ...(editId ? { isActive: form.isActive } : {}),
    }
    try {
      const res = editId
        ? await adminAPI.updateCategory(editId, payload)
        : await adminAPI.createCategory(payload)
      if (!res.data.success) { toast.error(res.data.message); return }

      const savedId = editId || res.data.data?.id

      // Upload image if a file was chosen
      if (imgFile && savedId) {
        setUploadingImg(true)
        try {
          await adminAPI.uploadCategoryImage(savedId, imgFile)
        } catch { toast.error('Category saved but image upload failed') }
        setUploadingImg(false)
      }

      toast.success(editId ? 'Category updated!' : 'Category created!')
      load()
      setShowForm(false)
      setEditId(null)
      setImgFile(null)
      setImgPreview(null)
    } catch { toast.error('Failed to save category') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? Products in this category may be affected.')) return
    try {
      const { data } = await adminAPI.deleteCategory(id)
      if (data.success) { toast.success('Category deleted'); load() }
      else toast.error(data.message)
    } catch { toast.error('Failed to delete') }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display font-semibold">Categories ({categories.length})</h3>
        <button onClick={() => openForm()}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
          <FiPlus /> Add Category
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 border border-primary/20">
          <input placeholder="Category Name *" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Display Order (0 = first)" type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="md:col-span-2 border rounded-lg px-3 py-2 text-sm" />

          {/* ── Category Image ── */}
          <div className="md:col-span-2">
            <p className="text-xs text-gray-500 mb-2 font-medium">Category Image</p>
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                {imgPreview
                  ? <img src={imgPreview} alt="preview" className="w-full h-full object-cover" />
                  : <FiImage size={28} className="text-gray-300" />}
              </div>
              <div className="flex flex-col gap-2">
                <input ref={catFileRef} type="file" accept="image/*" className="hidden" onChange={handleImgChange} />
                <button type="button" onClick={() => catFileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition">
                  <FiUpload size={13} /> {imgPreview ? 'Replace Image' : 'Upload Image'}
                </button>
                {imgFile && <p className="text-xs text-green-600">✓ {imgFile.name}</p>}
                {!imgFile && imgPreview && <p className="text-xs text-gray-400">Current image shown — upload a new file to replace it</p>}
                {!imgPreview && <p className="text-xs text-gray-400">Recommended: square image, min 400×400 px</p>}
              </div>
            </div>
          </div>

          {editId && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
            </label>
          )}
          <div className={`${editId ? '' : 'md:col-span-2'} flex gap-3`}>
            <button type="submit" disabled={uploadingImg}
              className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              {uploadingImg ? 'Uploading…' : editId ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setImgFile(null); setImgPreview(null) }}
              className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((c) => (
          <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm">
            {c.imageUrl
              ? <img src={c.imageUrl} alt={c.name} className="w-full h-28 object-contain rounded-lg mb-3 bg-gray-50" />
              : <div className="w-full h-28 rounded-lg mb-3 bg-gray-100 flex items-center justify-center"><FiImage size={28} className="text-gray-300" /></div>}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold">{c.name}</h4>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>
                <p className="text-xs text-gray-400 mt-1">{c.productCount || 0} products</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {c.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-3 mt-3 pt-3 border-t">
              <button onClick={() => openForm(c)} className="text-blue-500 text-xs hover:underline flex items-center gap-1">
                <FiEdit2 size={12} /> Edit
              </button>
              <button onClick={() => handleDelete(c.id)} className="text-red-500 text-xs hover:underline flex items-center gap-1">
                <FiTrash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Reviews Tab ─── */
function ReviewsTab() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load pending/all reviews via admin approve/delete endpoints
    // We piggyback on product reviews - load from /reviews/product/:id isn't ideal for admin
    // Provide a simple list loaded from public products review endpoint
    setLoading(false)
  }, [])

  const handleApprove = async (reviewId) => {
    try {
      const { data } = await adminAPI.approveReview(reviewId)
      if (data.success) {
        toast.success('Review approved!')
        setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, isApproved: true } : r))
      } else toast.error(data.message)
    } catch { toast.error('Failed to approve') }
  }

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return
    try {
      const { data } = await adminAPI.deleteReview(reviewId)
      if (data.success) {
        toast.success('Review deleted')
        setReviews((prev) => prev.filter((r) => r.id !== reviewId))
      } else toast.error(data.message)
    } catch { toast.error('Failed to delete') }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Reviews are shown per-product. Use the <strong>approve</strong> / <strong>delete</strong> actions below once you have the review IDs, or navigate to a product listing to moderate reviews there.
      </p>
      {reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl">
          <FiStar size={40} className="mx-auto mb-3 opacity-30" />
          <p>No reviews loaded. Reviews moderation is triggered per-product.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm divide-y">
          {reviews.map((r) => (
            <div key={r.id} className="p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-sm">{r.userName}</p>
                <p className="text-xs text-gray-500">{r.title}</p>
                <p className="text-sm text-gray-700 mt-1">{r.comment}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {!r.isApproved && (
                  <button onClick={() => handleApprove(r.id)} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200">Approve</button>
                )}
                <button onClick={() => handleDelete(r.id)} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full hover:bg-red-200">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Settings Tab ─── */
function SettingsTab() {
  const [heroImage, setHeroImage] = useState(() => localStorage.getItem('sg_heroImage') || null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    setSaving(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      localStorage.setItem('sg_heroImage', dataUrl)
      setHeroImage(dataUrl)
      setSaving(false)
      toast.success('Hero image updated!')
      // Reset input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = ''
    }
    reader.onerror = () => { toast.error('Failed to read image'); setSaving(false) }
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    localStorage.removeItem('sg_heroImage')
    setHeroImage(null)
    toast.success('Hero image removed')
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Site Settings</h2>

      {/* Hero Image Section */}
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-1 flex items-center gap-2"><FiImage size={16} /> Homepage Hero Image</h3>
        <p className="text-xs text-gray-500 mb-5">This image appears in the hero banner on the homepage. Recommended size: 800 × 1000 px (portrait). Max 5 MB.</p>

        {/* Preview */}
        {heroImage ? (
          <div className="relative w-56 rounded-xl overflow-hidden border shadow-md mb-5 group">
            <img src={heroImage} alt="Hero preview" className="w-full aspect-[4/5] object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button onClick={handleRemove}
                className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shadow">
                <FiTrash size={12} /> Remove
              </button>
            </div>
            <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <FiCheckCircle size={10} /> Active
            </span>
          </div>
        ) : (
          <div className="w-56 aspect-[4/5] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 mb-5 bg-gray-50">
            <FiImage size={36} className="mb-2 opacity-40" />
            <p className="text-xs text-center px-4">No hero image set<br />Upload one below</p>
          </div>
        )}

        {/* Upload button */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <button onClick={() => fileRef.current?.click()} disabled={saving}
          className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition disabled:opacity-60">
          <FiUpload size={14} /> {saving ? 'Processing…' : heroImage ? 'Replace Image' : 'Upload Image'}
        </button>
        {heroImage && (
          <button onClick={handleRemove}
            className="ml-3 inline-flex items-center gap-1.5 text-red-500 hover:text-red-700 text-sm font-medium transition">
            <FiTrash size={13} /> Remove
          </button>
        )}

        <p className="text-xs text-gray-400 mt-4">💡 The image is stored in your browser. To share across devices, use a product image URL instead.</p>
      </div>
    </div>
  )
}

/* ─── Main Admin Dashboard ─── */
const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: FiGrid },
  { key: 'products', label: 'Products', icon: FiShoppingBag },
  { key: 'orders', label: 'Orders', icon: FiPackage },
  { key: 'categories', label: 'Categories', icon: FiList },
  { key: 'reviews', label: 'Reviews', icon: FiStar },
  { key: 'settings', label: 'Settings', icon: FiSettings },
]

export default function AdminDashboard() {
  const { user } = useSelector((s) => s.auth)
  const [tab, setTab] = useState('dashboard')

  if (!user || user.role !== 'Admin') return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-display font-bold text-gray-700 mb-2">Access Denied</h2>
      <p className="text-gray-500">You need admin privileges to access this page.</p>
      <Link to="/" className="text-primary font-medium hover:underline mt-2 inline-block">Go Home</Link>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-display font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === t.key ? 'bg-white shadow text-primary' : 'text-gray-600 hover:text-gray-900'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'products' && <ProductsTab />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'reviews' && <ReviewsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}
