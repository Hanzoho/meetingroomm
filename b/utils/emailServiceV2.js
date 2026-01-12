// ===================================================================
// Email Service V2 - ใช้ Template System
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

// สร้าง Gmail transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  })
}

// ตรวจสอบโควต้าอีเมลประจำวัน
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

// Helper function สำหรับสร้างข้อมูลวันที่
const formatReservationDates = (reservation) => {
  console.log('🔍 Full Reservation data:', JSON.stringify(reservation, null, 2))
  
  const allDates = []
  
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

  // สร้าง content sections ด้วย Template System
  const alertBox = createAlertBox("มีการจองใหม่รออนุมัติ", "warning")
  
  const detailsData = {
    "ห้องประชุม": reservation.meeting_room.room_name,
    "ผู้จอง": `${user.first_name} ${user.last_name}`,
    "คณะ": user.department,
    "วันที่จอง": dateDisplay,
    "เวลา": `${startTime} - ${endTime}`,
    "วัตถุประสงค์": reservation.details_r || 'ไม่ระบุ'
  }
  const detailsBox = createDetailsBox("รายละเอียดการจอง", detailsData)
  
  const noteBox = `
    <div style="${emailStyles.alertInfo}">
      <p style="margin: 0; color: black; font-size: 14px;">
        <strong>📝 หมายเหตุสำหรับเจ้าหน้าที่:</strong><br>
        • กรุณาตรวจสอบรายละเอียดการจองให้ครบถ้วนก่อนอนุมัติ<br>
        • หากมีข้อสงสัยเพิ่มเติม สามารถติดต่อผู้จองได้โดยตรง<br>
        • ระบบจะส่งการแจ้งเตือนไปยังผู้จองทันทีหลังการอนุมัติ/ปฏิเสธ
      </p>
    </div>
  `
  
  const buttonGroup = createButtonGroup([
    {
      url: `${process.env.FRONTEND_URL}/dashboard/officer/approvals`,
      text: "เข้าสู่ระบบเพื่ออนุมัติการจอง",
      style: emailStyles.buttonSuccess
    }
  ])
  
  const content = alertBox + detailsBox + noteBox + buttonGroup
  
  return createEmailTemplate(content, "การจองห้องประชุมใหม่", emailColors.info)
}

// ส่งอีเมลแจ้งเจ้าหน้าที่เมื่อมีการจองใหม่
const notifyOfficersNewReservation = async (reservationId) => {
  try {
    console.log(`📧 [EMAIL] แจ้งเจ้าหน้าที่ การจองใหม่ ID: ${reservationId}`)
    
    if (!(await checkEmailQuota())) {
      console.log('❌ [EMAIL] เกินโควต้าวันนี้')
      return { success: false, reason: 'quota_exceeded' }
    }

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
    const subject = `การจองใหม่ - ${reservation.meeting_room.room_name}`
    const html = getNewReservationTemplate(reservation, reservation.users)

    for (const officer of officers) {
      try {
        await transporter.sendMail({
          from: `"${process.env.FROM_EMAIL_NAME}" <${process.env.GMAIL_USER}>`,
          to: officer.email,
          subject: subject,
          html: html
        })

        await logEmailSent(officer.email, subject, 'new_reservation')
        console.log(`✅ [EMAIL] ส่งแจ้งเตือนไปยัง: ${officer.email}`)
      } catch (error) {
        console.error(`❌ [EMAIL] ไม่สามารถส่งไปยัง ${officer.email}:`, error.message)
      }
    }

    return { success: true, sentTo: officers.length }
  } catch (error) {
    console.error('❌ [EMAIL] Error:', error)
    return { success: false, error: error.message }
  }
}

// ส่งอีเมลแจ้งผู้จองเมื่อได้รับการอนุมัติ - ใช้ Template System
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

    const dateDisplay = formatReservationDates(reservation)
    const startTime = new Date(reservation.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    const endTime = new Date(reservation.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

    // สร้าง content ด้วย Template System
    const alertBox = createAlertBox("ยินดีด้วย! การจองห้องประชุมของท่านได้รับการอนุมัติเรียบร้อยแล้ว", "success")
    
    const detailsData = {
      "ห้องประชุม": reservation.meeting_room.room_name,
      "ผู้จอง": `${reservation.users.first_name} ${reservation.users.last_name}`,
      "อนุมัติโดย": `${officer?.first_name || ''} ${officer?.last_name || 'เจ้าหน้าที่'}`,
      "วันที่จอง": dateDisplay,
      "เวลา": `${startTime} - ${endTime}`,
      "วัตถุประสงค์": reservation.details_r || 'ไม่ระบุ'
    }
    const detailsBox = createDetailsBox("รายละเอียดการจองที่ได้รับการอนุมัติ", detailsData)
    
    const guidelinesBox = `
      <div style="${emailStyles.alertInfo}">
        <p style="margin: 0; color: black; font-size: 14px;">
          <strong>ข้อควรปฏิบัติ:</strong><br>
          • กรุณาเข้าใช้ห้องประชุมตรงเวลาที่กำหนด<br>
          • ดูแลรักษาความสะอาดและอุปกรณ์ในห้องประชุม<br>
          • หากต้องการยกเลิกการจอง กรุณาแจ้งล่วงหน้าอย่างน้อย 2 ชั่วโมง<br>
          • กรณีไม่มาใช้งานตามเวลาที่จอง อาจส่งผลต่อการจองครั้งต่อไป
        </p>
      </div>
    `
    
    const buttonGroup = createButtonGroup([
      {
        url: `${process.env.FRONTEND_URL}/my-reservations`,
        text: "ดูรายละเอียดการจอง",
        style: emailStyles.buttonPrimary
      }
    ])
    
    const content = alertBox + detailsBox + guidelinesBox + buttonGroup
    const html = createEmailTemplate(content, "การจองห้องประชุมได้รับการอนุมัติ", emailColors.success)

    const transporter = createTransporter()
    const subject = `การจองห้องประชุมได้รับการอนุมัติ - ${reservation.meeting_room.room_name}`

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

// ส่งอีเมลแจ้งผู้จองเมื่อถูกปฏิเสธ - ใช้ Template System
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

    const officer = await prisma.officer.findUnique({
      where: { officer_id: officerId }
    })

    if (!reservation?.users.email) {
      return { success: false, reason: 'no_user_email' }
    }

    const dateDisplay = formatReservationDates(reservation)
    const startTime = new Date(reservation.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    const endTime = new Date(reservation.end_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

    // สร้าง content ด้วย Template System
    const alertBox = createAlertBox("เสียใจด้วย การจองห้องประชุมของท่านไม่สามารถอนุมัติได้ในขณะนี้", "error")
    
    const detailsData = {
      "ห้องประชุม": reservation.meeting_room.room_name,
      "ผู้จอง": `${reservation.users.first_name} ${reservation.users.last_name}`,
      "ปฏิเสธโดย": `${officer?.first_name || ''} ${officer?.last_name || 'เจ้าหน้าที่'}`,
      "วันที่จอง": dateDisplay,
      "เวลา": `${startTime} - ${endTime}`,
      "วัตถุประสงค์": reservation.details_r || 'ไม่ระบุ'
    }
    const detailsBox = createDetailsBox("รายละเอียดการจองที่ไม่ได้รับอนุมัติ", detailsData)
    
    const reasonBox = reason ? `
      <div style="${emailStyles.alertWarning}">
        <h4 style="color: black; margin-top: 0;">เหตุผลที่ไม่อนุมัติ:</h4>
        <p style="margin: 0; color: black; font-size: 14px;">${reason}</p>
      </div>
    ` : ''
    
    const suggestionsBox = `
      <div style="${emailStyles.alertInfo}">
        <p style="margin: 0; color: black; font-size: 14px;">
          <strong>ข้อแนะนำ:</strong><br>
          • ท่านสามารถจองห้องประชุมใหม่ได้ในวันเวลาอื่น<br>
          • หากมีข้อสงสัยเกี่ยวกับการปฏิเสธ กรุณาติดต่อเจ้าหน้าที่โดยตรง<br>
          • ตรวจสอบความพร้อมของห้องประชุมในปฏิทินก่อนทำการจอง<br>
          • หากเป็นการจองเร่งด่วน กรุณาประสานงานล่วงหน้า
        </p>
      </div>
    `
    
    const buttonGroup = createButtonGroup([
      {
        url: `${process.env.FRONTEND_URL}/reserve`,
        text: "จองห้องประชุมใหม่",
        style: emailStyles.buttonPrimary
      },
      {
        url: `${process.env.FRONTEND_URL}/my-reservations`,
        text: "ดูประวัติการจอง",
        style: emailStyles.buttonSecondary
      }
    ])
    
    const content = alertBox + detailsBox + reasonBox + suggestionsBox + buttonGroup
    const html = createEmailTemplate(content, "การจองห้องประชุมไม่ได้รับการอนุมัติ", emailColors.error)

    const transporter = createTransporter()
    const subject = `การจองห้องประชุมไม่ได้รับการอนุมัติ - ${reservation.meeting_room.room_name}`

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
  notifyOfficersNewReservation,
  notifyUserReservationApproved,
  notifyUserReservationRejected,
  checkEmailQuota
}