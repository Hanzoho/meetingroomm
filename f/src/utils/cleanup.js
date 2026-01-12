// Performance Cleanup Script
// สคริปต์นี้จะลบ console.log ที่ไม่จำเป็นทั้งหมดเพื่อปรับปรุงประสิทธิภาพ

import { debugLog } from '@/utils/debug'

// ใช้ debugLog แทน console.log
// debugLog จะแสดงเฉพาะเมื่อ NEXT_PUBLIC_ENABLE_DEBUG=true
// การใช้งาน:
// debugLog.log('ข้อความ debug')
// debugLog.error('ข้อผิดพลาด')
// debugLog.warn('คำเตือน')

export const cleanupGuidelines = {
  '1. ใช้ debugLog แทน console.log': 'import { debugLog } from "@/utils/debug"',
  '2. ลบ console.log ใน production': 'ใช้ environment variable ควบคุม',
  '3. ลบ component ซ้ำซ้อน': 'ใช้ ProfileForm แทน ProfilePage',
  '4. ลดขนาดไฟล์': 'แยกไฟล์ใหญ่เป็นไฟล์เล็ก ๆ',
  '5. ใช้ useMemo/useCallback': 'เพื่อลด re-render ที่ไม่จำเป็น'
}

console.log('⚠️ Performance Cleanup Guidelines:', cleanupGuidelines)
