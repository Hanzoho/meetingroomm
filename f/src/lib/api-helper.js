// ===================================================================
// API Helper - ใช้ทั่วทั้งโปรเจค
// ===================================================================
// Helper function สำหรับสร้าง API URL ที่ถูกต้อง
// ใช้แทน process.env.NEXT_PUBLIC_API_URL ที่มีกระจายอยู่ทั่วโปรเจค
// ===================================================================

/**
 * สร้าง API URL โดยเรียกผ่าน Next.js API Proxy
 * @param {string} path - API path เช่น '/protected/reservations'
 * @returns {string} - Full API URL เช่น '/api/protected/reservations'
 */
export function getApiUrl(path) {
  // ลบ /api ออกถ้ามี (เพื่อไม่ให้ซ้ำ)
  const cleanPath = path.startsWith('/api') ? path.slice(4) : path
  // ลบ / ตัวแรกออกถ้ามี
  const finalPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
  
  return `/api${finalPath}`
}

/**
 * สร้าง URL สำหรับดึงรูปภาพ
 * @param {number} roomId - Room ID
 * @param {number} timestamp - Cache bust timestamp (optional)
 * @returns {string} - Image URL
 */
export function getRoomImageUrl(roomId, timestamp) {
  const base = `/api/rooms/image/${roomId}`
  return timestamp ? `${base}?t=${timestamp}` : base
}

/**
 * สร้าง URL สำหรับดึงรูปโปรไฟล์
 * @param {string} userId - User ID
 * @param {string} role - User role (user/officer/admin/executive)
 * @returns {string} - Profile image URL
 */
export function getProfileImageUrl(userId, role) {
  return `/api/upload/profile-image/${userId}?role=${role}`
}

// สำหรับ backward compatibility
export const API_BASE_URL = '/api'
export const getStaticFileUrl = (path) => {
  if (!path || typeof path !== 'string') return null
  if (path.startsWith('http')) return path
  return `/api${path}`
}
