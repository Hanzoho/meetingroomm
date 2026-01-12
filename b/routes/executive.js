// ===================================================================
// Executive Routes - สำหรับผู้บริหาร (READ ONLY)
// ===================================================================
// ไฟล์นี้จัดการ APIs สำหรับผู้บริหาร (ดูข้อมูล report เท่านั้น):
// - Executive: ดูข้อมูลทุกคณะ/หน่วยงาน (แต่แก้ไขไม่ได้)
// 
// NOTE: เฉพาะ ADMIN เท่านั้นที่เห็นข้อมูลส่วนตัวของ Executive ได้
//       Executive ไม่สามารถจัดการ user อื่นได้
//       Updated: Executive ทุกคนเห็นข้อมูลทุกหน่วยงาน (ไม่แบ่งระดับแล้ว)
// ===================================================================

import { Elysia } from 'elysia'
import { Prisma } from '../generated/prisma/index.js'
import prisma from '../lib/prisma.js'
import { authMiddleware, isExecutive } from '../middleware/index.js'
// Removed getDepartmentFromPosition - now using user.department directly

export const executiveRoutes = new Elysia({ prefix: '/protected/executive' })

  // ===== Executive Dashboard =====
  .get('/dashboard', async ({ request, set }) => {
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isExecutive(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้บริหารเท่านั้น'
      }
    }

    try {
      let stats = {}

      // Executive - ดูได้ทุกคณะ/หน่วยงาน
      console.log('📊 Executive: Dashboard - ดูข้อมูลทุกหน่วยงาน')

      stats = {
        total_users: await prisma.users.count(),
        total_officers: await prisma.officer.count(),
        total_rooms: await prisma.meeting_room.count(),
        total_reservations: await prisma.reservation.count(),
        departments_summary: await prisma.meeting_room.groupBy({
          by: ['department'],
          _count: { room_id: true }
        }),
        recent_reservations: await prisma.reservation.findMany({
          select: {
            reservation_id: true,
            start_at: true,
            end_at: true,
            status_r: true,
            created_at: true,
            meeting_room: {
              select: {
                room_name: true,
                room_id: true
              }
            },
              users: {
                select: {
                  first_name: true,
                  last_name: true,
                  user_id: true
                }
              }
            },
            orderBy: { created_at: 'desc' },
            take: 10
          }).then(reservations => {
            // ตรวจสอบและกรองข้อมูลที่ไม่สมบูรณ์
            return reservations.filter(res => res && res.reservation_id).map(res => ({
              reservation_id: res.reservation_id,
              start_at: res.start_at,
              end_at: res.end_at,
              status_r: res.status_r || 'pending',
              created_at: res.created_at,
              room_name: res.meeting_room?.room_name || 'ไม่ระบุ',
              user_name: res.users ? `${res.users.first_name || ''} ${res.users.last_name || ''}`.trim() : 'ไม่ระบุ'
            }))
          })
        }

      return {
        success: true,
        message: 'ข้อมูล Dashboard ผู้บริหาร',
        executive_type: user.position,
        department: 'ทุกคณะ/หน่วยงาน',
        stats
      }

    } catch (error) {
      console.error('❌ Executive Dashboard Error:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard'
      }
    }
  })

  // ===== Executive Reports =====
  .get('/reports', async ({ request, query, set }) => {
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isExecutive(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้บริหารเท่านั้น'
      }
    }

    try {
      console.log('📊 Executive Reports - User:', user.email, 'Position:', user.position, 'Department:', user.department)

      const { department, month, year } = query
      let whereCondition = {}

      // Executive ดูได้ทุกคณะ/หน่วยงาน แต่สามารถ filter ตาม department ที่เลือกได้
      if (department) {
        whereCondition.meeting_room = { department }
        console.log('🏛️ Executive - Filter by department:', department)
      } else {
        console.log('🌐 Executive - All departments')
      }

      // Filter by month/year if provided
      if (month && year) {
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        const endDate = new Date(parseInt(year), parseInt(month), 0)
        whereCondition.created_at = {
          gte: startDate,
          lte: endDate
        }
        console.log('📅 Date filter:', { startDate, endDate })
      }

      console.log('🔍 Where condition:', JSON.stringify(whereCondition, null, 2))

      // ดึงข้อมูลแยกส่วน เพื่อ debug ได้ง่าย
      console.log('📊 Querying reservation_summary...')
      const reservation_summary = await prisma.reservation.groupBy({
        by: ['status_r'],
        where: whereCondition,
        _count: { reservation_id: true }
      })
      console.log('✅ reservation_summary:', reservation_summary)

      console.log('📊 Querying room_utilization with averages and this-month counts...')
      // Use raw SQL to compute per-room counts, average duration (in minutes), and this-month counts
      const roomUtilRows = await prisma.$queryRaw`
        SELECT 
          r.room_id,
          COUNT(r.reservation_id) AS reservation_count,
          AVG(
            CASE 
              WHEN r.start_time IS NOT NULL AND r.end_time IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (r.end_time - r.start_time)) / 60.0 
              ELSE NULL 
            END
          ) AS avg_duration_minutes,
          SUM(
            CASE 
              WHEN date_trunc('month', r.start_at) = date_trunc('month', CURRENT_DATE) THEN 1 
              ELSE 0 
            END
          ) AS this_month_count
        FROM reservation r
        JOIN meeting_room mr ON r.room_id = mr.room_id
        ${whereCondition.created_at
          ? Prisma.sql`WHERE r.created_at >= ${whereCondition.created_at.gte} AND r.created_at <= ${whereCondition.created_at.lte}`
          : Prisma.sql``}
        ${whereCondition.meeting_room?.department
          ? Prisma.sql`${whereCondition.created_at ? Prisma.sql` AND ` : Prisma.sql` WHERE `} mr.department = ${whereCondition.meeting_room.department}`
          : Prisma.sql``}
        GROUP BY r.room_id
      `
      // Attach meeting room details
      let roomDetails = []
      if (roomUtilRows.length > 0) {
        const roomIds = roomUtilRows.map(r => r.room_id).filter(id => id !== null)
        if (roomIds.length > 0) {
          roomDetails = await prisma.meeting_room.findMany({
            where: { room_id: { in: roomIds } },
            select: { room_id: true, room_name: true, department: true }
          })
        }
      }
      const room_utilization = roomUtilRows.map(r => ({
        room_id: r.room_id,
        reservation_count: Number(r.reservation_count || 0),
        avg_duration_minutes: r.avg_duration_minutes !== null ? Number(r.avg_duration_minutes) : null,
        this_month_count: Number(r.this_month_count || 0),
        meeting_room: roomDetails.find(d => d.room_id === r.room_id) || {
          room_id: r.room_id,
          room_name: 'ไม่ระบุห้อง',
          department: room.department || 'ไม่ระบุ'
        }
      }))
      console.log('✅ room_utilization (enhanced):', room_utilization.length)

      console.log('📊 Querying monthly_trends...')
      // Build monthly trends for last 12 months based on start_at (scheduled date)
      const monthlyTrendsRows = await prisma.$queryRaw`
        SELECT to_char(date_trunc('month', r.start_at), 'YYYY-MM') AS month,
               COUNT(r.reservation_id) AS reservation_count
        FROM reservation r
        JOIN meeting_room mr ON r.room_id = mr.room_id
        WHERE 1=1
        ${whereCondition.meeting_room?.department
          ? Prisma.sql`WHERE mr.department = ${whereCondition.meeting_room.department}`
          : Prisma.sql``}
        AND r.start_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
        GROUP BY 1
        ORDER BY 1
      `
      const monthly_trends = monthlyTrendsRows.map(row => ({
        month: row.month,
        reservation_count: Number(row.reservation_count || 0)
      }))

      console.log('📊 Querying daily_usage (last 30 days)...')
      const dailyUsageRows = await prisma.$queryRaw`
        SELECT to_char(r.start_at::date, 'YYYY-MM-DD') AS day,
               COUNT(r.reservation_id) AS reservation_count
        FROM reservation r
        JOIN meeting_room mr ON r.room_id = mr.room_id
        WHERE 1=1
        ${whereCondition.meeting_room?.department
          ? Prisma.sql`WHERE mr.department = ${whereCondition.meeting_room.department}`
          : Prisma.sql``}
        AND r.start_at::date >= (CURRENT_DATE - INTERVAL '29 days')
        GROUP BY 1
        ORDER BY 1
      `
      const daily_usage = dailyUsageRows.map(row => ({
        day: row.day,
        reservation_count: Number(row.reservation_count || 0)
      }))

      console.log('📊 Querying overall average duration (minutes)...')
      const avgDurationRows = await prisma.$queryRaw`
        SELECT AVG(
          CASE 
            WHEN r.start_time IS NOT NULL AND r.end_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (r.end_time - r.start_time)) / 60.0 
            ELSE NULL 
          END
        ) AS avg_duration_minutes
        FROM reservation r
        JOIN meeting_room mr ON r.room_id = mr.room_id
        WHERE 1=1
        ${whereCondition.meeting_room?.department
          ? Prisma.sql`WHERE mr.department = ${whereCondition.meeting_room.department}`
          : Prisma.sql``}
        ${whereCondition.created_at
          ? Prisma.sql` AND r.created_at >= ${whereCondition.created_at.gte} AND r.created_at <= ${whereCondition.created_at.lte}`
          : Prisma.sql``}
      `
      const average_duration_minutes = Array.isArray(avgDurationRows) && avgDurationRows[0]?.avg_duration_minutes !== null
        ? Number(avgDurationRows[0].avg_duration_minutes)
        : null

      // ดึงข้อมูล department_stats สำหรับทั้ง University และ Faculty Executive
      console.log('📊 Querying department_stats...')
      let department_stats = []

      // Executive: ดูได้ทุกคณะ/หน่วยงาน
      try {
        const departmentReservations = await prisma.$queryRaw`
          SELECT 
            mr.department,
            COUNT(r.reservation_id) as reservation_count
          FROM reservation r
          JOIN meeting_room mr ON r.room_id = mr.room_id
          ${whereCondition.created_at ?
            Prisma.sql`WHERE r.created_at >= ${whereCondition.created_at.gte} AND r.created_at <= ${whereCondition.created_at.lte}` :
            Prisma.sql`WHERE 1=1`
          }
          ${whereCondition.meeting_room?.department ?
            Prisma.sql`${whereCondition.created_at ? Prisma.sql` AND ` : Prisma.sql` WHERE `} mr.department = ${whereCondition.meeting_room.department}` :
            Prisma.sql``
          }
          GROUP BY mr.department
          ORDER BY reservation_count DESC
        `

        department_stats = departmentReservations.map(dept => ({
          department: dept.department,
          reservations: Number(dept.reservation_count),
          utilization: Math.min(Math.round((Number(dept.reservation_count) / 30) * 100), 100)
        }))
      } catch (error) {
        console.error('❌ Error querying department_stats:', error)
        department_stats = []
      }
      console.log('✅ department_stats:', department_stats)

      const reports = {
        reservation_summary,
        room_utilization,
        monthly_trends,
        daily_usage,
        department_stats,
        average_duration_minutes
      }

      // Add room details to utilization data
      if (reports.room_utilization.length > 0) {
        const roomIds = reports.room_utilization.map(r => r.room_id).filter(id => id !== null)

        let rooms = []
        if (roomIds.length > 0) {
          rooms = await prisma.meeting_room.findMany({
            where: { room_id: { in: roomIds } },
            select: { room_id: true, room_name: true, department: true }
          })
        }

        reports.room_utilization = reports.room_utilization.map(util => ({
          ...util,
          meeting_room: util.room_id ? rooms.find(room => room.room_id === util.room_id) : {
            room_id: null,
            room_name: 'ไม่ระบุห้อง',
            department: 'ไม่ระบุ'
          }
        }))
      }

      return {
        success: true,
        message: 'รายงานผู้บริหาร',
        executive_type: user.position,
        department: 'ทุกคณะ/หน่วยงาน',
        reports
      }

    } catch (error) {
      console.error('❌ Executive Reports Error:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างรายงาน'
      }
    }
  })

  // ===== Executive Room Overview =====
  .get('/rooms', async ({ request, query, set }) => {
    const user = await authMiddleware(request, set)
    if (user.success === false) return user

    if (!isExecutive(user)) {
      set.status = 403
      return {
        success: false,
        message: 'การเข้าถึงจำกัดเฉพาะผู้บริหารเท่านั้น'
      }
    }

    try {
      let whereCondition = {}

      // Executive ดูได้ทุกห้องในทุกหน่วยงาน
      console.log('🏫 Executive - Room Overview: ทุกหน่วยงาน')

      const rooms = await prisma.meeting_room.findMany({
        where: whereCondition,
        select: {
          room_id: true,
          room_name: true,
          capacity: true,
          location_m: true,
          department: true,
          status_m: true,
          created_at: true
        },
        orderBy: { department: 'asc' }
      })

      return {
        success: true,
        message: 'รายการห้องประชุมสำหรับผู้บริหาร',
        executive_type: user.position,
        accessible_departments: 'ทุกคณะ/หน่วยงาน',
        rooms
      }

    } catch (error) {
      console.error('❌ Executive Rooms Error:', error)
      set.status = 500
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลห้องประชุม'
      }
    }
  })

export default executiveRoutes
