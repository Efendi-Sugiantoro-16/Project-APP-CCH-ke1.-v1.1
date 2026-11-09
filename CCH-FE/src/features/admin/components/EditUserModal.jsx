import { useContext, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Loader2,
  X,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { usersApi } from '../api/usersApi.js'

function EditUserForm({ user, onClose, onUpdated, levels = [], offices = [] }) {
  const { token } = useContext(AuthContext)

  // Filter out Anonymous (-2) and Default (0)
  const allowedLevels = useMemo(() => {
    return levels.filter((lvl) => {
      const idNum = Number(lvl.id ?? lvl.User_Level_ID)
      return idNum !== -2 && idNum !== 0 && !isNaN(idNum)
    })
  }, [levels])

  // Extract unique parent/regional offices for "Kantor Induk"
  const parentOffices = useMemo(() => {
    const officeMap = new Map()
    offices.forEach((o) => {
      const code = o.code || o.office_code
      const name = o.name || o.office_name
      if (code) officeMap.set(code, name || code)
    })

    const knownRegionalCodes = [
      '10004', '10005', '20004', '40004', '40005', '50004', '60004', '90004',
    ]

    const parentSet = new Set(knownRegionalCodes)
    offices.forEach((o) => {
      if (o.regional_code) parentSet.add(o.regional_code)
      if (o.type === 'KP' || o.type === 'Divre') {
        const code = o.code || o.office_code
        if (code) parentSet.add(code)
      }
    })

    const list = Array.from(parentSet).map((code) => ({
      code,
      name: officeMap.get(code) || (code === '40005' ? 'KANTOR PUSAT BANDUNG' : `Regional ${code}`),
    }))

    return list.sort((a, b) => a.code.localeCompare(b.code))
  }, [offices])

  const [formData, setFormData] = useState({
    username: user.username || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    phone: user.phone || '',
    user_level_id: String(user.user_level_id || '3'),
    office_code: user.office_code || '',
    report_to: user.report_to || '',
    activated: user.activated || 'Y',
    locked: user.locked || 'N',
    current_status: user.current_status || 'Logout',
    display_in_cs_list: user.display_in_cs_list || 'Y',
  })

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Filter child offices based on selected Kantor Induk
  const filteredOffices = useMemo(() => {
    if (!formData.report_to) return offices
    const list = offices.filter(
      (o) =>
        o.regional_code === formData.report_to ||
        (o.code || o.office_code) === formData.report_to
    )
    return list.length > 0 ? list : offices
  }, [offices, formData.report_to])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const next = { ...prev, [name]: value }

      if (name === 'report_to') {
        const match = offices.find(
          (o) =>
            o.regional_code === value ||
            (o.code || o.office_code) === value
        )
        if (match) {
          next.office_code = match.code || match.office_code
        }
      }

      if (name === 'office_code') {
        const selected = offices.find(
          (o) => (o.code || o.office_code) === value
        )
        if (selected && selected.regional_code) {
          next.report_to = selected.regional_code
        }
      }

      return next
    })

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleToggleCS = () => {
    setFormData((prev) => ({
      ...prev,
      display_in_cs_list: prev.display_in_cs_list === 'Y' ? 'N' : 'Y',
    }))
  }

  const validate = () => {
    const errs = {}
    if (!formData.user_level_id) {
      errs.user_level_id = 'Level / role pengguna wajib dipilih.'
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Format email tidak valid.'
    }
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    setSuccessMsg('')

    const valErrors = validate()
    if (Object.keys(valErrors).length > 0) {
      setErrors(valErrors)
      return
    }

    setSubmitting(true)
    try {
      await usersApi.updateUser(token, formData.username, {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        user_level_id: String(formData.user_level_id),
        office_code: formData.office_code.trim(),
        report_to: formData.report_to.trim(),
        activated: formData.activated,
        locked: formData.locked,
        current_status: formData.current_status,
        display_in_cs_list: formData.display_in_cs_list,
      })

      setSuccessMsg(`Data pengguna "${formData.username}" berhasil diperbarui!`)
      setTimeout(() => {
        if (onUpdated) onUpdated()
        onClose()
      }, 900)
    } catch (err) {
      setSubmitError(err.message || 'Gagal memperbarui data pengguna.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#2b3035] text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden z-10 my-4 flex flex-col max-h-[92vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 px-6 py-3.5 bg-slate-50 dark:bg-[#212529]/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Edit3 size={16} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                Ubah Data Pengguna
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 hover:text-slate-700 dark:hover:text-slate-100 transition"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 space-y-3.5 overflow-y-auto text-sm"
        >
          {submitError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/40 p-3 text-red-700 dark:text-red-200 text-xs sm:text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500 dark:text-red-400" />
              <span>{submitError}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-emerald-700 dark:text-emerald-200 text-xs sm:text-sm">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ID Pengguna (Readonly) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <label className="sm:col-span-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-right">
              ID Pengguna
            </label>
            <div className="sm:col-span-8">
              <input
                type="text"
                value={formData.username}
                disabled
                className="w-full bg-slate-100 dark:bg-[#343a40] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm cursor-not-allowed font-mono"
              />
            </div>
          </div>

          {/* Kantor Induk */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <label className="sm:col-span-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-right">
              Kantor Induk
            </label>
            <div className="sm:col-span-8">
              <select
                name="report_to"
                value={formData.report_to}
                onChange={handleChange}
                disabled={submitting}
                className="w-full bg-white dark:bg-[#3a4149] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value="">Pilih Kantor Induk...</option>
                {parentOffices.map((po) => (
                  <option key={po.code} value={po.code}>
                    {po.name} ({po.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Kantor */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <label className="sm:col-span-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-right">
              Kantor
            </label>
            <div className="sm:col-span-8">
              <select
                name="office_code"
                value={formData.office_code}
                onChange={handleChange}
                disabled={submitting}
                className="w-full bg-white dark:bg-[#3a4149] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value="">Pilih Kantor...</option>
                {filteredOffices.map((off) => {
                  const code = off.code || off.office_code
                  const name = off.name || off.office_name || code
                  return (
                    <option key={code} value={code}>
                      {name} ({code})
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {/* Level Pengguna * */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <label className="sm:col-span-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-right">
              Level Pengguna <span className="text-red-500">*</span>
            </label>
            <div className="sm:col-span-8">
              <select
                name="user_level_id"
                value={formData.user_level_id}
                onChange={handleChange}
                disabled={submitting}
                className={`w-full bg-white dark:bg-[#3a4149] text-slate-900 dark:text-white border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${
                  errors.user_level_id ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {allowedLevels.length > 0 ? (
                  allowedLevels.map((lvl) => (
                    <option key={lvl.id ?? lvl.User_Level_ID} value={String(lvl.id ?? lvl.User_Level_ID)}>
                      {lvl.name ?? lvl.User_Level_Name} (Level {lvl.id ?? lvl.User_Level_ID})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="-1">Administrator (Level -1)</option>
                    <option value="1">UPT (Level 1)</option>
                    <option value="2">UPT dan Bandara (Level 2)</option>
                    <option value="3">Call Center (Level 3)</option>
                    <option value="9">Admin UPT (Level 9)</option>
                    <option value="10">Regional (Level 10)</option>
                    <option value="19">Admin Regional (Level 19)</option>
                    <option value="20">Kantor Pusat (Level 20)</option>
                    <option value="29">Admin Pusat (Level 29)</option>
                    <option value="30">Direksi (Level 30)</option>
                  </>
                )}
              </select>
              {errors.user_level_id && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.user_level_id}</p>
              )}
            </div>
          </div>

          {/* Nama Awal */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <label className="sm:col-span-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-right">
              Nama Awal
            </label>
            <div className="sm:col-span-8">
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Nama Awal"
                disabled={submitting}
                className="w-full bg-white dark:bg-[#3a4149] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Nama Akhir */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <label className="sm:col-span-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-right">
              Nama Akhir
            </label>
            <div className="sm:col-span-8">
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Nama Akhir"
                disabled={submitting}
                className="w-full bg-white dark:bg-[#3a4149] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Email */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <label className="sm:col-span-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-right">
              Email
            </label>
            <div className="sm:col-span-8">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nama@posindonesia.co.id"
                disabled={submitting}
                className={`w-full bg-white dark:bg-[#3a4149] text-slate-900 dark:text-white border rounded px-3 py-2 text-sm placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${
                  errors.email ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Telepon */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <label className="sm:col-span-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-right">
              Telepon
            </label>
            <div className="sm:col-span-8">
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Telepon"
                disabled={submitting}
                className="w-full bg-white dark:bg-[#3a4149] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Apakah Aktif? */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <label className="sm:col-span-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-right">
              Apakah Aktif?
            </label>
            <div className="sm:col-span-8">
              <select
                name="activated"
                value={formData.activated}
                onChange={handleChange}
                disabled={submitting}
                className="w-full bg-white dark:bg-[#3a4149] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value="Y">Ya</option>
                <option value="N">Tidak</option>
              </select>
            </div>
          </div>

          {/* Apakah Terkunci? */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <label className="sm:col-span-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-right">
              Apakah Terkunci?
            </label>
            <div className="sm:col-span-8">
              <select
                name="locked"
                value={formData.locked}
                onChange={handleChange}
                disabled={submitting}
                className="w-full bg-white dark:bg-[#3a4149] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value="N">Tidak</option>
                <option value="Y">Ya</option>
              </select>
            </div>
          </div>

          {/* Status Sekarang */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <label className="sm:col-span-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-right">
              Status Sekarang
            </label>
            <div className="sm:col-span-8">
              <select
                name="current_status"
                value={formData.current_status}
                onChange={handleChange}
                disabled={submitting}
                className="w-full bg-white dark:bg-[#3a4149] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value="Logout">Logout</option>
                <option value="Login">Login</option>
              </select>
            </div>
          </div>

          {/* Tampilkan di Daftar CS? (Toggle) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
            <label className="sm:col-span-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 sm:text-right">
              Tampilkan di Daftar CS?
            </label>
            <div className="sm:col-span-8 flex items-center">
              <button
                type="button"
                onClick={handleToggleCS}
                disabled={submitting}
                role="switch"
                aria-checked={formData.display_in_cs_list === 'Y'}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.display_in_cs_list === 'Y' ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.display_in_cs_list === 'Y' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#212529]/90 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition shadow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Menyimpan…</span>
              </>
            ) : (
              <span>Simpan Perubahan</span>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex items-center justify-center px-4 py-2 rounded bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-700 dark:bg-[#495057] dark:hover:bg-[#5a6268] dark:active:bg-[#343a40] dark:text-slate-200 text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}

export function EditUserModal({ user, isOpen, onClose, onUpdated, levels = [], offices = [] }) {
  if (!isOpen || !user) return null

  return createPortal(
    <EditUserForm
      user={user}
      onClose={onClose}
      onUpdated={onUpdated}
      levels={levels}
      offices={offices}
    />,
    document.body
  )
}
