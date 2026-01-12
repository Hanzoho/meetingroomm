// ===================================================================
// ระบบจองห้องประชุม - Main Backend Server
// ===================================================================
// ไฟล์หลักของ Backend API Server ใช้:
// - Bun Runtime + Elysia Framework
// - PostgreSQL Database ผ่าน Prisma ORM
// - JWT Authentication with Role-based Access
// 
// API Routes:
// - /api/auth/*      - สมัครสมาชิก/เข้าสู่ระบบ (routes/auth.js)
// - /api/protected/* - APIs ที่ต้อง authentication (routes/protected.js)
// ===================================================================

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
// import { staticPlugin } from '@elysiajs/static' // ไม่ใช้แล้ว
import 'dotenv/config'
import prisma from './lib/prisma.js'  // ใช้สำหรับ database connection test

// ===== Import API Routes =====
import { authRoutes } from './routes/auth.js'        // สมัครสมาชิก/เข้าสู่ระบบ
import { protectedRoutes, officerRoutes, adminAreaRoutes } from './routes/protected.js' // APIs ที่ต้อง authentication
import { roomRoutes, officerRoomRoutes } from './routes/rooms.js' // APIs จัดการห้องประชุม
import { adminRoutes } from './routes/admin.js' // Admin APIs (3-table system)
import executiveRoutes from './routes/executive.js' // Executive APIs
import { departmentRoutes } from './routes/departments.js' // Department APIs
import positionRoutes from './routes/positions.js' // Position APIs
import { reservationRoutes, userReservationRoutes, officerReservationRoutes } from './routes/reservations.js' // Reservation APIs
import { addressRoutes } from './routes/address.js' // Address APIs (จังหวัด, อำเภอ, ตำบล)
import { uploadRoutes, publicUploadRoutes } from './routes/upload.js' // Upload APIs (รูปโปรไฟล์, รูปห้องประชุม)
import { notificationRoutes } from './routes/notifications.js' // Notification APIs (แจ้งเตือนการจอง)

// Configuration
const PORT = process.env.PORT || 8000
const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3580'
// สร้าง Elysia app
const app = new Elysia()

// ตั้งค่า CORS
app.use(cors({
  origin: [
    frontendURL,
  ], // Support both common frontend ports
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
}))

// Static file serving ไม่ใช้แล้ว - รูปเก็บใน database
// app.use(staticPlugin({
//   assets: 'uploads',
//   prefix: '/uploads'
// }))

// Global Error Handler (จัดการ error ครั้งเดียว)
app.onError(({ code, error, set }) => {
  console.error('API Error:', error)

  if (code === 'NOT_FOUND') {
    set.status = 404
    return { error: 'ไม่พบ endpoint ที่ต้องการ' }
  }

  set.status = 500
  return { error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }
})

// Routes พื้นฐาน
app.get('/', () => {
  return {
    message: 'ระบบจองห้องประชุม API',
    status: 'running',
    timestamp: new Date().toISOString()
  }
})

// Health check endpoint
app.get('/health', async () => {
  let databaseStatus = 'disconnected'
  let databaseInfo = null

  try {
    // ทดสอบ query เบาๆ
    await prisma.$queryRaw`SELECT 1`
    databaseStatus = 'connected'

    // ลองนับข้อมูลเบาๆ
    const roomCount = await prisma.meeting_room.count()
    databaseInfo = { tables_accessible: true, room_count: roomCount }
  } catch (error) {
    databaseStatus = 'error'
    databaseInfo = { error: error.message }
  }

  return {
    status: 'healthy',
    database: databaseStatus,
    database_info: databaseInfo,
    server_time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  }
})

// API Routes
app.group('/api', app => app
  .get('/test', () => ({ message: 'API ทำงานได้แล้ว!' }))
  // Simple database test (ไม่ต้อง authentication)
  .get('/test-db', async () => {
    try {
      const roomCount = await prisma.meeting_room.count()
      const reservationCount = await prisma.reservation.count()
      const userCount = await prisma.users.count()

      return {
        success: true,
        message: 'Database ทำงานได้แล้ว!',
        data: {
          rooms: roomCount,
          reservations: reservationCount,
          users: userCount
        }
      }
    } catch (error) {
      console.error('Database test error:', error)
      return {
        success: false,
        message: 'Database ไม่ทำงาน',
        error: error.message
      }
    }
  })
  .use(authRoutes) // Authentication APIs: /api/auth/register, /api/auth/login
  .use(uploadRoutes) // Upload APIs: /api/upload/profile-image, /api/upload/room-image
  .use(publicUploadRoutes) // Public Upload APIs: /api/upload/profile-image/:userId (no auth needed)
  .use(roomRoutes) // Room APIs: /api/rooms/*
  .use(positionRoutes) // Position APIs: /api/positions/*
  .use(departmentRoutes) // Department APIs: /api/departments/*
  .use(addressRoutes) // Address APIs: /api/address/* (จังหวัด, อำเภอ, ตำบล)
  .use(reservationRoutes) // Reservation APIs: /api/reservations/*
  .use(protectedRoutes) // Protected APIs: /api/protected/*
  .use(userReservationRoutes) // User Reservation APIs: /api/protected/reservations/*
  .use(officerRoutes) // Officer APIs: /api/protected/officer/*
  .use(officerReservationRoutes) // Officer Reservation APIs: /api/protected/officer/reservations/*
  .use(adminAreaRoutes) // Admin Area API: /api/protected/admin/area
  .use(officerRoomRoutes) // Officer Room Management APIs: /api/protected/officer/rooms/*
  .use(adminRoutes) // Admin Role Management APIs (3-table): /api/protected/admin/*
  .use(executiveRoutes) // Executive APIs: /api/protected/executive/*
  .use(notificationRoutes) // Notification APIs: /api/protected/notifications/*
)

// ฟังก์ชันเริ่มต้นเซิร์ฟเวอร์
async function startServer() {
  try {
    // ทดสอบการเชื่อมต่อฐานข้อมูลก่อน
    console.log('🔍 กำลังทดสอบการเชื่อมต่อฐานข้อมูล...')
    await prisma.$connect()
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ')

  } catch (error) {
    console.error('❌ ไม่สามารถเชื่อมต่อฐานข้อมูล:', error.message)
    console.log('📝 จะเริ่มเซิร์ฟเวอร์โดยไม่มีฐานข้อมูล (สำหรับ debug)')
  }

  console.log(`🚀 Server เริ่มทำงานที่ port ${PORT}`)
  console.log(`📚 API Docs: http://localhost:${PORT}`)
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`)
}

// เริ่ม Elysia server (สำหรับ Bun ให้ runtime จัดการ)
// app.listen(PORT) // ปิดการใช้งาน - ให้ Bun runtime จัดการ

// จัดการการปิดระบบอย่างสะอาด
process.on('SIGINT', async () => {
  console.log('🛑 กำลังปิดระบบ...')
  try {
    await prisma.$disconnect()
    console.log('✅ ปิดการเชื่อมต่อฐานข้อมูลเรียบร้อย')
  } catch (error) {
    console.log('⚠️ ปิดการเชื่อมต่อฐานข้อมูลไม่สำเร็จ')
  }
  console.log('✅ ปิดระบบเรียบร้อย')
  process.exit(0)
})

// เริ่มเซิร์ฟเวอร์
startServer()

export default app
