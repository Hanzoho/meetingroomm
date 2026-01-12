// ===================================================================
// Email Template Example - ตัวอย่างการใช้งาน Template System
// ===================================================================

import { 
  createEmailTemplate, 
  createAlertBox, 
  createDetailsBox, 
  createButtonGroup,
  emailStyles,
  emailColors 
} from './emailTemplateStyles.js'

// ตัวอย่างการใช้งาน - Officer New Reservation Email
export const getNewReservationTemplateV2 = (reservation, user) => {
  // สร้างข้อมูลวันที่
  const dateDisplay = "23 ม.ค. 2569, 24 ม.ค. 2569 (ทั้งหมด 2 วัน)" // example
  
  // สร้าง content
  const alertBox = createAlertBox("มีการจองใหม่รออนุมัติ", "warning")
  
  const detailsBox = createDetailsBox("รายละเอียดการจอง", {
    "ห้องประชุม": reservation.meeting_room.room_name,
    "ผู้จอง": `${user.first_name} ${user.last_name}`,
    "คณะ": user.department,
    "วันที่จอง": dateDisplay,
    "เวลา": "08:00 - 09:00",
    "วัตถุประสงค์": reservation.details_r || 'ไม่ระบุ'
  })
  
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

// ตัวอย่างการใช้งาน - User Approved Email  
export const getApprovedTemplateV2 = (reservation, user, officer) => {
  const alertBox = createAlertBox("ยินดีด้วย! การจองห้องประชุมของท่านได้รับการอนุมัติเรียบร้อยแล้ว", "success")
  
  const detailsBox = createDetailsBox("รายละเอียดการจองที่ได้รับการอนุมัติ", {
    "ห้องประชุม": reservation.meeting_room.room_name,
    "ผู้จอง": `${user.first_name} ${user.last_name}`,
    "อนุมัติโดย": `${officer?.first_name || ''} ${officer?.last_name || 'เจ้าหน้าที่'}`,
    "วันที่จอง": "23 ม.ค. 2569",
    "เวลา": "08:00 - 09:00",
    "วัตถุประสงค์": reservation.details_r || 'ไม่ระบุ'
  })
  
  const guidelinesBox = `
    <div style="${emailStyles.alertInfo}">
      <p style="margin: 0; color: black; font-size: 14px;">
        <strong>ข้อควรปฏิบัติ:</strong><br>
        • กรุณาเข้าใช้ห้องประชุมตรงเวลาที่กำหนด<br>
        • ดูแลรักษาความสะอาดและอุปกรณ์ในห้องประชุม<br>
        • หากต้องการยกเลิกการจอง กรุณาแจ้งล่วงหน้าอย่างน้อย 2 ชั่วโมง
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
  
  return createEmailTemplate(content, "การจองห้องประชุมได้รับการอนุมัติ", emailColors.success)
}