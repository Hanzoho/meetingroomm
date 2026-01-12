// ===================================================================
// Email Utilities - ฟังก์ชันส่งอีเมลรีเซ็ตรหัสผ่าน
// ===================================================================

import nodemailer from 'nodemailer'

// สร้าง transporter สำหรับส่งอีเมล
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // ใช้ Gmail SMTP
    auth: {
      user: process.env.EMAIL_USER, // อีเมลที่ใช้ส่ง
      pass: process.env.EMAIL_PASSWORD // App Password ของ Gmail
    }
  })
}

// ฟังก์ชันส่งอีเมลรีเซ็ตรหัสผ่าน
export const sendResetEmail = async (email, resetToken) => {
  try {
    console.log('📧 เริ่มส่งอีเมลรีเซ็ตรหัสผ่านไปยัง:', email)

    // ตรวจสอบ environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('⚠️ ไม่พบการตั้งค่าอีเมล (EMAIL_USER หรือ EMAIL_PASSWORD)')
      console.log('📧 [DEVELOPMENT] Reset URL:', `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`)
      
      return {
        success: true, // return success เพื่อไม่ให้ระบบหยุดทำงาน
        message: 'Email configuration not set (development mode)',
        dev_info: {
          reset_url: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
        }
      }
    }

    const transporter = createTransporter()
    
    // URL สำหรับรีเซ็ตรหัสผ่าน
    const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    
    const mailOptions = {
      from: {
        name: 'ระบบจองห้องประชุม',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: 'รีเซ็ตรหัสผ่าน - ระบบจองห้องประชุม',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🔐 รีเซ็ตรหัสผ่าน</h1>
              <p style="color: #64748b; margin: 10px 0 0 0; font-size: 16px;">ระบบจองห้องประชุม</p>
            </div>

            <!-- Content -->
            <div style="margin-bottom: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                สวัสดีครับ/ค่ะ
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                คุณได้ขอรีเซ็ตรหัสผ่านสำหรับบัญชี: <strong style="color: #2563eb;">${email}</strong>
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:
              </p>
            </div>

            <!-- Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetURL}" 
                 style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); 
                        color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; 
                        font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                        transition: all 0.3s ease;">
                🔑 รีเซ็ตรหัสผ่าน
              </a>
            </div>

            <!-- Alternative Link -->
            <div style="margin: 20px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #2563eb;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">
                หากปุ่มด้านบนไม่ทำงาน กรุณาคัดลอกลิงก์ด้านล่างไปวางในเบราว์เซอร์:
              </p>
              <p style="word-break: break-all; color: #2563eb; font-size: 14px; margin: 0;">
                ${resetURL}
              </p>
            </div>

            <!-- Warning -->
            <div style="margin: 30px 0; padding: 15px; background-color: #fef3cd; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
                ⚠️ <strong>ข้อควรระวัง:</strong><br>
                • ลิงก์นี้จะหมดอายุใน <strong>1 ชั่วโมง</strong><br>
                • หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้<br>
                • อย่าแชร์ลิงก์นี้กับผู้อื่น
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ระบบจองห้องประชุม - ส่งอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้
              </p>
            </div>

          </div>
        </div>
      `
    }

    const result = await transporter.sendMail(mailOptions)
    
    console.log('✅ ส่งอีเมลรีเซ็ตรหัสผ่านสำเร็จ:', {
      messageId: result.messageId,
      to: email
    })

    return {
      success: true,
      messageId: result.messageId
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการส่งอีเมล:', error)
    
    return {
      success: false,
      error: error.message
    }
  }
}

// ฟังก์ชันทดสอบการตั้งค่าอีเมล
export const testEmailConnection = async () => {
  try {
    const transporter = createTransporter()
    await transporter.verify()
    console.log('✅ การตั้งค่าอีเมลถูกต้อง')
    return true
  } catch (error) {
    console.error('❌ การตั้งค่าอีเมลไม่ถูกต้อง:', error.message)
    return false
  }
}