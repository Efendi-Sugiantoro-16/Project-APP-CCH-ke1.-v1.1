import { useContext, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Search, Sparkles, User, UserPlus, X } from 'lucide-react'
import { AuthContext } from '../../../auth/auth-context.js'
import { customersApi } from '../../../customers/api/customersApi.js'
import { QuickAddCustomerModal } from '../../../customers/components/QuickAddCustomerModal.jsx'
import { FormInput } from '../form/FormInput.jsx'
import { FormTextarea } from '../form/FormTextarea.jsx'
import { OfficeCombobox } from '../form/OfficeCombobox.jsx'

/**
 * Step 1: Customer Information
 * Enhanced with cchentricus live search (199k records) and quick-add customer (addopt)
 */
export function CustomerInfoStep({
  formData,
  errors,
  onChange,
  onBlur,
  onSelectCustomer,
  offices = [],
}) {
  const { token } = useContext(AuthContext)

  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Quick Add Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const dropdownRef = useRef(null)

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchTerm(val)
    if (val.trim().length < 3) {
      setSearchResults([])
      setIsSearching(false)
      setSearchError('')
    }
  }

  // Debounced search
  useEffect(() => {
    const trimmed = searchTerm.trim()
    if (trimmed.length < 3) {
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      setSearchError('')
      try {
        // Try Call Center search first, fallback to list search
        let res
        try {
          res = await customersApi.search(token, trimmed, 8)
        } catch {
          res = await customersApi.list(token, { q: trimmed, limit: 8 })
        }
        const items = res?.data || []
        setSearchResults(items)
        setShowDropdown(true)
      } catch (err) {
        setSearchError(err?.message || 'Gagal mencari data pelanggan')
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [searchTerm, token])

  const handlePickCustomer = (customer) => {
    if (onSelectCustomer) {
      onSelectCustomer({
        id: customer.id,
        name: customer.full_name || customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      })
    } else {
      // Fallback synthetic changes
      const fields = [
        { name: 'customerId', value: String(customer.id || '') },
        { name: 'customerName', value: customer.full_name || customer.name || '' },
        { name: 'customerEmail', value: customer.email || '' },
        { name: 'customerPhone', value: customer.phone || '' },
        { name: 'customerAddress', value: customer.address || '' },
      ]
      fields.forEach((f) => onChange?.({ target: f }))
    }
    setShowDropdown(false)
    setSearchTerm('')
  }

  const handleClearSelected = () => {
    if (onSelectCustomer) {
      onSelectCustomer({
        id: '',
        name: formData.customerName,
        email: formData.customerEmail,
        phone: formData.customerPhone,
        address: formData.customerAddress,
      })
    } else {
      onChange?.({ target: { name: 'customerId', value: '' } })
    }
  }

  return (
    <div className="customer-info-step">
      {/* Modern Section Header */}
      <div className="mb-6 pb-4 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Informasi Pelanggan</h3>
              <p className="text-sm text-slate-500">
                Data identitas, kontak pengadu, dan integrasi profil cchentricus
              </p>
            </div>
          </div>

          {/* Quick Add Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Pelanggan Baru (addopt)</span>
          </button>
        </div>
      </div>

      {/* Lookup Bar & Autocomplete */}
      <div className="mb-6 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/40 p-4 shadow-xs" ref={dropdownRef}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Cari Cepat Pelanggan Terdaftar (cchentricus)
          </label>
          <span className="text-[11px] text-blue-600/80">Ketik minimal 3 karakter (Nama / Nomor HP)</span>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => {
              if (searchResults.length > 0) setShowDropdown(true)
            }}
            placeholder="Cari berdasarkan nama lengkap atau nomor telepon..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition shadow-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setSearchResults([])
                setShowDropdown(false)
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Ditemukan {searchResults.length} Pelanggan (Klik untuk pilih)
              </div>
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePickCustomer(item)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50/80 transition flex items-start justify-between gap-3 group cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800 group-hover:text-blue-600 transition truncate">
                        {item.full_name || item.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                        #{item.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>📞 {item.phone || '-'}</span>
                      {item.email && <span className="truncate">✉️ {item.email}</span>}
                    </div>
                    {item.address && (
                      <p className="mt-1 text-xs text-slate-400 line-clamp-1 truncate">
                        📍 {item.address}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition self-center">
                    Gunakan →
                  </span>
                </button>
              ))}
            </div>
          )}

          {showDropdown && searchTerm.trim().length >= 3 && searchResults.length === 0 && !isSearching && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200 p-4 text-center shadow-lg">
              <p className="text-xs text-slate-500">
                Tidak ada data pelanggan yang cocok dengan <strong className="text-slate-700">"{searchTerm}"</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false)
                  setIsAddModalOpen(true)
                }}
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Daftarkan Sebagai Pelanggan Baru Sekarang
              </button>
            </div>
          )}
        </div>

        {searchError && (
          <p className="mt-2 text-xs text-rose-600">{searchError}</p>
        )}

        {/* Selected Customer Notification Pill */}
        {formData.customerId && (
          <div className="mt-3 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Terhubung ke Profil Pelanggan ID: <strong>#{formData.customerId}</strong> ({formData.customerName || 'Tervalidasi'})
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearSelected}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline ml-2 cursor-pointer"
            >
              Lepas Kaitan
            </button>
          </div>
        )}
      </div>

      {/* Customer ID & Name Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormInput
          label="ID Pelanggan (cchentricus)"
          name="customerId"
          value={formData.customerId ? `#${formData.customerId}` : ''}
          placeholder="Terisi otomatis saat pelanggan dipilih"
          disabled
        />
        <FormInput
          label="Nama Pelanggan"
          name="customerName"
          value={formData.customerName}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.customerName}
          placeholder="Masukkan nama lengkap pelanggan"
          required
          maxLength={100}
        />
      </div>

      {/* Email & Phone Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormInput
          label="Email"
          name="customerEmail"
          type="email"
          value={formData.customerEmail}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.customerEmail}
          placeholder="email@example.com (opsional)"
          maxLength={100}
        />
        <FormInput
          label="Nomor Telepon"
          name="customerPhone"
          type="tel"
          value={formData.customerPhone}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.customerPhone}
          placeholder="08xx xxxx xxxx"
          required
          maxLength={15}
        />
      </div>

      {/* Address Full Width */}
      <div className="mb-4">
        <FormTextarea
          label="Alamat"
          name="customerAddress"
          value={formData.customerAddress}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.customerAddress}
          placeholder="Masukkan alamat lengkap pelanggan"
          required
          rows={3}
          maxLength={255}
        />
      </div>

      {/* Office Routing Section */}
      <div className="mt-6 mb-4 pb-3 border-b border-slate-200">
        <h4 className="text-base font-semibold text-slate-700 flex items-center gap-2">
          Routing Kantor Pengirim
        </h4>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Informasi kantor asal, tujuan, dan tembusan pengaduan</p>
      </div>

      {/* Office Codes Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
        <OfficeCombobox
          label="Kantor Asal"
          name="originOffice"
          value={formData.originOffice}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.originOffice}
          offices={offices}
          placeholder="Cari kantor asal..."
          required
          showQuickChips={true}
        />
        <OfficeCombobox
          label="Kantor Tujuan Investigasi"
          name="targetOffice"
          value={formData.targetOffice}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.targetOffice}
          offices={offices}
          placeholder="Pilih kantor tujuan..."
          required
          showQuickChips={true}
        />
        <OfficeCombobox
          label="Kantor Tembusan (Opsional)"
          name="ccOffice"
          value={formData.ccOffice}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.ccOffice}
          offices={offices}
          placeholder="Pilih kantor tembusan..."
        />
      </div>

      {/* Info Alert with Modern Styling */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-3 sm:p-4 flex gap-3 text-xs sm:text-sm">
        <div>
          <p className="font-semibold text-blue-900">Tips Integrasi Pelanggan</p>
          <p className="text-blue-700 mt-1 leading-relaxed">
            Gunakan fitur cari pelanggan atau <strong>+ Pelanggan Baru (addopt)</strong> untuk menghubungkan pengaduan ini dengan riwayat pelanggan di database Pos Indonesia.
          </p>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      <QuickAddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handlePickCustomer}
        token={token}
      />
    </div>
  )
}
