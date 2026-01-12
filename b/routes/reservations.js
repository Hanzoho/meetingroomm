// ===================================================================
// Reservation APIs - ระบบจองห้องประชุม
// ===================================================================
// ไฟล์นี้จัดการ:
// - User APIs: จอง, ดู, แก้ไข, ยกเลิกการจอง
// - Calendar APIs: ดูปฏิทินการจอง
// - Status tracking: pending -> approved/rejected
// 
// ตามเอกสาร 4.2 บุคลากร (User):
// 4.2.4 ดูปฏิทินการจองเพื่อดูวันที่ว่าง
// 4.2.5 เลือกวันและเวลาเพื่อจองห้องประชุม
// 4.2.6 ยกเลิกการจองของตนเอง
// ===================================================================

import { Elysia } from 'elysia'
import prisma from '../lib/prisma.js'
import { authMiddleware, isUser, isOfficer } from '../middleware/index.js'
import { 
  notifyOfficersNewReservation, 
  notifyUserReservationApproved, 
  notifyUserReservationRejected 
} from '../utils/emailService.js'

// ฟังก์ชันแปลงสถานะเป็นภาษาไทย
function translateStatus(status) {
  const statusMap = {
    'pending': 'รออนุมัติ',
    'approved': 'อนุมัติแล้ว', 
    'rejected': 'ปฏิเสธ',
    'cancelled': 'ยกเลิก'
  }
  return statusMap[status] || status
}

// ===================================================================
// Public Reservation APIs (ไม่ต้อง auth)
// ===================================================================
export const reservationRoutes = new Elysia({ prefix: '/reservations' })
  
  // ดูปฏิทินการจองเพื่อดูวันที่ว่าง (4.2.4) - Enhanced with detailed availability
  .get('/calendar/:roomId', async ({ params, query, set }) => {
    try {
      const { roomId } = params
      const { month, year, detailed = false } = query
      
      // ตรวจสอบห้องประชุมที่มีอยู่
      const room = await prisma.meeting_room.findUnique({
        where: { room_id: parseInt(roomId) }
      })
      
      if (!room) {
        set.status = 404
        return {
          success: false,
          message: 'ไม่พบห้องประชุมที่ต้องการ'
        }
      }
      
      // สร้าง date range สำหรับเดือนที่ต้องการ
      const startDate = month && year ? 
        new Date(parseInt(year), parseInt(month) - 1, 1) :
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
      
      // Debug: ตรวจสอบ date range สำหรับเดือนกันยายน
      if (parseInt(month) === 9 && parseInt(year) === 2025) {
        console.log('🔍 [BACKEND-CALENDAR] Calendar Date Range for Sep 2025:', {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalDaysInMonth: endDate.getDate(),
          dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        })
      }
      
      // ดึงการจองที่ approved และ pending ที่ทับซ้อนกับเดือนนั้น พร้อมข้อมูลผู้จอง
      // 🔥 แก้ไข: หาการจองที่ทับซ้อนกับช่วงเวลา ไม่ใช่แค่ที่อยู่ในช่วงเวลา
      const reservations = await prisma.reservation.findMany({
        where: {
          room_id: parseInt(roomId),
          status_r: { in: ['approved', 'pending'] },
          OR: [
            // การจองที่เริ่มในเดือนนี้
            {
              start_at: {
                gte: startDate,
                lte: endDate
              }
            },
            // การจองที่สิ้นสุดในเดือนนี้
            {
              end_at: {
                gte: startDate,
                lte: endDate
              }
            },
            // การจองที่ครอบคลุมเดือนนี้ (เริ่มก่อนหน้า สิ้นสุดหลังจาก)
            {
              start_at: { lte: startDate },
              end_at: { gte: endDate }
            }
          ]
        },
        select: {
          reservation_id: true,
          start_at: true,
          end_at: true,
          start_time: true,
          end_time: true,
          details_r: true,
          status_r: true,
          // ✅ ใช้ข้อมูล multi-day เพื่อแสดงผลให้ถูกต้อง (เฉพาะวันที่เลือกจริง)
          booking_dates: true,
          is_multi_day: true,
          users: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              department: true,
              position: true
            }
          }
        },
        orderBy: { start_at: 'asc' }
      })

      // 🔍 Debug: ตรวจสอบการจองที่ดึงมาได้
      console.log('🔍 [BACKEND-CALENDAR] Reservations found:', {
        month: parseInt(month),
        year: parseInt(year),
        roomId: parseInt(roomId),
        dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        reservationsCount: reservations.length,
        reservations: reservations.map(r => ({
          id: r.reservation_id,
          start_at: r.start_at.toISOString().split('T')[0],
          end_at: r.end_at.toISOString().split('T')[0],
          status: r.status_r,
          is_multi_day: r.is_multi_day,
          booking_dates: r.booking_dates
        }))
      })

      // ถ้าต้องการ detailed view แสดง availability slots
      if (detailed === 'true') {
        // สร้าง daily availability map
        const dailyAvailability = {}
        const workingHours = { 
          start: 8, end: 22,           // 8:00-22:00
          morningEnd: 12,              // ช่วงเช้าสิ้นสุด 12:00
          afternoonStart: 13,          // ช่วงบ่ายเริ่ม 13:00
          lunchBreak: { start: 12, end: 13 } // พักเที่ยง 12:00-13:00
        }
        
        // สร้าง template สำหรับแต่ละวันในเดือน
        const totalDaysInMonth = endDate.getDate()
        
        // Debug logging สำหรับทุกเดือน
        console.log('🔍 [BACKEND-CALENDAR] Creating daily slots:', {
          month: parseInt(month),
          year: parseInt(year),
          totalDaysInMonth,
          willCreateDays: `1 to ${totalDaysInMonth}`
        })
        
        for (let day = 1; day <= totalDaysInMonth; day++) {
          const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), day)
          // แก้ไข timezone issue: ใช้ local date แทน UTC
          const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
          
          // Debug เฉพาะวันที่ 30
          if (day === 30) {
            console.log('🔍 [BACKEND-CALENDAR] Creating day 30 data:', {
              day,
              currentDate: currentDate.toString(),
              dateKey,
              dayOfMonth: currentDate.getDate(),
              month: currentDate.getMonth() + 1,
              year: currentDate.getFullYear()
            })
          }
          
        // สร้าง hourly slots (8:00-22:00) - เวลาทำการใหม่
        const slots = []
        for (let hour = 8; hour < 22; hour++) {
          slots.push({
            time: `${hour.toString().padStart(2, '0')}:00`,
            start_time: `${hour.toString().padStart(2, '0')}:00:00`,
            end_time: `${(hour + 1).toString().padStart(2, '0')}:00:00`,
            available: true,
            reservations: []
          })
        }          dailyAvailability[dateKey] = {
            date: dateKey,
            day_of_week: currentDate.getDay(),
            slots: slots,
            total_reservations: 0
          }
        }
        
        // helper: แปลง Date เป็น key แบบ Local (YYYY-MM-DD) ให้ตรงกับตอนสร้าง dailyAvailability
        const toLocalDateKey = (d) => {
          const dt = new Date(d)
          return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
        }

        // อัพเดต availability จากการจองที่มีอยู่ (รองรับ multi-day non-consecutive)
        reservations.forEach(reservation => {
          const startDate = new Date(reservation.start_at)
          const endDate = new Date(reservation.end_at)
          const startTime = new Date(reservation.start_time)
          const endTime = new Date(reservation.end_time)

          // สร้างรายการวันที่ที่ต้องทำเครื่องหมาย
          let dateKeys = []
          if (reservation.is_multi_day && reservation.booking_dates) {
            // ใช้เฉพาะวันที่ผู้ใช้เลือกจริง (เช่น 1,3,6,9 หรือ 1,8,15,22,29)
            dateKeys = reservation.booking_dates
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
              .map(ds => toLocalDateKey(new Date(ds)))
          } else {
            // เดิม: ครอบคลุมทุกวันตั้งแต่ start ถึง end (สำหรับ single-day หรือช่วงต่อเนื่อง)
            const currentDate = new Date(startDate)
            while (currentDate <= endDate) {
              dateKeys.push(toLocalDateKey(currentDate))
              currentDate.setDate(currentDate.getDate() + 1)
            }
          }

          // ทำเครื่องหมายแต่ละวันตาม dateKeys
          dateKeys.forEach(dateKey => {
            if (!dailyAvailability[dateKey]) return

            dailyAvailability[dateKey].total_reservations++

            const startHour = startTime.getHours()
            const endHour = endTime.getHours()

            dailyAvailability[dateKey].slots.forEach(slot => {
              const slotHour = parseInt(slot.time.split(':')[0])
              if (slotHour >= startHour && slotHour < endHour) {
                slot.available = false
                slot.reservations.push({
                  reservation_id: reservation.reservation_id,
                  status: reservation.status_r,
                  details: reservation.details_r,
                  time_range: `${startTime.toTimeString().slice(0,5)}-${endTime.toTimeString().slice(0,5)}`,
                  reserved_by: reservation.users ? `${reservation.users.first_name} ${reservation.users.last_name}` : 'Unknown',
                  user_department: reservation.users?.department || '',
                  user_position: reservation.users?.position || ''
                })
              }
            })
          })
        })
        
        // Debug: ตรวจสอบข้อมูลที่ส่งออกสำหรับทุกเดือน
        const dailyAvailabilityArray = Object.values(dailyAvailability)
        console.log('🔍 [BACKEND-CALENDAR] Final daily availability data:', {
          month: parseInt(month),
          year: parseInt(year),
          totalDaysCreated: dailyAvailabilityArray.length,
          datesCreated: dailyAvailabilityArray.map(day => day.date).slice(0, 5),
          lastDate: dailyAvailabilityArray[dailyAvailabilityArray.length - 1]?.date,
          hasLastDayOfMonth: dailyAvailabilityArray.some(day => 
            new Date(day.date).getDate() === totalDaysInMonth
          )
        })
        
        return {
          success: true,
          message: `ปฏิทินการจองห้อง ${room.room_name} (รายละเอียด)`,
          room: {
            room_id: room.room_id,
            room_name: room.room_name,
            department: room.department
          },
          calendar: {
            month: startDate.getMonth() + 1,
            year: startDate.getFullYear(),
            working_hours: workingHours,
            daily_availability: dailyAvailabilityArray
          }
        }
      }
      
      // Basic calendar view
      return {
        success: true,
        message: `ปฏิทินการจองห้อง ${room.room_name}`,
        room: {
          room_id: room.room_id,
          room_name: room.room_name,
          department: room.department
        },
        calendar: {
          month: startDate.getMonth() + 1,
          year: startDate.getFullYear(),
          reservations: reservations
        }
      }
      
    } catch (error) {
      console.error('❌ Error fetching calendar:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงปฏิทิน'
      }
    }
  })

  // ===== User Report Room Problem =====
  // API สำหรับผู้ใช้รายงานปัญหาห้องประชุม
  .post('/report-problem', async ({ request, body, set }) => {
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    try {
      const { room_id, comment } = body

      // ตรวจสอบว่าข้อมูลครบถ้วน
      if (!room_id || !comment) {
        set.status = 400
        return {
          success: false,
          message: 'กรุณาระบุห้องประชุมและรายละเอียดปัญหา'
        }
      }

      // ตรวจสอบว่าห้องประชุมมีจริง
      const room = await prisma.meeting_room.findUnique({
        where: { room_id: parseInt(room_id) }
      })

      if (!room) {
        set.status = 404
        return {
          success: false,
          message: 'ไม่พบห้องประชุมที่ระบุ'
        }
      }

      // บันทึกรายงานปัญหาลงตาราง review
      const report = await prisma.review.create({
        data: {
          user_id: user.user_id,
          room_id: parseInt(room_id),
          comment: comment.toString().trim(),
          rating: null, // ไม่มีการให้คะแนน สำหรับรายงานปัญหา
          created_at: new Date()
        },
        include: {
          users: {
            select: {
              user_id: true,
              first_name: true,  // แก้จาก firstname
              last_name: true,   // แก้จาก lastname
              email: true,
              position: true,       // แก้จาก position_department
              department: true      // เพิ่ม department
            }
          },
          meeting_room: {
            select: {
              room_id: true,
              room_name: true,
              department: true
            }
          }
        }
      })

      console.log(`✅ บันทึกรายงานปัญหาห้อง ${room.room_name} โดย ${user.first_name} ${user.last_name}`)  // แก้ชื่อ field

      return {
        success: true,
        message: 'ส่งรายงานปัญหาเรียบร้อยแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบ',
        report: {
          review_id: report.review_id,
          room_name: report.meeting_room ? report.meeting_room.room_name : '⚠️ ห้องนี้ไม่มีในระบบแล้ว',
          comment: report.comment,
          created_at: report.created_at,
          reporter: {
            name: `${report.users.first_name} ${report.users.last_name}`,  // แก้ชื่อ field
            email: report.users.email,
            position: report.users.position,       // เพิ่มตำแหน่ง
            department: report.users.department    // แก้จาก position_department
          }
        }
      }

    } catch (error) {
      console.error('❌ Report Problem Error:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการส่งรายงานปัญหา',
        error: error.message
      }
    }
  })

// ===================================================================
// Protected User Reservation APIs (ต้อง auth)
// ===================================================================
export const userReservationRoutes = new Elysia({ prefix: '/protected/reservations' })
  
  // ดูการจองของตัวเอง
  .get('/my', async ({ request, set }) => {
    try {
      // เรียกใช้ auth middleware
      const user = await authMiddleware(request, set)
      
      // ถ้า middleware return error response
      if (user.success === false) {
        return user
      }
      
      // ดึงการจองของผู้ใช้นี้เท่านั้น
      const reservations = await prisma.reservation.findMany({
        where: {
          user_id: user.user_id
        },
        include: {
          meeting_room: {
            select: {
              room_name: true,
              location_m: true,
              capacity: true,
              department: true
            }
          },
          users: {
            select: {
              first_name: true,
              last_name: true,
              department: true
            }
          },
          officer: {
            select: {
              first_name: true,
              last_name: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      })

      // จัดรูปแบบข้อมูล
      const formattedReservations = reservations.map(reservation => {
        // ตรวจสอบว่าห้องถูกลบไปแล้วหรือไม่
        const isRoomDeleted = !reservation.meeting_room
        
        return {
        reservation_id: reservation.reservation_id,
        room_name: isRoomDeleted ? '⚠️ ห้องนี้ไม่มีในระบบแล้ว' : reservation.meeting_room.room_name,
        location: isRoomDeleted ? null : reservation.meeting_room.location_m,
        capacity: isRoomDeleted ? null : reservation.meeting_room.capacity,
        department: isRoomDeleted ? null : reservation.meeting_room.department,
        user_department: reservation.users.department, // เพิ่มไว้สำหรับอ้างอิงถ้าจำเป็น
        start_date: reservation.start_at,
        end_date: reservation.end_at,
        start_time: reservation.start_time,
        end_time: reservation.end_time,
        status: translateStatus(reservation.status_r),
        details: reservation.details_r,
        approved_by: reservation.officer ? `${reservation.officer.first_name} ${reservation.officer.last_name}` : null,
        rejected_reason: reservation.rejected_reason,
        created_at: reservation.created_at,
        updated_at: reservation.updated_at,
        // ✅ เพิ่ม booking_dates และแปลงจาก CSV เป็น array
        booking_dates: reservation.booking_dates ? reservation.booking_dates.split(',').map(d => d.trim()) : null,
        is_multi_day: reservation.is_multi_day
        }
      })

      // Debug: ตรวจสอบข้อมูลที่ส่งกลับ
      console.log('🔍 [USER-API-DEBUG] Sample reservation data:')
      if (formattedReservations.length > 0) {
        console.log('🔍 booking_dates:', formattedReservations[0].booking_dates)
        console.log('🔍 is_multi_day:', formattedReservations[0].is_multi_day)
      }

      return {
        success: true,
        message: 'ข้อมูลการจองของคุณ',
        data: formattedReservations,
        total: formattedReservations.length
      }
      
    } catch (error) {
      console.error('❌ Error getting user reservations:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการจอง',
        error: error.message
      }
    }
  })
  
  // จองห้องประชุม (4.2.5)
  .post('/', async ({ request, body, set }) => {
    // ตรวจสอบสิทธิ์ user
    const user = await authMiddleware(request, set)
    if (user.success === false) return user
    
    if (!isUser(user)) {
      set.status = 403
      return {
        success: false,
        message: 'ไม่มีสิทธิ์ในการจองห้องประชุม'
      }
    }

    try {
      // ตรวจสอบข้อมูลที่จำเป็น
      const { room_id, start_at, end_at, start_time, end_time, details_r, booking_dates, is_multi_day } = body

      if (!room_id || !start_at || !end_at || !start_time || !end_time || !details_r) {
        set.status = 400
        return {
          success: false,
          message: 'กรุณากรอกข้อมูลให้ครบถ้วน: ห้อง, วันที่, เวลา, รายละเอียด'
        }
      }

      // ตรวจสอบห้องประชุมที่มีอยู่และสถานะ
      const room = await prisma.meeting_room.findUnique({
        where: { room_id: parseInt(room_id) }
      })

      if (!room) {
        set.status = 404
        return {
          success: false,
          message: 'ไม่พบห้องประชุมที่ต้องการ'
        }
      }

      // ตรวจสอบสถานะห้อง
      if (room.status_m !== 'available') {
        set.status = 400
        return {
          success: false,
          message: 'ห้องประชุมนี้ไม่พร้อมใช้งานในขณะนี้'
        }
      }

      // แปลงวันที่และเวลา
      const startDate = new Date(start_at)
      let endDate = new Date(end_at)
      const startTime = new Date(start_time)
      const endTime = new Date(end_time)

      console.log(`🔍 Multi-day booking check:`, {
        is_multi_day,
        booking_dates: booking_dates?.length || 'N/A',
        start_at, 
        end_at,
        dates: booking_dates
      })

      // 🚀 Multi-day booking logic
      if (is_multi_day && booking_dates && booking_dates.length > 1) {
        console.log(`📅 Processing multi-day booking: ${booking_dates.length} days`)

        // ตรวจสอบ conflict สำหรับทุกวัน
        for (const dateStr of booking_dates) {
          const checkDate = new Date(dateStr)
          
          console.log(`🔍 Checking conflict for date: ${dateStr}`)
          
          const conflictReservations = await prisma.reservation.findMany({
            where: {
              room_id: parseInt(room_id),
              status_r: {
                in: ['pending', 'approved']
              },
              start_at: checkDate,
              end_at: checkDate
            }
          })

          // ตรวจสอบเวลาทับซ้อน
          const hasTimeConflict = conflictReservations.some(existing => {
            const existingStartTime = new Date(existing.start_time)
            const existingEndTime = new Date(existing.end_time)
            
            const newStartMinutes = startTime.getHours() * 60 + startTime.getMinutes()
            const newEndMinutes = endTime.getHours() * 60 + endTime.getMinutes()
            const existingStartMinutes = existingStartTime.getHours() * 60 + existingStartTime.getMinutes()
            const existingEndMinutes = existingEndTime.getHours() * 60 + existingEndTime.getMinutes()

            return (newStartMinutes < existingEndMinutes) && (existingStartMinutes < newEndMinutes)
          })

          if (hasTimeConflict) {
            set.status = 409
            return {
              success: false,
              message: `วันที่ ${new Date(dateStr).toLocaleDateString('th-TH')} มีการจองซ้อนทับ กรุณาเลือกเวลาอื่น`,
              conflict_date: dateStr
            }
          }
        }

        // สร้างการจองเดียวสำหรับ multi-day
        const newReservation = await prisma.reservation.create({
          data: {
            user_id: user.user_id,
            room_id: parseInt(room_id),
            start_at: startDate,      // วันแรก
            end_at: endDate,          // วันสุดท้าย
            start_time: startTime,    // เวลาเริ่ม
            end_time: endTime,        // เวลาสิ้นสุด
            details_r: details_r.trim(),
            status_r: 'pending',
            // เพิ่ม metadata สำหรับ multi-day
            booking_dates: booking_dates.join(','), // เก็บเป็น CSV string
            is_multi_day: true
          },
          include: {
            meeting_room: {
              select: {
                room_name: true,
                department: true
              }
            }
          }
        })

        console.log(`✅ สร้าง multi-day reservation: ${user.first_name} จอง ${room.room_name} (${booking_dates.length} วัน)`)

        // 📧 ส่งอีเมลแจ้งเตือนไปยังเจ้าหน้าที่
        try {
          const emailResult = await notifyOfficersNewReservation(newReservation.reservation_id)
          if (emailResult.success) {
            console.log(`📧 ส่งอีเมลแจ้งเตือนสำเร็จ ไปยัง ${emailResult.sentTo} เจ้าหน้าที่`)
          } else {
            console.log(`⚠️ ไม่สามารถส่งอีเมลแจ้งเตือนได้: ${emailResult.reason || emailResult.error}`)
          }
        } catch (emailError) {
          console.error('❌ Error sending email notification:', emailError)
          // ไม่ให้ Email error ทำให้การจองล้มเหลว
        }

        return {
          success: true,
          message: `จองห้องประชุมสำเร็จ ${booking_dates.length} วัน รอการอนุมัติจากเจ้าหน้าที่`,
          reservation: {
            reservation_id: newReservation.reservation_id,
            room_name: newReservation.meeting_room.room_name,
            department: newReservation.meeting_room.department,
            start_at: newReservation.start_at,
            end_at: newReservation.end_at,
            start_time: newReservation.start_time,
            end_time: newReservation.end_time,
            details: newReservation.details_r,
            status: newReservation.status_r,
            booking_dates: booking_dates,
            is_multi_day: true,
            total_days: booking_dates.length,
            created_at: newReservation.created_at
          }
        }
      }

      // 🔄 Single day booking logic (existing code)
      console.log(`🔍 Single day booking: ${start_at}`)
      
      // สำหรับการจองในวันเดียวกัน ตั้งค่า end_at ให้เป็นวันเดียวกัน แต่เวลา 22:00:00
      if (startDate.toDateString() === endDate.toDateString()) {
        // สร้าง endDate ใหม่โดยใช้วันที่เดียวกันกับ startDate แต่เป็นเวลา 22:00
        endDate = new Date(startDate)
        endDate.setHours(22, 0, 0, 0) // ตั้งเป็น 22:00:00
        console.log(`🔧 Fixed endDate for same day to 22:00: ${endDate.toISOString()}`)
      }

      // ตรวจสอบ logic วันที่และเวลา
      if (startDate > endDate) {
        set.status = 400
        return {
          success: false,
          message: 'วันเริ่มต้องไม่เกินวันสิ้นสุด'
        }
      }

      if (startTime >= endTime) {
        set.status = 400
        return {
          success: false,
          message: 'เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด'
        }
      }

      // ✅ ตรวจสอบช่วงเวลาทำการใหม่ 08:00-22:00 (รวมช่วงพักเที่ยง 12:00-13:00)
      const startHour = startTime.getHours()
      const endHour = endTime.getHours()
      const startMinutes = startTime.getMinutes()
      const endMinutes = endTime.getMinutes()
      
      // ตรวจสอบเวลาทำการ 08:00-22:00
      if (startHour < 8 || startHour > 22 || endHour < 8 || endHour > 22) {
        set.status = 400
        return {
          success: false,
          message: 'เวลาทำการ: 08:00-22:00 เท่านั้น'
        }
      }

      // ตรวจสอบว่าเวลาสิ้นสุดไม่เกิน 22:00
      if (endHour > 22 || (endHour === 22 && endMinutes > 0)) {
        set.status = 400
        return {
          success: false,
          message: 'เวลาสิ้นสุดต้องไม่เกิน 22:00 น.'
        }
      }

      // ✅ อนุญาตให้จองช่วง 12:00-13:00 ได้ (ตามที่อาจารย์บอก)

      // ตรวจสอบการจองที่ซ้อนทับ (Simplified Logic)
      console.log(`🔍 ตรวจสอบ conflict: room ${room_id}, วันที่ ${start_at} เวลา ${start_time}-${end_time}`)
      
      const conflictReservations = await prisma.reservation.findMany({
        where: {
          room_id: parseInt(room_id),
          status_r: {
            in: ['pending', 'approved'] // ไม่นับ rejected
          },
          // สำหรับการจองในวันเดียวกัน (single day booking)
          start_at: startDate, // ใช้ DateTime object แทน string
          end_at: endDate     // ใช้ DateTime object แทน string
        }
      })

      console.log(`📊 พบการจองในวันเดียวกัน: ${conflictReservations.length} รายการ`)
      
      // ตรวจสอบเวลาทับซ้อน
      const hasTimeConflict = conflictReservations.some(existing => {
        const existingStartTime = new Date(existing.start_time)
        const existingEndTime = new Date(existing.end_time)
        
        // แปลงเป็น minutes สำหรับการเปรียบเทียบ
        const newStartMinutes = startTime.getHours() * 60 + startTime.getMinutes()
        const newEndMinutes = endTime.getHours() * 60 + endTime.getMinutes()
        const existingStartMinutes = existingStartTime.getHours() * 60 + existingStartTime.getMinutes()
        const existingEndMinutes = existingEndTime.getHours() * 60 + existingEndTime.getMinutes()

        // Time overlap: (start1 < end2) AND (start2 < end1)
        const overlap = (newStartMinutes < existingEndMinutes) && (existingStartMinutes < newEndMinutes)
        
        if (overlap) {
          console.log(`⚠️  Time conflict detected:`)
          console.log(`   Existing ID ${existing.reservation_id}: ${existingStartTime.toTimeString().slice(0,5)}-${existingEndTime.toTimeString().slice(0,5)}`)
          console.log(`   New request: ${startTime.toTimeString().slice(0,5)}-${endTime.toTimeString().slice(0,5)}`)
        }
        
        return overlap
      })

      if (hasTimeConflict) {
        set.status = 409
        return {
          success: false,
          message: 'ช่วงเวลาที่เลือกมีการจองอยู่แล้ว กรุณาเลือกเวลาอื่น (รวมถึงการจองที่รออนุมัติ)',
          conflicts: conflictReservations.map(r => ({
            reservation_id: r.reservation_id,
            start_at: r.start_at,
            end_at: r.end_at,
            start_time: r.start_time,
            end_time: r.end_time,
            status: r.status_r,
            details: r.details_r
          }))
        }
      }

      // สร้างการจองใหม่ (single day)
      const newReservation = await prisma.reservation.create({
        data: {
          user_id: user.user_id,
          room_id: parseInt(room_id),
          start_at: startDate,
          end_at: endDate,
          start_time: startTime,
          end_time: endTime,
          details_r: details_r.trim(),
          status_r: 'pending', // รอการอนุมัติ
          is_multi_day: false  // single day booking
        },
        include: {
          meeting_room: {
            select: {
              room_name: true,
              department: true
            }
          }
        }
      })

      console.log(`✅ สร้างการจองใหม่: ${user.first_name} จอง ${room.room_name}`)

      // 📧 ส่งอีเมลแจ้งเตือนไปยังเจ้าหน้าที่
      try {
        const emailResult = await notifyOfficersNewReservation(newReservation.reservation_id)
        if (emailResult.success) {
          console.log(`📧 ส่งอีเมลแจ้งเตือนสำเร็จ ไปยัง ${emailResult.sentTo} เจ้าหน้าที่`)
        } else {
          console.log(`⚠️ ไม่สามารถส่งอีเมลแจ้งเตือนได้: ${emailResult.reason || emailResult.error}`)
        }
      } catch (emailError) {
        console.error('❌ Error sending email notification:', emailError)
        // ไม่ให้ Email error ทำให้การจองล้มเหลว
      }

      return {
        success: true,
        message: 'จองห้องประชุมสำเร็จ รอการอนุมัติจากเจ้าหน้าที่',
        reservation: {
          reservation_id: newReservation.reservation_id,
          room_name: newReservation.meeting_room.room_name,
          department: newReservation.meeting_room.department,
          start_at: newReservation.start_at,
          end_at: newReservation.end_at,
          start_time: newReservation.start_time,
          end_time: newReservation.end_time,
          details: newReservation.details_r,
          status: newReservation.status_r,
          created_at: newReservation.created_at
        }
      }

    } catch (error) {
      console.error('❌ Error creating reservation:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการจองห้องประชุม'
      }
    }
  })

  // ดูการจองของตัวเอง
  .get('/', async ({ request, query, set }) => {
    // ตรวจสอบสิทธิ์ user
    const user = await authMiddleware(request, set)
    if (user.success === false) return user
    
    if (!isUser(user)) {
      set.status = 403
      return {
        success: false,
        message: 'ไม่มีสิทธิ์ในการดูการจอง'
      }
    }

    try {
      const { status, limit = 10, offset = 0 } = query
      
      // สร้าง filter conditions
      const where = {
        user_id: user.user_id
      }
      
      if (status) {
        where.status_r = status
      }

      // ดึงการจองทั้งหมดของ user
      const reservations = await prisma.reservation.findMany({
        where,
        include: {
          meeting_room: {
            select: {
              room_name: true,
              department: true,
              location_m: true
            }
          },
          officer: {
            select: {
              first_name: true,
              last_name: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      })

      // นับจำนวนทั้งหมด
      const total = await prisma.reservation.count({ where })

      return {
        success: true,
        message: `การจองของ ${user.first_name} ${user.last_name}`,
        reservations: reservations.map(r => {
          const isRoomDeleted = !r.meeting_room
          return {
          reservation_id: r.reservation_id,
          room_name: isRoomDeleted ? '⚠️ ห้องนี้ไม่มีในระบบแล้ว' : r.meeting_room.room_name,
          department: isRoomDeleted ? null : r.meeting_room.department,
          location: isRoomDeleted ? null : r.meeting_room.location_m,
          start_at: r.start_at,
          end_at: r.end_at,
          start_time: r.start_time,
          end_time: r.end_time,
          details: r.details_r,
          status: translateStatus(r.status_r),
          approved_by: r.officer ? `${r.officer.first_name} ${r.officer.last_name}` : null,
          created_at: r.created_at,
          updated_at: r.updated_at
          }
        }),
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: total > (parseInt(offset) + parseInt(limit))
        }
      }

    } catch (error) {
      console.error('❌ Error fetching user reservations:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการจอง'
      }
    }
  })

  // ดูรายละเอียดการจองเฉพาะ
  .get('/:id', async ({ request, params, set }) => {
    // ตรวจสอบสิทธิ์ user
    const user = await authMiddleware(request, set)
    if (user.success === false) return user
    
    if (!isUser(user)) {
      set.status = 403
      return {
        success: false,
        message: 'ไม่มีสิทธิ์ในการดูการจอง'
      }
    }

    try {
      const { id } = params

      const reservation = await prisma.reservation.findUnique({
        where: { 
          reservation_id: parseInt(id)
        },
        include: {
          meeting_room: {
            select: {
              room_name: true,
              department: true,
              location_m: true,
              capacity: true
            }
          },
          officer: {
            select: {
              first_name: true,
              last_name: true,
              department: true
            }
          }
        }
      })

      if (!reservation) {
        set.status = 404
        return {
          success: false,
          message: 'ไม่พบการจองที่ต้องการ'
        }
      }

      // ตรวจสอบว่าเป็นการจองของ user นี้หรือไม่
      if (reservation.user_id !== user.user_id) {
        set.status = 403
        return {
          success: false,
          message: 'ไม่มีสิทธิ์ดูการจองของผู้อื่น'
        }
      }

      return {
        success: true,
        message: 'รายละเอียดการจอง',
        reservation: {
          reservation_id: reservation.reservation_id,
          room: {
            room_name: reservation.meeting_room?.room_name,
            department: reservation.meeting_room?.department,
            location: reservation.meeting_room?.location_m,
            capacity: reservation.meeting_room?.capacity
          },
          booking_details: {
            start_at: reservation.start_at,
            end_at: reservation.end_at,
            start_time: reservation.start_time,
            end_time: reservation.end_time,
            details: reservation.details_r,
            status: translateStatus(reservation.status_r),
            booking_dates: reservation.booking_dates, // เพิ่มข้อมูลวันที่ที่เลือกไว้
            is_multi_day: reservation.is_multi_day    // เพิ่มข้อมูลว่าเป็น multi-day หรือไม่
          },
          approval: {
            approved_by: reservation.officer ? 
              `${reservation.officer.first_name} ${reservation.officer.last_name}` : null,
            officer_department: reservation.officer?.department,
            rejected_reason: reservation.rejected_reason || null
          },
          timestamps: {
            created_at: reservation.created_at,
            updated_at: reservation.updated_at
          }
        }
      }

    } catch (error) {
      console.error('❌ Error fetching reservation details:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงรายละเอียดการจอง'
      }
    }
  })

  // แก้ไขการจอง (ก่อนอนุมัติเท่านั้น)
  .put('/:id', async ({ request, params, body, set }) => {
    // ตรวจสอบสิทธิ์ user
    const user = await authMiddleware(request, set)
    if (user.success === false) return user
    
    if (!isUser(user)) {
      set.status = 403
      return {
        success: false,
        message: 'ไม่มีสิทธิ์ในการแก้ไขการจอง'
      }
    }

    try {
      const { id } = params
      const { start_at, end_at, start_time, end_time, details_r, booking_dates } = body
      
      console.log('🔍 [UPDATE-RESERVATION] Received data:', {
        id, start_at, end_at, start_time, end_time, 
        details_r: details_r?.slice(0, 50),
        booking_dates: booking_dates || 'not provided'
      })

      // ตรวจสอบการจองที่มีอยู่
      const existingReservation = await prisma.reservation.findUnique({
        where: { reservation_id: parseInt(id) },
        include: {
          meeting_room: {
            select: {
              room_name: true
            }
          }
        }
      })

      if (!existingReservation) {
        set.status = 404
        return {
          success: false,
          message: 'ไม่พบการจองที่ต้องการ'
        }
      }

      // ตรวจสอบสิทธิ์เจ้าของ
      if (existingReservation.user_id !== user.user_id) {
        set.status = 403
        return {
          success: false,
          message: 'ไม่สามารถแก้ไขการจองของผู้อื่นได้'
        }
      }

      // ตรวจสอบสถานะ - แก้ไขได้เฉพาะ pending
      if (existingReservation.status_r !== 'pending') {
        set.status = 400
        return {
          success: false,
          message: `ไม่สามารถแก้ไขการจองที่มีสถานะ "${translateStatus(existingReservation.status_r)}" ได้`,
          current_status: translateStatus(existingReservation.status_r)
        }
      }

      // ตรวจสอบข้อมูลใหม่
      if (!start_at || !end_at || !start_time || !end_time || !details_r) {
        set.status = 400
        return {
          success: false,
          message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
        }
      }

      // แปลงวันที่และเวลา
      const startDate = new Date(start_at)
      const endDate = new Date(end_at)
      const startTime = new Date(start_time)
      const endTime = new Date(end_time)

      // ตรวจสอบ logic วันที่และเวลา
      if (startDate > endDate) {
        set.status = 400
        return {
          success: false,
          message: 'วันเริ่มต้องไม่เกินวันสิ้นสุด'
        }
      }

      if (startTime >= endTime) {
        set.status = 400
        return {
          success: false,
          message: 'เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด'
        }
      }

      // ตรวจสอบการจองที่ซ้อนทับ (ยกเว้นการจองปัจจุบัน)
      // ดึงเฉพาะการจองที่อนุมัติแล้วเท่านั้น เพราะการจองที่รออนุมัติสามารถแก้ไขได้
      console.log('🔍 [CONFLICT-DEBUG] Checking conflicts for:', {
        currentReservationId: parseInt(id),
        roomId: existingReservation.room_id,
        newTimeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
        note: 'Checking both PENDING and APPROVED reservations (excluding current reservation)'
      })
      
      const allReservationsInRoom = await prisma.reservation.findMany({
        where: {
          room_id: existingReservation.room_id,
          reservation_id: {
            not: parseInt(id) // ยกเว้นการจองปัจจุบัน
          },
          status_r: {
            in: ['pending', 'approved'] // เช็คทั้งการจองที่รออนุมัติและอนุมัติแล้ว
          }
        }
      })
      
      console.log('🔍 [CONFLICT-DEBUG] Found other reservations:', allReservationsInRoom.map(r => ({
        id: r.reservation_id,
        dates: `${r.start_at} - ${r.end_at}`,
        times: `${r.start_time} - ${r.end_time}`,
        status: r.status_r
      })))

      // สร้างรายการวันที่ที่ผู้ใช้ต้องการจอง
      const newBookingDates = []
      if (booking_dates && booking_dates.trim()) {
        // ใช้ booking_dates ที่ส่งมาจาก frontend
        const dateArray = booking_dates.trim().split(',').map(d => d.trim()).filter(Boolean)
        newBookingDates.push(...dateArray)
      } else {
        // สร้างจาก start_at ถึง end_at
        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          newBookingDates.push(currentDate.toISOString().split('T')[0])
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }

      console.log('🔍 [CONFLICT-CHECK] New booking dates to check:', newBookingDates)

      // ตรวจสอบ conflict ทั้งวันที่และเวลา
      const conflictReservations = allReservationsInRoom.filter(reservation => {
        // สร้างรายการวันที่ของการจองที่มีอยู่
        const existingBookingDates = []
        if (reservation.booking_dates && reservation.booking_dates.trim()) {
          // ใช้ booking_dates ถ้ามี
          const dateArray = reservation.booking_dates.trim().split(',').map(d => d.trim()).filter(Boolean)
          existingBookingDates.push(...dateArray)
        } else {
          // สร้างจาก start_at ถึง end_at
          const resStartDate = new Date(reservation.start_at)
          const resEndDate = new Date(reservation.end_at)
          const currentDate = new Date(resStartDate)
          while (currentDate <= resEndDate) {
            existingBookingDates.push(currentDate.toISOString().split('T')[0])
            currentDate.setDate(currentDate.getDate() + 1)
          }
        }

        console.log(`🔍 [CONFLICT-CHECK] Reservation ${reservation.reservation_id} booking dates:`, existingBookingDates)

        // เช็คว่ามีวันที่ซ้อนทับกันไหม
        const datesOverlap = newBookingDates.some(newDate => 
          existingBookingDates.includes(newDate)
        )
        
        if (!datesOverlap) {
          console.log(`✅ [CONFLICT-CHECK] No date overlap with reservation ${reservation.reservation_id}`)
          return false // วันที่ไม่ทับซ้อน
        }

        console.log(`⚠️ [CONFLICT-CHECK] Date overlap found with reservation ${reservation.reservation_id}, checking times...`)

  // ถ้าวันที่ทับซ้อน ให้เช็คเวลา (เปรียบเทียบเฉพาะเวลาในวัน ไม่เอาวันจริงมาคิด)
  // สำหรับการจองแบบ multi-day ฟิลด์ start_time/end_time เก็บเวลาในรูป Date แต่วันที่อาจต่างกัน
  // ดังนั้นอย่าใช้การเปรียบเทียบ Date เต็มรูปแบบ เพราะจะเกิด false positive เมื่อ endDate ต่างกัน
  const reservationStartTime = new Date(reservation.start_time)
  const reservationEndTime = new Date(reservation.end_time)

  // เปลี่ยนเป็นเปรียบเทียบเป็น minutes ของวัน (เวลาในวันเท่านั้น)
  const newStartMinutes = startTime.getHours() * 60 + startTime.getMinutes()
  const newEndMinutes = endTime.getHours() * 60 + endTime.getMinutes()
  const existingStartMinutes = reservationStartTime.getHours() * 60 + reservationStartTime.getMinutes()
  const existingEndMinutes = reservationEndTime.getHours() * 60 + reservationEndTime.getMinutes()

  // Time overlap if (newStart < existingEnd) AND (existingStart < newEnd)
  const timesOverlap = (newStartMinutes < existingEndMinutes) && (existingStartMinutes < newEndMinutes)
        
        if (timesOverlap) {
          console.log(`❌ [CONFLICT-CHECK] Time overlap with reservation ${reservation.reservation_id}`)
        } else {
          console.log(`✅ [CONFLICT-CHECK] No time overlap with reservation ${reservation.reservation_id}`)
        }
        
        return timesOverlap
      })

      console.log('🔍 Conflict check details:', {
        roomId: existingReservation.room_id,
        excludeReservationId: parseInt(id),
        newTimeRange: `${startTime.toISOString()} - ${endTime.toISOString()}`,
        totalReservationsFound: allReservationsInRoom.length,
        conflictsFound: conflictReservations.length,
        conflicts: conflictReservations.map(r => ({
          id: r.reservation_id,
          dates: `${new Date(r.start_at).toISOString().split('T')[0]} - ${new Date(r.end_at).toISOString().split('T')[0]}`,
          times: `${new Date(r.start_time).toISOString().split('T')[1].slice(0,5)} - ${new Date(r.end_time).toISOString().split('T')[1].slice(0,5)}`,
          status: r.status_r
        }))
      })

      if (conflictReservations.length > 0) {
        set.status = 409
        return {
          success: false,
          message: `ช่วงเวลาที่เลือกมีการจองซ้อนทับอยู่แล้ว (ID: ${conflictReservations.map(r => `${r.reservation_id}[${r.status_r}]`).join(', ')}) กรุณาเลือกเวลาอื่น`
        }
      }

      // คำนวณ booking_dates และ is_multi_day
      let finalBookingDates = null
      let isMultiDay = false
      
      // ถ้า frontend ส่ง booking_dates มา ให้ใช้ตัวนั้น
      if (booking_dates && booking_dates.trim()) {
        finalBookingDates = booking_dates.trim()
        const dateArray = finalBookingDates.split(',').map(d => d.trim()).filter(Boolean)
        isMultiDay = dateArray.length > 1
        console.log('🔍 [UPDATE-RESERVATION] Using provided booking_dates:', finalBookingDates, 'isMultiDay:', isMultiDay)
      } else {
        // ถ้าไม่ได้ส่งมา ให้คำนวณจาก selectedDates ใน frontend
        // ถ้า start_at และ end_at เหมือนกัน = วันเดียว
        // ถ้าต่างกัน = multi-day (ต่อเนื่อง)
        if (startDate.toDateString() === endDate.toDateString()) {
          // วันเดียว
          finalBookingDates = null
          isMultiDay = false
        } else {
          // multi-day ต่อเนื่อง
          const dates = []
          const currentDate = new Date(startDate)
          while (currentDate <= endDate) {
            dates.push(currentDate.toISOString().split('T')[0])
            currentDate.setDate(currentDate.getDate() + 1)
          }
          finalBookingDates = dates.join(',')
          isMultiDay = true
        }
        console.log('🔍 [UPDATE-RESERVATION] Calculated booking_dates:', finalBookingDates, 'isMultiDay:', isMultiDay)
      }

      // อัปเดตการจอง
      const updatedReservation = await prisma.reservation.update({
        where: { reservation_id: parseInt(id) },
        data: {
          start_at: startDate,
          end_at: endDate,
          start_time: startTime,
          end_time: endTime,
          details_r: details_r.trim(),
          booking_dates: finalBookingDates,
          is_multi_day: isMultiDay,
          updated_at: new Date()
        },
        include: {
          meeting_room: {
            select: {
              room_name: true,
              department: true
            }
          }
        }
      })

      console.log(`✅ แก้ไขการจอง: ${user.first_name} แก้ไขการจอง ${existingReservation.meeting_room.room_name}`)

      return {
        success: true,
        message: 'แก้ไขการจองสำเร็จ',
        reservation: {
          reservation_id: updatedReservation.reservation_id,
          room_name: updatedReservation.meeting_room.room_name,
          department: updatedReservation.meeting_room.department,
          start_at: updatedReservation.start_at,
          end_at: updatedReservation.end_at,
          start_time: updatedReservation.start_time,
          end_time: updatedReservation.end_time,
          details: updatedReservation.details_r,
          status: updatedReservation.status_r,
          updated_at: updatedReservation.updated_at
        }
      }

    } catch (error) {
      console.error('❌ Error updating reservation:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการแก้ไขการจอง'
      }
    }
  })

  // ยกเลิกการจองของตนเอง (4.2.6)
  .delete('/:id', async ({ request, params, set }) => {
    // ตรวจสอบสิทธิ์ user
    const user = await authMiddleware(request, set)
    if (user.success === false) return user
    
    if (!isUser(user)) {
      set.status = 403
      return {
        success: false,
        message: 'ไม่มีสิทธิ์ในการยกเลิกการจอง'
      }
    }

    try {
      const { id } = params

      // ตรวจสอบการจองที่มีอยู่
      const existingReservation = await prisma.reservation.findUnique({
        where: { reservation_id: parseInt(id) },
        include: {
          meeting_room: {
            select: {
              room_name: true
            }
          }
        }
      })

      if (!existingReservation) {
        set.status = 404
        return {
          success: false,
          message: 'ไม่พบการจองที่ต้องการ'
        }
      }

      // ตรวจสอบสิทธิ์เจ้าของ
      if (existingReservation.user_id !== user.user_id) {
        set.status = 403
        return {
          success: false,
          message: 'ไม่สามารถยกเลิกการจองของผู้อื่นได้'
        }
      }

      // ตรวจสอบสถานะ - ยกเลิกได้เฉพาะ pending และ approved
      if (existingReservation.status_r === 'rejected') {
        set.status = 400
        return {
          success: false,
          message: 'ไม่สามารถยกเลิกการจองที่ถูกปฏิเสธแล้วได้'
        }
      }

      // อัปเดตสถานะเป็น cancelled แทนการลบ
      await prisma.reservation.update({
        where: { reservation_id: parseInt(id) },
        data: { 
          status_r: 'cancelled',
          updated_at: new Date()
        }
      })

      console.log(`✅ ยกเลิกการจอง: ${user.first_name} ยกเลิกการจอง ${existingReservation.meeting_room.room_name}`)

      return {
        success: true,
        message: 'ยกเลิกการจองสำเร็จ',
        cancelled_reservation: {
          reservation_id: existingReservation.reservation_id,
          room_name: existingReservation.meeting_room.room_name,
          start_at: existingReservation.start_at,
          end_at: existingReservation.end_at,
          previous_status: existingReservation.status_r
        }
      }

    } catch (error) {
      console.error('❌ Error cancelling reservation:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการยกเลิกการจอง'
      }
    }
  })

  // สถิติการใช้งานห้องประชุม (สำหรับ User Dashboard)
  .get('/statistics/room-usage', async ({ request, query, set }) => {
    // ตรวจสอบสิทธิ์ user
    const user = await authMiddleware(request, set)
    if (user.success === false) return user
    
    if (!isUser(user)) {
      set.status = 403
      return {
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลสถิติ'
      }
    }
    
    try {
      console.log('📊 เรียกใช้ API สถิติการใช้งานห้องประชุม (User)')
      
      const { year, month } = query
      
      // สร้าง date filter
      let dateFilter = {}
      if (year || month) {
        const startDate = new Date(
          parseInt(year || new Date().getFullYear()),
          parseInt(month || 1) - 1,
          1
        )
        const endDate = new Date(
          parseInt(year || new Date().getFullYear()),
          parseInt(month || 12),
          0
        )
        
        dateFilter = {
          start_at: {
            gte: startDate,
            lte: endDate
          }
        }
      }
      
      // ดึงข้อมูลการจองแยกตามห้อง (เฉพาะที่ approved)
      const roomUsage = await prisma.reservation.groupBy({
        by: ['room_id'],
        where: {
          status_r: 'approved',
          ...dateFilter
        },
        _count: {
          reservation_id: true
        }
      })
      
      // ดึงข้อมูลห้องประชุมทั้งหมด
      const rooms = await prisma.meeting_room.findMany({
        select: {
          room_id: true,
          room_name: true,
          capacity: true,
          department: true
        }
      })
      
      // รวมข้อมูลและเรียงลำดับ
      const roomUsageStats = rooms.map(room => {
        const usage = roomUsage.find(usage => usage.room_id === room.room_id)
        return {
          room_id: room.room_id,
          room_name: room.room_name,
          capacity: room.capacity,
          department: room.department,
          bookings: usage ? usage._count.reservation_id : 0
        }
      })
      
      // เรียงลำดับตามจำนวนการใช้งาน (มากไปน้อย)
      roomUsageStats.sort((a, b) => b.bookings - a.bookings)
      
      console.log(`✅ ดึงสถิติการใช้งานห้อง: ${roomUsageStats.length} ห้อง (User)`)
      
      return {
        success: true,
        message: 'ข้อมูลสถิติการใช้งานห้องประชุม',
        data: roomUsageStats,
        total_rooms: roomUsageStats.length,
        filter: {
          year: year || 'ทั้งหมด',
          month: month || 'ทั้งหมด'
        }
      }
      
    } catch (error) {
      console.error('❌ Error getting room usage statistics (User):', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติการใช้งานห้อง',
        error: error.message
      }
    }
  })

  // สถิติการจองตามคณะ (สำหรับ User Dashboard) 
  .get('/statistics/department-stats', async ({ request, query, set }) => {
    // ตรวจสอบสิทธิ์ user
    const user = await authMiddleware(request, set)
    if (user.success === false) return user
    
    if (!isUser(user)) {
      set.status = 403
      return {
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลสถิติ'
      }
    }
    
    try {
      console.log('📊 เรียกใช้ API สถิติการจองตามคณะ (User)')
      
      const { year, month } = query
      
      // สร้าง date filter
      let dateFilter = {}
      if (year || month) {
        const startDate = new Date(
          parseInt(year || new Date().getFullYear()),
          parseInt(month || 1) - 1,
          1
        )
        const endDate = new Date(
          parseInt(year || new Date().getFullYear()),
          parseInt(month || 12),
          0
        )
        
        dateFilter = {
          start_at: {
            gte: startDate,
            lte: endDate
          }
        }
      }
      
      // ดึงข้อมูลการจองตามคณะ (เฉพาะที่ approved)
      const departmentStats = await prisma.reservation.groupBy({
        by: ['user_id'],
        where: {
          status_r: 'approved',
          ...dateFilter
        },
        _count: {
          reservation_id: true
        }
      })
      
      // ดึงข้อมูล users เพื่อเอา department
      const userIds = departmentStats.map(stat => stat.user_id)
      const users = await prisma.users.findMany({
        where: {
          user_id: { in: userIds }
        },
        select: {
          user_id: true,
          department: true
        }
      })
      
      // รวมข้อมูลตามคณะ
      const departmentMap = {}
      departmentStats.forEach(stat => {
        const userFound = users.find(u => u.user_id === stat.user_id)
        const department = userFound?.department || 'ไม่ระบุคณะ'
        
        if (departmentMap[department]) {
          departmentMap[department] += stat._count.reservation_id
        } else {
          departmentMap[department] = stat._count.reservation_id
        }
      })
      
      // แปลงเป็น array และเรียงลำดับ
      const departmentStatsArray = Object.entries(departmentMap).map(([department, bookings]) => ({
        department,
        bookings
      }))
      
      departmentStatsArray.sort((a, b) => b.bookings - a.bookings)
      
      console.log(`✅ ดึงสถิติการจองตามคณะ: ${departmentStatsArray.length} คณะ (User)`)
      
      return {
        success: true,
        message: 'ข้อมูลสถิติการจองตามคณะ',
        data: departmentStatsArray,
        total_departments: departmentStatsArray.length,
        filter: {
          year: year || 'ทั้งหมด',
          month: month || 'ทั้งหมด'
        }
      }
      
    } catch (error) {
      console.error('❌ Error getting department statistics (User):', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติตามคณะ',
        error: error.message
      }
    }
  })

// ===================================================================
// Officer Reservation Management APIs (เฉพาะเจ้าหน้าที่)
// ===================================================================
export const officerReservationRoutes = new Elysia({ prefix: '/protected/officer/reservations' })
  
  // ดูการจองที่รออนุมัติ (ในคณะตัวเอง)
  .get('/', async ({ request, query, set }) => {
    // ตรวจสอบสิทธิ์ officer
    const user = await authMiddleware(request, set)
    if (user.success === false) return user
    
    if (!isOfficer(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะเจ้าหน้าที่เท่านั้น'
      }
    }

    try {
      const { status = 'pending', limit = 20, offset = 0 } = query
      
      // ⚠️ SECURITY FIX: เจ้าหน้าที่แต่ละคณะเห็นเฉพาะการจองในคณะที่ตัวเองรับผิดชอบตามตำแหน่ง
      if (!user.department) {
        set.status = 403
        return {
          success: false,
          message: 'ไม่พบข้อมูลสิทธิ์การดูแลห้องประชุม'
        }
      }
      
      console.log(`🏢 [OFFICER] ${user.position} can access department: ${user.department}`)
      
      // วันที่ปัจจุบัน (สำหรับกรองเฉพาะการจองที่ยังใช้งานได้)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // ตั้งเป็นเริ่มวัน
      
      const where = {
        meeting_room: {
          department: user.department // ⚠️ SECURITY FIX: ใช้ department
        },
        // กรองเฉพาะการจองที่วันเริ่มต้องยังไม่เลยวันปัจจุบัน
        start_at: {
          gte: today // วันเริ่มต้องมากกว่าหรือเท่ากับวันนี้
        }
      }
      
      // เพิ่มเงื่อนไข status เฉพาะเมื่อไม่ใช่ 'all'
      if (status && status !== 'all') {
        where.status_r = status
      }

      const reservations = await prisma.reservation.findMany({
        where,
        include: {
          users: {
            select: {
              first_name: true,
              last_name: true,
              email: true,
              department: true
            }
          },
          meeting_room: {
            select: {
              room_name: true,
              location_m: true,
              capacity: true
            }
          },
          officer: {
            select: {
              first_name: true,
              last_name: true
            }
          }
        },
        orderBy: { created_at: 'desc' }, // เรียงจากใหม่สุดมาก่อน
        take: parseInt(limit),
        skip: parseInt(offset)
      })

      const total = await prisma.reservation.count({ where })

      return {
        success: true,
        message: `การจองในคณะ ${user.department} (${reservations.length} รายการ)`,
        department: user.department,
        reservations: reservations.map(r => {
          const isRoomDeleted = !r.meeting_room
          return {
          reservation_id: r.reservation_id,
          room_name: isRoomDeleted ? '⚠️ ห้องนี้ไม่มีในระบบแล้ว' : r.meeting_room.room_name,
          location: isRoomDeleted ? null : r.meeting_room.location_m,
          capacity: isRoomDeleted ? null : r.meeting_room.capacity,
          start_date: r.start_at,
          end_date: r.end_at,
          start_time: r.start_time,
          end_time: r.end_time,
          details: r.details_r,
          status: translateStatus(r.status_r),
          reserved_by: `${r.users.first_name} ${r.users.last_name}`,
          user_email: r.users.email,
          user_department: r.users.department,
          processed_by: r.officer ? `${r.officer.first_name} ${r.officer.last_name}` : null,
          created_at: r.created_at,
          updated_at: r.updated_at,
          // ✅ เพิ่ม booking_dates และแปลงจาก CSV เป็น array
          booking_dates: r.booking_dates ? r.booking_dates.split(',').map(d => d.trim()) : null,
          is_multi_day: r.is_multi_day
          }
        }),
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: total > (parseInt(offset) + parseInt(limit))
        }
      }

    } catch (error) {
      console.error('❌ Error fetching officer reservations:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการจอง'
      }
    }
  })

  // อนุมัติการจอง
  .put('/:id/approve', async ({ request, params, body, set }) => {
    console.log('🔥 [APPROVE API] Called with params:', params)
    console.log('🔥 [APPROVE API] Body:', body)
    console.log('🔥 [APPROVE API] Request method:', request.method)
    console.log('🔥 [APPROVE API] Request URL:', request.url)
    
    // ตรวจสอบสิทธิ์ officer
    const user = await authMiddleware(request, set)
    console.log('🔥 [APPROVE API] Auth result:', user)
    if (user.success === false) return user
    
    if (!isOfficer(user)) {
      console.log('🔥 [APPROVE API] User is not officer:', user.role)
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะเจ้าหน้าที่เท่านั้น'
      }
    }

    try {
      const reservationId = parseInt(params.id)
      const { note } = body

      // ตรวจสอบการจองที่มีอยู่
      const reservation = await prisma.reservation.findUnique({
        where: { reservation_id: reservationId },
        include: {
          meeting_room: {
            select: {
              room_name: true,
              department: true
            }
          },
          users: {
            select: {
              first_name: true,
              last_name: true,
              email: true
            }
          }
        }
      })

      if (!reservation) {
        set.status = 404
        return {
          success: false,
          message: 'ไม่พบการจองที่ระบุ'
        }
      }

      // ⚠️ SECURITY FIX: เจ้าหน้าที่ตรวจสอบว่าห้องอยู่ในคณะที่รับผิดชอบตามตำแหน่ง
      if (!user.department) {
        set.status = 403
        return {
          success: false,
          message: 'ไม่พบข้อมูลสิทธิ์การดูแลห้องประชุม'
        }
      }
      
      if (reservation.meeting_room.department !== user.department) {
        set.status = 403
        return {
          success: false,
          message: `คุณไม่มีสิทธิ์อนุมัติการจองห้องประชุม ${reservation.meeting_room.department} (รับผิดชอบเฉพาะ ${user.department})`
        }
      }

      // ตรวจสอบสถานะ
      if (reservation.status_r !== 'pending') {
        set.status = 400
        return {
          success: false,
          message: `การจองนี้มีสถานะ "${translateStatus(reservation.status_r)}" แล้ว ไม่สามารถอนุมัติได้`
        }
      }

      // อนุมัติการจอง
      const updatedReservation = await prisma.reservation.update({
        where: { reservation_id: reservationId },
        data: {
          status_r: 'approved',
          officer_id: user.officer_id, // ✅ ใช้ officer_id ที่ถูกต้อง
          details_r: note ? `${reservation.details_r}\n\nหมายเหตุจากเจ้าหน้าที่: ${note}` : reservation.details_r,
          updated_at: new Date()
        },
        include: {
          meeting_room: {
            select: {
              room_name: true,
              location_m: true
            }
          }
        }
      })

      console.log(`✅ อนุมัติการจอง: ${user.first_name} อนุมัติการจอง ${reservation.meeting_room.room_name}`)

      // 📧 ส่งอีเมลแจ้งผู้จองว่าได้รับการอนุมัติ
      try {
        const emailResult = await notifyUserReservationApproved(reservationId, user.officer_id)
        if (emailResult.success) {
          console.log(`📧 ส่งอีเมลแจ้งการอนุมัติสำเร็จ ไปยัง ${reservation.users.email}`)
        } else {
          console.log(`⚠️ ไม่สามารถส่งอีเมลแจ้งการอนุมัติได้: ${emailResult.reason || emailResult.error}`)
        }
      } catch (emailError) {
        console.error('❌ Error sending approval email:', emailError)
        // ไม่ให้ Email error ทำให้การอนุมัติล้มเหลว
      }

      return {
        success: true,
        message: 'อนุมัติการจองสำเร็จ',
        reservation: {
          reservation_id: updatedReservation.reservation_id,
          room_name: updatedReservation.meeting_room.room_name,
          location: updatedReservation.meeting_room.location_m,
          start_date: updatedReservation.start_at,
          end_date: updatedReservation.end_at,
          start_time: updatedReservation.start_time,
          end_time: updatedReservation.end_time,
          details: updatedReservation.details_r,
          status: updatedReservation.status_r,
          approved_by: `${user.first_name} ${user.last_name}`,
          updated_at: updatedReservation.updated_at
        },
        notification: {
          user_name: `${reservation.users.first_name} ${reservation.users.last_name}`,
          user_email: reservation.users.email
        }
      }

    } catch (error) {
      console.error('❌ Error approving reservation:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการอนุมัติการจอง'
      }
    }
  })

  // ปฏิเสธการจอง
  .put('/:id/reject', async ({ request, params, body, set }) => {
    // ตรวจสอบสิทธิ์ officer
    const user = await authMiddleware(request, set)
    if (user.success === false) return user
    
    if (!isOfficer(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะเจ้าหน้าที่เท่านั้น'
      }
    }

    try {
      const reservationId = parseInt(params.id)
      const { reason } = body

      if (!reason || reason.trim() === '') {
        set.status = 400
        return {
          success: false,
          message: 'กรุณาระบุเหตุผลในการปฏิเสธ'
        }
      }

      // ตรวจสอบการจองที่มีอยู่
      const reservation = await prisma.reservation.findUnique({
        where: { reservation_id: reservationId },
        include: {
          meeting_room: {
            select: {
              room_name: true,
              department: true
            }
          },
          users: {
            select: {
              first_name: true,
              last_name: true,
              email: true
            }
          }
        }
      })

      if (!reservation) {
        set.status = 404
        return {
          success: false,
          message: 'ไม่พบการจองที่ระบุ'
        }
      }

      // ⚠️ SECURITY FIX: เจ้าหน้าที่ตรวจสอบว่าห้องอยู่ในคณะที่รับผิดชอบ
      if (!user.department) {
        set.status = 403
        return {
          success: false,
          message: 'ไม่พบข้อมูลสิทธิ์การดูแลห้องประชุม'
        }
      }
      
      if (reservation.meeting_room.department !== user.department) {
        set.status = 403
        return {
          success: false,
          message: `คุณไม่มีสิทธิ์ปฏิเสธการจองห้องประชุม ${reservation.meeting_room.department} (รับผิดชอบเฉพาะ ${user.department})`
        }
      }

      // ตรวจสอบสถานะ
      if (reservation.status_r !== 'pending') {
        set.status = 400
        return {
          success: false,
          message: `การจองนี้มีสถานะ "${translateStatus(reservation.status_r)}" แล้ว ไม่สามารถปฏิเสธได้`
        }
      }

      // ปฏิเสธการจอง
      const updatedReservation = await prisma.reservation.update({
        where: { reservation_id: reservationId },
        data: {
          status_r: 'rejected',
          officer_id: user.officer_id, // ✅ ใช้ officer_id ที่ถูกต้อง
          rejected_reason: reason.trim(),  // เก็บในฟิลด์แยก
          updated_at: new Date()
        },
        include: {
          meeting_room: {
            select: {
              room_name: true,
              location_m: true
            }
          }
        }
      })

      console.log(`❌ ปฏิเสธการจอง: ${user.first_name} ปฏิเสธการจอง ${reservation.meeting_room.room_name}`)

      // 📧 ส่งอีเมลแจ้งผู้จองว่าถูกปฏิเสธ
      try {
        const emailResult = await notifyUserReservationRejected(reservationId, user.officer_id, reason.trim())
        if (emailResult.success) {
          console.log(`📧 ส่งอีเมลแจ้งการปฏิเสธสำเร็จ ไปยัง ${reservation.users.email}`)
        } else {
          console.log(`⚠️ ไม่สามารถส่งอีเมลแจ้งการปฏิเสธได้: ${emailResult.reason || emailResult.error}`)
        }
      } catch (emailError) {
        console.error('❌ Error sending rejection email:', emailError)
        // ไม่ให้ Email error ทำให้การปฏิเสธล้มเหลว
      }

      return {
        success: true,
        message: 'ปฏิเสธการจองสำเร็จ',
        reservation: {
          reservation_id: updatedReservation.reservation_id,
          room_name: updatedReservation.meeting_room.room_name,
          location: updatedReservation.meeting_room.location_m,
          start_date: updatedReservation.start_at,
          end_date: updatedReservation.end_at,
          status: updatedReservation.status_r,
          rejected_by: `${user.first_name} ${user.last_name}`,
          rejection_reason: reason.trim(),
          updated_at: updatedReservation.updated_at
        },
        notification: {
          user_name: `${reservation.users.first_name} ${reservation.users.last_name}`,
          user_email: reservation.users.email
        }
      }

    } catch (error) {
      console.error('❌ Error rejecting reservation:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการปฏิเสธการจอง'
      }
    }
  })

  // 📊 API สำหรับสถิติการใช้ห้องประชุม (แสดงทุกห้องเรียงจากมากไปน้อย)
  .get('/statistics/room-usage', async ({ request, query, set }) => {
    // ตรวจสอบสิทธิ์ officer
    const user = await authMiddleware(request, set)
    if (user.success === false) return user
    
    if (!isOfficer(user)) {
      set.status = 403
      return {
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลสถิติ'
      }
    }
    
    try {
      console.log('📊 เรียกใช้ API สถิติการใช้ห้องประชุม')
      
      const { year, month, department } = query
      
      // สร้าง date filter ถ้ามีการระบุ
      let dateFilter = {}
      if (year || month) {
        const startDate = new Date(
          parseInt(year || new Date().getFullYear()),
          parseInt(month || 1) - 1,
          1
        )
        const endDate = new Date(
          parseInt(year || new Date().getFullYear()),
          parseInt(month || 12),
          0
        )
        
        dateFilter = {
          start_at: {
            gte: startDate,
            lte: endDate
          }
        }
      }
      
      // สร้าง department filter ถ้ามี
      let departmentFilter = {}
      if (department) {
        departmentFilter = {
          users: {
            department: department
          }
        }
      }
      
      // ดึงข้อมูลการจองที่ approved
      const reservations = await prisma.reservation.groupBy({
        by: ['room_id'],
        where: {
          status_r: 'approved',
          ...dateFilter,
          ...departmentFilter
        },
        _count: {
          reservation_id: true
        }
      })
      
      // ดึงข้อมูลห้องประชุมทั้งหมด
      const rooms = await prisma.meeting_room.findMany({
        select: {
          room_id: true,
          room_name: true,
          location_m: true,
          capacity: true
        }
      })
      
      // รวมข้อมูลและเรียงลำดับ
      const roomUsageStats = rooms.map(room => {
        const reservationCount = reservations.find(r => r.room_id === room.room_id)
        return {
          room_id: room.room_id,
          room_name: room.room_name,
          location: room.location_m,
          capacity: room.capacity,
          bookings: reservationCount ? reservationCount._count.reservation_id : 0
        }
      })
      
      // เรียงจากมากไปน้อย
      roomUsageStats.sort((a, b) => b.bookings - a.bookings)
      
      console.log(`✅ ดึงสถิติการใช้ห้องประชุม: ${roomUsageStats.length} ห้อง`)
      
      return {
        success: true,
        message: 'ข้อมูลสถิติการใช้ห้องประชุม',
        data: roomUsageStats,
        total_rooms: roomUsageStats.length,
        filter: {
          year: year || 'ทั้งหมด',
          month: month || 'ทั้งหมด',
          department: department || 'ทั้งหมด'
        }
      }
      
    } catch (error) {
      console.error('❌ Error getting room usage statistics:', error)
      console.error('Error details:', error.message)
      console.error('Error stack:', error.stack)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติการใช้ห้องประชุม',
        error: error.message
      }
    }
  })

  // 📊 API สำหรับสถิติการจองตามคณะ
  .get('/statistics/department-stats', async ({ request, query, set }) => {
    // ตรวจสอบสิทธิ์ officer
    const user = await authMiddleware(request, set)
    if (user.success === false) return user
    
    if (!isOfficer(user)) {
      set.status = 403
      return {
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลสถิติ'
      }
    }
    
    try {
      console.log('📊 เรียกใช้ API สถิติการจองตามคณะ')
      
      const { year, month } = query
      
      // สร้าง date filter
      let dateFilter = {}
      if (year || month) {
        const startDate = new Date(
          parseInt(year || new Date().getFullYear()),
          parseInt(month || 1) - 1,
          1
        )
        const endDate = new Date(
          parseInt(year || new Date().getFullYear()),
          parseInt(month || 12),
          0
        )
        
        dateFilter = {
          start_at: {
            gte: startDate,
            lte: endDate
          }
        }
      }
      
      // ดึงข้อมูลการจองตามคณะ
      const departmentStats = await prisma.reservation.groupBy({
        by: ['user_id'],
        where: {
          status_r: 'approved',
          ...dateFilter
        },
        _count: {
          reservation_id: true
        }
      })
      
      // ดึงข้อมูล users เพื่อเอา department
      const userIds = departmentStats.map(stat => stat.user_id)
      const users = await prisma.users.findMany({
        where: {
          user_id: { in: userIds }
        },
        select: {
          user_id: true,
          department: true
        }
      })
      
      // รวมข้อมูลตามคณะ
      const departmentMap = {}
      departmentStats.forEach(stat => {
        const user = users.find(u => u.user_id === stat.user_id)
        const department = user?.department || 'ไม่ระบุ'
        
        if (departmentMap[department]) {
          departmentMap[department] += stat._count.reservation_id
        } else {
          departmentMap[department] = stat._count.reservation_id
        }
      })
      
      // แปลงเป็น array และเรียงลำดับ
      const departmentStatsArray = Object.entries(departmentMap).map(([department, bookings]) => ({
        department,
        bookings
      }))
      
      departmentStatsArray.sort((a, b) => b.bookings - a.bookings)
      
      console.log(`✅ ดึงสถิติการจองตามคณะ: ${departmentStatsArray.length} คณะ`)
      
      return {
        success: true,
        message: 'ข้อมูลสถิติการจองตามคณะ',
        data: departmentStatsArray,
        total_departments: departmentStatsArray.length,
        filter: {
          year: year || 'ทั้งหมด',
          month: month || 'ทั้งหมด'
        }
      }
      
    } catch (error) {
      console.error('❌ Error getting department statistics:', error)
      console.error('Error details:', error.message)
      console.error('Error stack:', error.stack)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติตามคณะ',
        error: error.message
      }
    }
  })

  // ===== Officer Reports =====
  .get('/reports', async ({ request, query, set }) => {
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isOfficer(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะเจ้าหน้าที่เท่านั้น'
      }
    }

    try {
      console.log('📊 Officer Reports - User:', user.email, 'Position:', user.position)
      const { period = 'current_month' } = query

      // ⚠️ SECURITY FIX: เจ้าหน้าที่เห็นเฉพาะข้อมูลในหน่วยงานที่รับผิดชอบ
      if (!user.department) {
        set.status = 403
        return {
          success: false,
          message: 'ไม่พบข้อมูลสิทธิ์การดูแลห้องประชุม'
        }
      }

      console.log('🏢 Officer department filter:', user.department)

      // คำนวณช่วงเวลาตาม period
      let startDate, endDate
      const now = new Date()
      
      switch (period) {
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          endDate = new Date(now.getFullYear(), now.getMonth(), 0)
          break
        case 'current_quarter':
          const currentQuarter = Math.floor(now.getMonth() / 3)
          startDate = new Date(now.getFullYear(), currentQuarter * 3, 1)
          endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0)
          break
        case 'current_year':
          startDate = new Date(now.getFullYear(), 0, 1)
          endDate = new Date(now.getFullYear(), 11, 31)
          break
        default: // current_month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }

      const whereCondition = {
        meeting_room: { department: user.department },
        created_at: {
          gte: startDate,
          lte: endDate
        }
      }

      console.log('📅 Date range:', { period, startDate, endDate })
      console.log('🔍 Where condition:', JSON.stringify(whereCondition, null, 2))

      // ดึงข้อมูลสรุปการจอง
      const reservationSummary = await prisma.reservation.groupBy({
        by: ['status_r'],
        where: whereCondition,
        _count: {
          reservation_id: true
        }
      })

      // ดึงข้อมูลการใช้งานห้องประชุม
      const roomUtilization = await prisma.reservation.groupBy({
        by: ['room_id'],
        where: whereCondition,
        _count: {
          reservation_id: true
        },
        orderBy: {
          _count: {
            reservation_id: 'desc'
          }
        }
      })

      // ดึงข้อมูลแนวโน้มรายเดือน (6 เดือนที่ผ่านมา)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
      sixMonthsAgo.setDate(1)

      const monthlyTrends = []
      for (let i = 0; i < 6; i++) {
        const monthStart = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1)
        const monthEnd = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i + 1, 0)
        
        const count = await prisma.reservation.count({
          where: {
            meeting_room: { department: user.department },
            created_at: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        })
        
        monthlyTrends.push({
          month: monthStart.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' }),
          total_reservations: count
        })
      }

      // จัดรูปแบบข้อมูล
      const reports = {
        reservation_summary: {
          approved: reservationSummary.find(s => s.status_r === 'approved')?._count.reservation_id || 0,
          pending: reservationSummary.find(s => s.status_r === 'pending')?._count.reservation_id || 0,
          rejected: reservationSummary.find(s => s.status_r === 'rejected')?._count.reservation_id || 0,
          cancelled: reservationSummary.find(s => s.status_r === 'cancelled')?._count.reservation_id || 0
        },
        room_utilization: [],
        monthly_trends: monthlyTrends
      }

      // เพิ่มชื่อห้องประชุมในข้อมูลการใช้งาน
      if (roomUtilization.length > 0) {
        const roomIds = roomUtilization.map(r => r.room_id)
        const rooms = await prisma.meeting_room.findMany({
          where: { room_id: { in: roomIds } },
          select: { room_id: true, room_name: true }
        })
        
        reports.room_utilization = roomUtilization.map(util => ({
          room_id: util.room_id,
          room_name: rooms.find(r => r.room_id === util.room_id)?.room_name || 'ไม่ทราบชื่อ',
          total_reservations: util._count.reservation_id
        }))
      }

      console.log('📊 Officer reports generated:', {
        department: user.department,
        period,
        summary: reports.reservation_summary,
        rooms: reports.room_utilization.length,
        trends: reports.monthly_trends.length
      })

      return {
        success: true,
        message: `รายงานการใช้งานในหน่วยงาน ${user.department}`,
        department: user.department,
        period,
        reports
      }
    } catch (error) {
      console.error('❌ Officer Reports Error:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างรายงาน',
        error: error.message
      }
    }
  })
