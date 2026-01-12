// ===================================================================
// Booking Helpers - ฟังก์ชันช่วยเหลือสำหรับระบบจองห้องประชุม
// ===================================================================

// ✅ เวลาทำการใหม่ 08:00-22:00 (ตามที่อาจารย์กำหนด)
export const WORKING_HOURS = {
  START: 8,
  END: 21  // เปลี่ยนจาก 22 เป็น 21 เพื่อให้ slot สุดท้ายเป็น 21:00-22:00
}

// ✅ สร้าง time slots สำหรับการจอง (เฉพาะเต็มชั่วโมง ไม่มี 30 นาที)
export const generateTimeSlots = () => {
  const slots = []
  // เวลาเริ่มต้น 08:00 - 22:00 (เฉพาะเต็มชั่วโมง)
  for (let hour = WORKING_HOURS.START; hour <= WORKING_HOURS.END; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`)
  }
  return slots
}

// ✅ ตรวจสอบว่าเวลาอยู่ในช่วงทำการหรือไม่
export const isWithinWorkingHours = (timeString) => {
  const [hours] = timeString.split(':').map(Number)
  return hours >= WORKING_HOURS.START && hours <= WORKING_HOURS.END
}

// ✅ คำนวณระยะเวลาการจองในชั่วโมง (เฉพาะเต็มชั่วโมง)
export const calculateDuration = (startTime, endTime, timeSlots = generateTimeSlots()) => {
  const startIndex = timeSlots.indexOf(startTime)
  const endIndex = timeSlots.indexOf(endTime)
  
  if (startIndex === -1 || endIndex === -1) return 0
  
  return (endIndex - startIndex) // แต่ละ slot = 1 ชั่วโมง
}

// ✅ ตรวจสอบการทับซ้อนของเวลา
export const hasTimeOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1
}

// ✅ แปลงเวลาเป็น minutes ตั้งแต่เที่ยงคืน
export const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

// ✅ แปลง minutes กลับเป็นเวลา
export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

// ✅ ตรวจสอบว่าเป็นช่วงพักเที่ยงหรือไม่ (แต่อนุญาตให้จองได้)
export const isLunchTime = (timeString) => {
  const [hours] = timeString.split(':').map(Number)
  return hours >= 12 && hours < 13
}

// ✅ ฟอร์แมตวันที่สำหรับ API
export const formatDateForAPI = (date) => {
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

// ✅ ฟอร์แมตเวลาสำหรับ API (แก้ไข timezone issue)
export const formatTimeForAPI = (date, timeString) => {
  // สร้าง date object ในเวลาท้องถิ่น (ไทย) แล้วแปลงเป็น UTC
  const [hours, minutes] = timeString.split(':').map(Number)
  const localDateTime = new Date(date)
  localDateTime.setHours(hours, minutes, 0, 0)
  
  // ปรับ timezone offset เพื่อให้ได้ UTC ที่ถูกต้อง (ไทย = UTC+7)
  const utcDateTime = new Date(localDateTime.getTime() - (7 * 60 * 60 * 1000))
  return utcDateTime.toISOString()
}

// ✅ สร้างข้อมูลการจองสำหรับส่งไป API
export const createBookingData = (roomId, date, startTime, endTime, details) => {
  return {
    room_id: roomId,
    start_at: formatDateForAPI(date),
    end_at: formatDateForAPI(date),
    start_time: formatTimeForAPI(date, startTime),
    end_time: formatTimeForAPI(date, endTime),
    details_r: details.trim()
  }
}

// ✅ ตรวจสอบข้อมูลการจองก่อนส่ง
export const validateBookingData = (roomId, date, startTime, endTime, details) => {
  const errors = []
  
  if (!roomId) errors.push('กรุณาเลือกห้องประชุม')
  if (!date) errors.push('กรุณาเลือกวันที่')
  if (!startTime) errors.push('กรุณาเลือกเวลาเริ่มต้น')
  if (!endTime) errors.push('กรุณาเลือกเวลาสิ้นสุด')
  if (!details || !details.trim()) errors.push('กรุณากรอกรายละเอียดการจอง')
  
  // ตรวจสอบเวลา
  if (startTime && endTime) {
    if (!isWithinWorkingHours(startTime)) {
      errors.push(`เวลาเริ่มต้นต้องอยู่ในช่วง ${WORKING_HOURS.START}:00-${WORKING_HOURS.END}:00`)
    }
    if (!isWithinWorkingHours(endTime)) {
      errors.push(`เวลาสิ้นสุดต้องอยู่ในช่วง ${WORKING_HOURS.START}:00-${WORKING_HOURS.END}:00`)
    }
    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      errors.push('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด')
    }
    
    const duration = calculateDuration(startTime, endTime)
    if (duration < 1) {
      errors.push('ระยะเวลาการจองต้องไม่น้อยกว่า 1 ชั่วโมง')
    }
  }
  
  // ตรวจสอบวันที่
  if (date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) {
      errors.push('ไม่สามารถจองย้อนหลังได้')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// ✅ ฟังก์ชันสำหรับแสดงสถานะการจอง
export const getBookingStatusText = (status) => {
  const statusMap = {
    'pending': 'รออนุมัติ',
    'approved': 'อนุมัติแล้ว',
    'rejected': 'ปฏิเสธ',
    'cancelled': 'ยกเลิก'
  }
  return statusMap[status] || status
}

export const getBookingStatusColor = (status) => {
  const colorMap = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-800'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-800'
}