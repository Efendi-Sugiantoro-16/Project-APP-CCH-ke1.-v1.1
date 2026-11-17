import { useState, useCallback } from 'react'

/**
 * Custom hook for managing complaint form state and validation
 */
export function useComplaintForm() {
  const [formData, setFormData] = useState({
    // Customer Info
    customerId: '', // ID_Pelanggan
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    originOffice: '', // Kantor_Asal
    targetOffice: '', // Kantor_Tujuan
    ccOffice: '', // Kantor_Tembusan (carbon copy)
    // Complaint Details
    complaintTypeCode: '',
    complaintSourceCode: '',
    shipmentTypeCode: '',
    shipmentNumber: '',
    summary: '',
    description: '',
    shipmentOriginOffice: '', // Kantor_Asal_Kiriman
    shipmentTargetOffice: '', // Kantor_Tujuan_Kiriman
  })

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error on change
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }))
  }, [])

  const handleBlur = useCallback((e) => {
    const { name } = e.target
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }))
  }, [])

  const validateField = useCallback((name, value) => {
    switch (name) {
      case 'customerName':
        if (!value || value.trim() === '') return 'Nama pelanggan wajib diisi'
        if (value.length > 100) return 'Nama terlalu panjang (maksimal 100 karakter)'
        return ''

      case 'customerPhone':
        if (!value || value.trim() === '') return 'Nomor telepon wajib diisi'
        if (value.length > 15) return 'Nomor telepon terlalu panjang'
        return ''

      case 'customerEmail':
        if (value && value.length > 100) return 'Email terlalu panjang (maksimal 100 karakter)'
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return 'Format email tidak valid'
        return ''

      case 'customerAddress':
        if (!value || value.trim() === '') return 'Alamat pelanggan wajib diisi'
        if (value.length > 255) return 'Alamat terlalu panjang (maksimal 255 karakter)'
        return ''

      case 'originOffice':
        if (!value || value.trim() === '') return 'Kantor asal wajib diisi'
        if (value.length < 3 || value.length > 20) return 'Kode kantor harus 3-20 karakter'
        return ''

      case 'targetOffice':
        if (!value || value.trim() === '') return 'Kantor tujuan wajib diisi'
        if (value.length < 3 || value.length > 20) return 'Kode kantor harus 3-20 karakter'
        return ''

      case 'ccOffice':
        if (value && (value.length < 3 || value.length > 20))
          return 'Kode kantor harus 3-20 karakter'
        return ''

      case 'complaintTypeCode':
        if (!value) return 'Jenis pengaduan wajib dipilih'
        return ''

      case 'complaintSourceCode':
        if (!value) return 'Sumber pengaduan wajib dipilih'
        return ''

      case 'shipmentTypeCode':
        if (!value) return 'Jenis kiriman wajib dipilih'
        return ''

      case 'shipmentNumber':
        if (!value || value.trim() === '') return 'Nomor resi wajib diisi'
        if (value.length > 30) return 'Nomor resi terlalu panjang (maksimal 30 karakter)'
        return ''

      case 'summary':
        if (!value || value.trim() === '') return 'Ringkasan pengaduan wajib diisi'
        if (value.length < 10) return 'Ringkasan terlalu pendek (minimal 10 karakter)'
        if (value.length > 200) return 'Ringkasan terlalu panjang (maksimal 200 karakter)'
        return ''

      case 'description':
        if (!value || value.trim() === '') return 'Uraian pengaduan wajib diisi'
        if (value.length < 20) return 'Uraian terlalu pendek (minimal 20 karakter)'
        if (value.length > 2000) return 'Uraian terlalu panjang (maksimal 2000 karakter)'
        return ''

      case 'shipmentOriginOffice':
        if (!value || value.trim() === '') return 'Kantor asal kiriman wajib diisi'
        if (value.length < 3 || value.length > 20) return 'Kode kantor harus 3-20 karakter'
        return ''

      case 'shipmentTargetOffice':
        if (!value || value.trim() === '') return 'Kantor tujuan kiriman wajib diisi'
        if (value.length < 3 || value.length > 20) return 'Kode kantor harus 3-20 karakter'
        return ''

      default:
        return ''
    }
  }, [])

  const validateStep = useCallback(
    (step) => {
      let stepErrors = {}
      let fieldsToValidate

      switch (step) {
        case 1: // Customer Info
          fieldsToValidate = [
            'customerName',
            'customerPhone',
            'customerEmail',
            'customerAddress',
            'originOffice',
            'targetOffice',
          ]
          break
        case 2: // Complaint Details
          fieldsToValidate = [
            'complaintTypeCode',
            'complaintSourceCode',
            'shipmentTypeCode',
            'shipmentNumber',
            'summary',
            'description',
            'shipmentOriginOffice',
            'shipmentTargetOffice',
          ]
          break
        default:
          return {}
      }

      fieldsToValidate.forEach((field) => {
        const error = validateField(field, formData[field])
        if (error) {
          stepErrors[field] = error
        }
      })

      setErrors(stepErrors)
      return stepErrors
    },
    [formData, validateField],
  )

  const isStepValid = useCallback(
    (step) => {
      const stepErrors = validateStep(step)
      return Object.keys(stepErrors).length === 0
    },
    [validateStep],
  )

  const resetForm = useCallback(() => {
    setFormData({
      customerId: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      originOffice: '',
      targetOffice: '',
      ccOffice: '',
      complaintTypeCode: '',
      complaintSourceCode: '',
      shipmentTypeCode: '',
      shipmentNumber: '',
      summary: '',
      description: '',
      shipmentOriginOffice: '',
      shipmentTargetOffice: '',
    })
    setErrors({})
    setTouched({})
  }, [])

  return {
    formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateStep,
    isStepValid,
    resetForm,
    setFormData,
  }
}
