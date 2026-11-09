/**
 * Reusable Form Input Component
 * Supports text, email, tel, number types with validation feedback
 */
export function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  required = false,
  disabled = false,
  maxLength,
  showCharCount = false,
  className = '',
}) {
  const inputId = `input-${name}`

  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={inputId} className="form-label text-xs font-semibold text-slate-700 mb-1 block">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        className={`form-control w-full px-3 py-2 text-sm border rounded-xl transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
          error ? 'border-red-400 bg-red-50/20' : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
      />
      {error && (
        <div className="text-xs text-red-500 mt-1" style={{ display: 'block' }}>
          {error}
        </div>
      )}
      {maxLength && showCharCount && !error && (
        <small className="text-[11px] text-slate-400 mt-0.5 block">
          {value?.length || 0}/{maxLength} karakter
        </small>
      )}
    </div>
  )
}
