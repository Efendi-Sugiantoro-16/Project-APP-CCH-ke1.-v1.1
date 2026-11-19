import { ChevronDown } from 'lucide-react'

/**
 * Reusable Form Select Component
 * Modern dropdown select with validation feedback matching FormInput
 */
export function FormSelect({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  options = [],
  required = false,
  disabled = false,
  placeholder = '-- Pilih --',
  className = '',
}) {
  const selectId = `select-${name}`

  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={selectId} className="form-label text-xs font-semibold text-slate-700 mb-1 block">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <select
          className={`w-full appearance-none px-3 py-2 pr-9 text-sm border rounded-xl transition bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
            disabled
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              : error
              ? 'border-red-400 bg-red-50/20 ring-1 ring-red-400/20'
              : 'border-slate-200 hover:border-slate-300 text-slate-800'
          }`}
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          disabled={disabled}
        >
          <option value="" disabled={required} className="text-slate-400">
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-slate-800 py-1">
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && (
        <div className="text-xs text-red-500 mt-1">
          {error}
        </div>
      )}
    </div>
  )
}

