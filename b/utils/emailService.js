// ===================================================================
// Email Service - ระบบส่งอีเมลแจ้งเตือน
// ===================================================================

import nodemailer from 'nodemailer'
import prisma from '../lib/prisma.js'
import {
  createEmailTemplate,
  createAlertBox,
  createDetailsBox,
  createButtonGroup,
  emailStyles,
  emailColors
} from './emailTemplateStyles.js'

// สร้าง Gmail transporter (singleton pattern สำหรับประสิทธิภาพ)
let transporter = null
const createTransporter = () => {
  if (!transporter) {
    console.log('🔧 [EMAIL] Creating new Gmail transporter...')
    console.log(`📧 [EMAIL] Gmail User: ${process.env.GMAIL_USER}`)
    console.log(`🔑 [EMAIL] App Password exists: ${process.env.GMAIL_APP_PASSWORD ? 'YES' : 'NO'}`)
    
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      pool: true, // ใช้ connection pool
      maxConnections: 5, // สูงสุด 5 connections พร้อมกัน
      maxMessages: 100, // ส่งได้สูงสุด 100 อีเมลต่อ connection
      tls: {
        rejectUnauthorized: false // อนุญาต self-signed certificates
      },
      debug: false, // ปิด debug mode - ไม่ต้องการ logs ยาวๆ
      logger: false // ปิด logging - ไม่ต้องการ SMTP details
    })
    
    // ทดสอบ connection เมื่อสร้าง transporter ใหม่
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ [EMAIL] Gmail connection failed:', error.message)
      } else {
        console.log('✅ [EMAIL] Gmail connection verified successfully')
      }
    })
  }
  return transporter
}

// ตรวจสอบโควต้าอีเมลประจำวัน (จำกัด 450/วัน)
const checkEmailQuota = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const emailLogs = await prisma.email_log.findMany({
      where: {
        sent_date: {
          gte: new Date(today),
          lt: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000)
        }
      }
    })

    const sentToday = emailLogs.length
    const maxPerDay = 450

    console.log(`📧 [EMAIL-QUOTA] วันนี้ส่งไป: ${sentToday}/${maxPerDay} อีเมล`)
    return sentToday < maxPerDay
  } catch (error) {
    console.error('❌ [EMAIL-QUOTA] Error:', error)
    return false
  }
}

// บันทึก log การส่งอีเมล
const logEmailSent = async (to, subject, type = 'notification') => {
  try {
    await prisma.email_log.create({
      data: {
        recipient: to,
        subject: subject,
        email_type: type,
        sent_date: new Date(),
        status: 'sent'
      }
    })
  } catch (error) {
    console.error('❌ [EMAIL-LOG] Error:', error)
  }
}

// ฟังก์ชันส่งอีเมลทั่วไป
const sendEmail = async (to, subject, html, text = '') => {
  try {
    console.log(`📧 [SEND-EMAIL] Preparing to send email to: ${to}`)
    
    // ตรวจสอบโควต้า
    const canSend = await checkEmailQuota()
    if (!canSend) {
      throw new Error('เกินโควต้าการส่งอีเมลประจำวัน (450 อีเมล)')
    }

    // สร้าง transporter
    let emailTransporter = createTransporter()

    // ข้อมูลอีเมล
    const mailOptions = {
      from: {
        name: 'ระบบจองห้องประชุม - มหาวิทยาลัยราชภัฏมหาสารคาม',
        address: process.env.GMAIL_USER
      },
      to: to,
      subject: subject,
      html: html,
      text: text || subject // ใช้ subject เป็น text fallback ถ้าไม่มี text
    }

    // ส่งอีเมลพร้อม retry mechanism
    let info
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        console.log(`📧 [SEND-EMAIL] Attempt ${retryCount + 1}/${maxRetries} to send email to: ${to}`)
        info = await emailTransporter.sendMail(mailOptions)
        console.log(`✅ [SEND-EMAIL] Email sent successfully to: ${to}`)
        console.log(`📋 [SEND-EMAIL] Message ID: ${info.messageId}`)
        break // สำเร็จแล้ว ออกจาก loop
      } catch (emailError) {
        retryCount++
        console.error(`❌ [SEND-EMAIL] Attempt ${retryCount} failed:`, emailError.message)
        
        if (retryCount >= maxRetries) {
          throw emailError // ครบจำนวนครั้งแล้ว ให้ throw error
        }
        
        // รอสักครู่ก่อน retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        
        // สร้าง transporter ใหม่สำหรับ retry
        transporter = null // reset global transporter
        emailTransporter = createTransporter() // สร้างใหม่
      }
    }

    // บันทึก log เฉพาะเมื่อส่งสำเร็จ
    try {
      await logEmailSent(to, subject, 'approval')
    } catch (logError) {
      console.error('❌ [SEND-EMAIL] Failed to log email:', logError.message)
      // ไม่ throw error เพื่อไม่ให้ส่งอีเมลสำเร็จแล้วแต่ fail เพราะ log
    }

    return {
      success: true,
      messageId: info.messageId
    }

  } catch (error) {
    console.error(`❌ [SEND-EMAIL] Failed to send email to: ${to}`, error.message)
    console.error(`❌ [SEND-EMAIL] Error details:`, error)
    
    // Return error info แทนการ throw เพื่อให้ API ทำงานต่อได้
    return {
      success: false,
      error: error.message,
      details: error.code || 'UNKNOWN_ERROR'
    }
  }
}

// Helper function สำหรับสร้างข้อมูลวันที่
const formatReservationDates = (reservation) => {
  // ลบ log ที่แสดง Buffer ของรูปภาพออกมา (เยอะเกินไป)
  // console.log('🔍 Full Reservation data:', JSON.stringify(reservation, null, 2))

  const allDates = []

  // ลองหาวันที่จาก field ต่างๆ ที่เป็นไปได้
  if (reservation.booking_dates && Array.isArray(reservation.booking_dates) && reservation.booking_dates.length > 0) {
    console.log('📅 Found booking_dates array:', reservation.booking_dates)
    reservation.booking_dates.forEach(dateStr => {
      const date = new Date(dateStr)
      allDates.push(date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }))
    })
  } else if (typeof reservation.booking_dates === 'string' && reservation.booking_dates.trim() !== '') {
    console.log('📅 Found booking_dates string:', reservation.booking_dates)
    const dateStrings = reservation.booking_dates.split(',').map(d => d.trim())
    dateStrings.forEach(dateStr => {
      const date = new Date(dateStr)
      allDates.push(date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }))
    })
  } else {
    console.log('📅 Using single date from start_at:', reservation.start_at)
    const date = new Date(reservation.start_at)
    allDates.push(date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }))
  }

  console.log('📅 Final dates array:', allDates)

  return allDates.length > 1
    ? `${allDates.join(', ')} (ทั้งหมด ${allDates.length} วัน)`
    : allDates[0]
}

// Template อีเมลแจ้งเจ้าหน้าที่ - ใช้ Template System
const getNewReservationTemplate = (reservation, user) => {
  const dateDisplay = formatReservationDates(reservation)
  const startTime = new Date(reservation.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  const endTime = new Date(reservation.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: black; margin: 0;">การจองห้องประชุมใหม่</h1>
          <p style="color: black; margin: 3px 0 0 0;">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px;">
          <p style="margin: 0; color: black; font-weight: bold;">มีการจองใหม่รออนุมัติ</p>
        </div>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 15px 0;">
          <h3 style="color: black; margin-top: 0; margin-bottom: 15px;">รายละเอียดการจอง</h3>
          
          <div style="display: flex; flex-wrap: wrap; gap: 15px;">
            <div style="flex: 1; min-width: 200px;">
              <p style="margin: 8px 0; color: black;"><strong>ห้องประชุม:</strong> ${reservation.meeting_room.room_name}</p>
              <p style="margin: 8px 0; color: black;"><strong>ผู้จอง:</strong> ${user.first_name} ${user.last_name}</p>
              <p style="margin: 8px 0; color: black;"><strong>คณะ:</strong> ${user.department}</p>
            </div>
            <div style="flex: 1; min-width: 200px;">
              <p style="margin: 8px 0; color: black;"><strong>วันที่จอง:</strong> ${dateDisplay}</p>
              <p style="margin: 8px 0; color: black;"><strong>เวลา:</strong> ${startTime} - ${endTime}</p>
              <p style="margin: 8px 0; color: black;"><strong>วัตถุประสงค์:</strong> ${reservation.details_r || 'ไม่ระบุ'}</p>
            </div>
          </div>
        </div>

    
        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard/officer/approvals" 
             style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            เข้าสู่ระบบเพื่ออนุมัติการจอง
          </a>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.4;">
            <strong>ระบบจองห้องประชุม มหาวิทยาลัยราชภัฏมหาสารคาม</strong><br>
            © 2025 Rajabhat Maha Sarakham University. All rights reserved.<br>
            อีเมลนี้ส่งโดยอัตโนมัติจากระบบ - กرุณาอย่าตอบกลับ<br>
            หากมีปัญหาการใช้งาน กรุณาติดต่อแผนกเทคโนโลยีสารสนเทศ
          </p>
        </div>

      </div>
    </div>
  `
}

// ส่งอีเมลแจ้งเจ้าหน้าที่เมื่อมีการจองใหม่
const notifyOfficersNewReservation = async (reservationId) => {
  try {
    console.log(`📧 [EMAIL] แจ้งเจ้าหน้าที่ การจองใหม่ ID: ${reservationId}`)

    // ตรวจสอบโควต้า
    if (!(await checkEmailQuota())) {
      console.log('❌ [EMAIL] เกินโควต้าวันนี้')
      return { success: false, reason: 'quota_exceeded' }
    }

    // ดึงข้อมูลการจอง
    const reservation = await prisma.reservation.findUnique({
      where: { reservation_id: reservationId },
      include: {
        meeting_room: true,
        users: true
      }
    })

    if (!reservation) {
      throw new Error('ไม่พบการจอง')
    }

    // หาเจ้าหน้าที่ที่มีอีเมล (หน่วยงานตรงกับห้อง)
    const allOfficers = await prisma.officer.findMany({
      where: {
        department: {
          contains: reservation.meeting_room.department
        }
      }
    })

    const officers = allOfficers.filter(officer => officer.email && officer.email.trim() !== '')

    if (officers.length === 0) {
      console.log(`⚠️ [EMAIL] ไม่พบเจ้าหน้าที่ที่มีอีเมล สำหรับ: ${reservation.meeting_room.department}`)
      return { success: false, reason: 'no_officers_email' }
    }

    const transporter = createTransporter()
    const subject = `🔔 การจองใหม่ - ${reservation.meeting_room.room_name}`
    const html = getNewReservationTemplate(reservation, reservation.users)

    // ส่งอีเมลให้เจ้าหน้าที่ทุกคนพร้อมกัน (ใช้ Promise.all เพื่อความเร็ว)
    const emailPromises = officers.map(async (officer) => {
      try {
        await transporter.sendMail({
          from: `"${process.env.FROM_EMAIL_NAME}" <${process.env.GMAIL_USER}>`,
          to: officer.email,
          subject: subject,
          html: html
        })

        await logEmailSent(officer.email, subject, 'new_reservation')
        console.log(`✅ [EMAIL] ส่งแจ้งเตือนไปยัง: ${officer.email}`)
        return { success: true, email: officer.email }
      } catch (error) {
        console.error(`❌ [EMAIL] ไม่สามารถส่งไปยัง ${officer.email}:`, error.message)
        return { success: false, email: officer.email, error: error.message }
      }
    })

    // รอให้ส่งทุกอีเมลเสร็จ (พร้อมกัน)
    const results = await Promise.allSettled(emailPromises)
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length

    return { success: true, sentTo: successCount, total: officers.length }
  } catch (error) {
    console.error('❌ [EMAIL] Error:', error)
    return { success: false, error: error.message }
  }
}

// ส่งอีเมลแจ้งผู้จองเมื่อได้รับการอนุมัติ
const notifyUserReservationApproved = async (reservationId, officerId) => {
  try {
    console.log(`📧 [EMAIL] แจ้งผู้จอง การอนุมัติ ID: ${reservationId}`)

    if (!(await checkEmailQuota())) {
      return { success: false, reason: 'quota_exceeded' }
    }

    const reservation = await prisma.reservation.findUnique({
      where: { reservation_id: reservationId },
      include: { meeting_room: true, users: true }
    })

    const officer = await prisma.officer.findUnique({
      where: { officer_id: officerId }
    })

    if (!reservation?.users.email) {
      return { success: false, reason: 'no_user_email' }
    }

    // สร้างข้อมูลวันที่
    const allDates = []
    if (reservation.booking_dates && Array.isArray(reservation.booking_dates) && reservation.booking_dates.length > 0) {
      reservation.booking_dates.forEach(dateStr => {
        const date = new Date(dateStr)
        allDates.push(date.toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }))
      })
    } else if (typeof reservation.booking_dates === 'string' && reservation.booking_dates.trim() !== '') {
      const dateStrings = reservation.booking_dates.split(',').map(d => d.trim())
      dateStrings.forEach(dateStr => {
        const date = new Date(dateStr)
        allDates.push(date.toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }))
      })
    } else {
      const date = new Date(reservation.start_at)
      allDates.push(date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }))
    }

    const dateDisplay = allDates.length > 1
      ? `${allDates.join(', ')} (ทั้งหมด ${allDates.length} วัน)`
      : allDates[0]

    const startTime = new Date(reservation.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    const endTime = new Date(reservation.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

    const transporter = createTransporter()
    const subject = `การจองห้องประชุมได้รับการอนุมัติ - ${reservation.meeting_room.room_name}`
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>การจองได้รับการอนุมัติ</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; background-color: #f5f5f5; line-height: 1.5;">
      
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px;">
        
        <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #333; text-align: center;">รายการจองได้รับการอนุมัติแล้ว</h2>
        
        <div style="background: #f8f8f8; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">รายละเอียดการจอง</h3>
          
          <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>ห้องประชุม:</strong> ${reservation.meeting_room.room_name}</p>
          <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>ผู้จอง:</strong> ${reservation.users.first_name} ${reservation.users.last_name}</p>
          <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>อนุมัติโดย:</strong> ${officer?.first_name || ''} ${officer?.last_name || 'เจ้าหน้าที่'}</p>
          <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>วันที่จอง:</strong> ${dateDisplay}</p>
          <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>เวลา:</strong> ${startTime} - ${endTime}</p>
          <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>วัตถุประสงค์:</strong> ${reservation.details_r || 'ไม่ระบุ'}</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/my-reservations" 
             style="display: inline-block; background: #5865f2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px;">
            ดูรายละเอียด
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 5px 0; line-height: 1.4;">
            <strong>ระบบจองห้องประชุม มหาวิทยาลัยราชภัฏมหาสารคาม</strong><br>
            © 2025 Rajabhat Maha Sarakham University. All rights reserved.<br>
            อีเมลนี้ส่งโดยอัตโนมัติจากระบบ - กรุณาอย่าตอบกลับ<br>
            หากมีปัญหาการใช้งาน กรุณาติดต่อแผนกเทคโนโลยีสารสนเทศ
          </p>  
        </div>

      </div>

    </body>
    </html>
    `

    await transporter.sendMail({
      from: `"${process.env.FROM_EMAIL_NAME}" <${process.env.GMAIL_USER}>`,
      to: reservation.users.email,
      subject: subject,
      html: html  
    })

    await logEmailSent(reservation.users.email, subject, 'reservation_approved')
    console.log(`✅ [EMAIL] ส่งแจ้งการอนุมัติไปยัง: ${reservation.users.email}`)

    return { success: true }
  } catch (error) {
    console.error('❌ [EMAIL] Error:', error)
    return { success: false, error: error.message }
  }
}

// ส่งอีเมลแจ้งผู้จองเมื่อถูกปฏิเสธ
const notifyUserReservationRejected = async (reservationId, officerId, reason = null) => {
  try {
    console.log(`📧 [EMAIL] แจ้งผู้จอง การปฏิเสธ ID: ${reservationId}`)

    if (!(await checkEmailQuota())) {
      return { success: false, reason: 'quota_exceeded' }
    }

    const reservation = await prisma.reservation.findUnique({
      where: { reservation_id: reservationId },
      include: { meeting_room: true, users: true }
    })

    if (!reservation?.users.email) {
      return { success: false, reason: 'no_user_email' }
    }

    const officer = await prisma.officer.findUnique({
      where: { officer_id: officerId }
    })

    // สร้างข้อมูลวันที่
    const allDates = []
    if (reservation.booking_dates && Array.isArray(reservation.booking_dates) && reservation.booking_dates.length > 0) {
      reservation.booking_dates.forEach(dateStr => {
        const date = new Date(dateStr)
        allDates.push(date.toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }))
      })
    } else if (typeof reservation.booking_dates === 'string' && reservation.booking_dates.trim() !== '') {
      const dateStrings = reservation.booking_dates.split(',').map(d => d.trim())
      dateStrings.forEach(dateStr => {
        const date = new Date(dateStr)
        allDates.push(date.toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }))
      })
    } else {
      const date = new Date(reservation.start_at)
      allDates.push(date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }))
    }

    const dateDisplay = allDates.length > 1
      ? `${allDates.join(', ')} (ทั้งหมด ${allDates.length} วัน)`
      : allDates[0]

    const startTime = new Date(reservation.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    const endTime = new Date(reservation.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

    const transporter = createTransporter()
    const subject = `การจองห้องประชุมไม่ได้รับการอนุมัติ - ${reservation.meeting_room.room_name}`
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>การจองไม่ได้รับการอนุมัติ</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; background-color: #f5f5f5; line-height: 1.5;">
      
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px;">
        
        <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #333; text-align: center;">รายการจองไม่ได้รับการอนุมัติ</h2>
        
        <div style="background: #f8f8f8; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">รายละเอียดการจองที่ไม่ได้รับอนุมัติ</h3>
          
          <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>ห้องประชุม:</strong> ${reservation.meeting_room.room_name}</p>
          <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>ผู้จอง:</strong> ${reservation.users.first_name} ${reservation.users.last_name}</p>
          <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>ปฏิเสธโดย:</strong> ${officer?.first_name || ''} ${officer?.last_name || 'เจ้าหน้าที่'}</p>
          <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>วันที่จอง:</strong> ${dateDisplay}</p>
          <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>เวลา:</strong> ${startTime} - ${endTime}</p>
          <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>วัตถุประสงค์:</strong> ${reservation.details_r || 'ไม่ระบุ'}</p>
        </div>

        ${reason ? `
        <div style="background: #fef2f2; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 3px solid #ef4444;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">เหตุผลที่ปฏิเสธ:</h3>
          <p style="margin: 0; color: #333; font-size: 14px;">${reason}</p>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/my-reservations" 
             style="display: inline-block; background: #5865f2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px;">
            ดูรายละเอียด
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 5px 0; line-height: 1.4;">
            <strong>ระบบจองห้องประชุม มหาวิทยาลัยราชภัฏมหาสารคาม</strong><br>
            © 2025 Rajabhat Maha Sarakham University. All rights reserved.<br>
            อีเมลนี้ส่งโดยอัตโนมัติจากระบบ - กรุณาอย่าตอบกลับ<br>
            หากมีปัญหาการใช้งาน กรุณาติดต่อแผนกเทคโนโลยีสารสนเทศ
          </p>
        </div>

      </div>

    </body>
    </html>
    `

    await transporter.sendMail({
      from: `"${process.env.FROM_EMAIL_NAME}" <${process.env.GMAIL_USER}>`,
      to: reservation.users.email,
      subject: subject,
      html: html
    })

    await logEmailSent(reservation.users.email, subject, 'reservation_rejected')
    console.log(`✅ [EMAIL] ส่งแจ้งการปฏิเสธไปยัง: ${reservation.users.email}`)

    return { success: true }
  } catch (error) {
    console.error('❌ [EMAIL] Error:', error)
    return { success: false, error: error.message }
  }
}

export {
  sendEmail,
  notifyOfficersNewReservation,
  notifyUserReservationApproved,
  notifyUserReservationRejected,
  checkEmailQuota
}
