import { complaintApi } from '../api/complaintApi.js'
import { ComplaintListScreen } from '../components/ComplaintListScreen.jsx'

export function OpenComplaintsPage() {
  return (
    <ComplaintListScreen
      eyebrow="Call Center Workspace"
      title="Tiket terbuka"
      subtitle="Tiket aktif yang terlihat oleh kantor Anda berdasarkan routing kantor asal/tujuan."
      variant="open"
      emptyTitle="Tidak ada tiket terbuka"
      loadPage={(token, params) => complaintApi.listOpen(token, params)}
    />
  )
}

export function CompletedComplaintsPage() {
  return (
    <ComplaintListScreen
      eyebrow="Call Center Workspace"
      title="Tiket selesai"
      subtitle="Riwayat tiket berstatus 109 (SELESAI) yang terlihat oleh kantor Anda."
      variant="closed"
      emptyTitle="Belum ada tiket selesai"
      loadPage={(token, params) => complaintApi.listCompleted(token, params)}
    />
  )
}

export function ReceivedOpenComplaintsPage() {
  return (
    <ComplaintListScreen
      eyebrow="Call Center Workspace"
      title="Diterima terbuka"
      subtitle="Tiket terbuka yang diteruskan ke kantor Anda, berdasarkan token kantor tujuan."
      variant="open"
      emptyTitle="Tidak ada tiket diterima terbuka"
      loadPage={(token, params) => complaintApi.listReceivedOpen(token, params)}
    />
  )
}

export function SentOpenComplaintsPage() {
  return (
    <ComplaintListScreen
      eyebrow="Call Center Workspace"
      title="Dikirim terbuka"
      subtitle="Tiket terbuka yang berawal di kantor Anda dan masih diproses di tempat lain."
      variant="open"
      emptyTitle="Tidak ada tiket dikirim terbuka"
      loadPage={(token, params) => complaintApi.listSentOpen(token, params)}
    />
  )
}