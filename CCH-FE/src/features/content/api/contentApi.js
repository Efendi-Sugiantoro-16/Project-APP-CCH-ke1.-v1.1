import { apiRequest } from '../../../shared/api/apiRequest.js'

/**
 * Content & Help API Client
 * Connects to CCH Backend (/api/v1/content/*)
 */
export const contentApi = {
  /**
   * Get About Us content from cch_languages
   * @param {string} language
   */
  async getAbout(language = 'id') {
    const res = await apiRequest(`/api/v1/content/about?lang=${encodeURIComponent(language)}`)
    return res.data
  },

  /**
   * Get Terms & Conditions content from cch_languages
   * @param {string} language
   */
  async getTerms(language = 'id') {
    const res = await apiRequest(`/api/v1/content/terms?lang=${encodeURIComponent(language)}`)
    return res.data
  },

  /**
   * Get contextual help guide for a specific page from cch_help
   * @param {string} page
   * @param {string} language
   */
  async getHelpContext(page = 'dashboard2', language = 'id') {
    const res = await apiRequest(
      `/api/v1/content/help?page=${encodeURIComponent(page)}&lang=${encodeURIComponent(language)}`
    )
    return res.data
  },

  /**
   * List all help topics from cch_help
   * @param {string} language
   */
  async getHelpTopics(language = 'id') {
    const res = await apiRequest(`/api/v1/content/help/topics?lang=${encodeURIComponent(language)}`)
    return res.data || []
  },
}

/**
 * Maps a URL route pathname to legacy cch_help Display_in_Page identifier
 * @param {string} pathname
 * @returns {string}
 */
export function mapRouteToHelpPage(pathname = '') {
  const p = pathname.toLowerCase()
  if (p.includes('/complaints/new') || p.includes('/complaint/new') || p.includes('/intake')) {
    return 'cchentrilist'
  }
  if (p.includes('/complaints')) {
    return 'cchentrilist'
  }
  if (p.includes('/followup') || p.includes('/follow-up')) {
    return 'cchfuallist'
  }
  if (p.includes('/rekap-terima') || p.includes('/reports/rekap-terima')) {
    return 'cchrekapterima'
  }
  if (p.includes('/rekap-kirim') || p.includes('/reports/rekap-kirim')) {
    return 'cchrekapkirim'
  }
  if (p.includes('/users') || p.includes('/admin/users')) {
    return 'cchkelolapenggunalist'
  }
  if (p.includes('/login')) {
    return 'login'
  }
  if (p.includes('/reset-password') || p.includes('/resetpassword')) {
    return 'resetpassword'
  }
  if (p.includes('/profile') || p.includes('/change-password')) {
    return 'changepassword'
  }
  return 'dashboard2'
}
