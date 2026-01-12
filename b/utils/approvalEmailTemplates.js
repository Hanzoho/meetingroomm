// Discord-style approval system email templates

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3580'

export const getSuccessfulRegistrationEmail = (firstName, lastName) => {
  return {
    subject: '🔄 รอการตรวจสอบ - ระบบจองห้องประชุม',
    
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #36393f; color: #dcddde; border-radius: 8px; overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #5865f2 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
          <div style="background-color: rgba(255,255,255,0.1); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; position: relative;">
            <span style="font-size: 40px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">⏳</span>
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: white;">รอการตรวจสอบ</h1>
          <p style="margin: 10px 0 0; font-size: 16px; color: rgba(255,255,255,0.8);">ระบบจองห้องประชุม</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 18px; margin: 0 0 20px; color: #dcddde;">สวัสดี <strong style="color: #5865f2;">${firstName} ${lastName}</strong></p>
          
          <div style="background-color: #2f3136; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #faa61a;">
            <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #ffffff;">
              📝 <strong>คำขอสมัครสมาชิกของคุณได้รับแล้ว!</strong><br>
              <span style="color: #ffffff;">ขณะนี้อยู่ระหว่างการตรวจสอบจากผู้ดูแลระบบ</span>
            </p>
          </div>
          
          <div style="background-color: #2f3136; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #5865f2; font-size: 16px;">📋 ขั้นตอนต่อไป:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #ffffff; line-height: 1.6;">
              <li>ผู้ดูแลระบบจะตรวจสอบข้อมูลของคุณ</li>
              <li>เมื่อได้รับการอนุมัติ คุณจะได้รับอีเมลแจ้งเตือน</li>
              <li>หลังจากนั้นคุณสามารถเข้าใช้งานระบบได้ทันที</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #2f3136; border-radius: 8px; padding: 15px; display: inline-block;">
              <span style="font-size: 14px; color: #b9bbbe;">⚡ ระบบจะแจ้งเตือนคุณทันทีเมื่อได้รับการอนุมัติ</span>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #2f3136; padding: 20px; text-align: center; border-top: 1px solid #40444b;">
          <p style="margin: 0; font-size: 12px; color: #72767d;">
            หากมีข้อสงสัย กรุณาติดต่อผู้ดูแลระบบ<br>
            อีเมลนี้ส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ
          </p>
        </div>
        
      </div>
    `,
    
    text: `
      รอการตรวจสอบ - ระบบจองห้องประชุม
      
      สวัสดี ${firstName} ${lastName}
      
      คำขอสมัครสมาชิกของคุณได้รับแล้ว!
      ขณะนี้อยู่ระหว่างการตรวจสอบจากผู้ดูแลระบบ
      
      ขั้นตอนต่อไป:
      - ผู้ดูแลระบบจะตรวจสอบข้อมูลของคุณ  
      - เมื่อได้รับการอนุมัติ คุณจะได้รับอีเมลแจ้งเตือน
      - หลังจากนั้นคุณสามารถเข้าใช้งานระบบได้ทันที
      
      ระบบจะแจ้งเตือนคุณทันทีเมื่อได้รับการอนุมัติ
      
      หากมีข้อสงสัย กรุณาติดต่อผู้ดูแลระบบ
    `
  }
}

export const getAccountApprovedEmail = (firstName, lastName) => {
  return {
    subject: '✅ อนุมัติแล้ว - เข้าใช้งานระบบได้ทันที!',
    
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #36393f; color: #dcddde; border-radius: 8px; overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #57f287 0%, #00d084 100%); padding: 30px 20px; text-align: center;">
          <div style="background-color: rgba(255,255,255,0.1); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; position: relative;">
            <span style="font-size: 40px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">✅</span>
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: white;">อนุมัติแล้ว!</h1>
          <p style="margin: 10px 0 0; font-size: 16px; color: rgba(255,255,255,0.8);">ยินดีต้อนรับสู่ระบบ</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 18px; margin: 0 0 20px; color: #dcddde;">สวัสดี <strong style="color: #57f287;">${firstName} ${lastName}</strong></p>
          
          <div style="background-color: #2f3136; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #57f287;">
            <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #ffffff;">
              🎉 <strong>ยินดีด้วย! คำขอสมัครสมาชิกของคุณได้รับการอนุมัติแล้ว</strong><br>
              <span style="color: #ffffff;">คุณสามารถเข้าใช้งานระบบจองห้องประชุมได้ทันที</span>
            </p>
          </div>
          
          <div style="background-color: #2f3136; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #57f287; font-size: 16px;">🚀 สิ่งที่คุณสามารถทำได้:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #ffffff; line-height: 1.6;">
              <li>เข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่สมัครไว้</li>
              <li>จองห้องประชุมตามความต้องการ</li>
              <li>จัดการการจองและตรวจสอบสถานะ</li>
              <li>แก้ไขข้อมูลส่วนตัวในโปรไฟล์</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/login" style="background: linear-gradient(135deg, #5865f2 0%, #3b82f6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              🔑 เข้าสู่ระบบ
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #2f3136; padding: 20px; text-align: center; border-top: 1px solid #40444b;">
          <p style="margin: 0; font-size: 12px; color: #72767d;">
            ยินดีต้อนรับสู่ระบบจองห้องประชุม!<br>
            อีเมลนี้ส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ
          </p>
        </div>
        
      </div>
    `,
    
    text: `
      อนุมัติแล้ว - เข้าใช้งานระบบได้ทันที!
      
      สวัสดี ${firstName} ${lastName}
      
      ยินดีด้วย! คำขอสมัครสมาชิกของคุณได้รับการอนุมัติแล้ว
      คุณสามารถเข้าใช้งานระบบจองห้องประชุมได้ทันที
      
      สิ่งที่คุณสามารถทำได้:
      - เข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่สมัครไว้
      - จองห้องประชุมตามความต้องการ
      - จัดการการจองและตรวจสอบสถานะ
      - แก้ไขข้อมูลส่วนตัวในโปรไฟล์
      
      เข้าสู่ระบบ: ${FRONTEND_URL}/login
      
      ยินดีต้อนรับสู่ระบบจองห้องประชุม!
    `
  }
}

export const getAccountRejectedEmail = (firstName, lastName) => {
  return {
    subject: '❌ ไม่สามารถอนุมัติได้ - ระบบจองห้องประชุม',
    
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #36393f; color: #dcddde; border-radius: 8px; overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ed4245 0%, #c53030 100%); padding: 30px 20px; text-align: center;">
          <div style="background-color: rgba(255,255,255,0.1); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; position: relative;">
            <span style="font-size: 40px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">❌</span>
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: white;">ไม่สามารถอนุมัติได้</h1>
          <p style="margin: 10px 0 0; font-size: 16px; color: rgba(255,255,255,0.8);">ระบบจองห้องประชุม</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 18px; margin: 0 0 20px; color: #dcddde;">สวัสดี <strong style="color: #ed4245;">${firstName} ${lastName}</strong></p>
          
          <div style="background-color: #2f3136; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ed4245;">
            <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #dcddde;">
              📋 <strong>เราขออภัยในความไม่สะดวก</strong><br>
              คำขอสมัครสมาชิกของคุณไม่ผ่านการอนุมัติ
            </p>
          </div>
          
          <div style="background-color: #2f3136; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #faa61a; font-size: 16px;">💡 ขั้นตอนต่อไป:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #dcddde; line-height: 1.6;">
              <li>คุณสามารถสมัครสมาชิกใหม่ได้อีกครั้ง</li>
              <li>ตรวจสอบข้อมูลให้ถูกต้องและครบถ้วน</li>
              <li>หากมีข้อสงสัยกรุณาติดต่อผู้ดูแลระบบ</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/register" style="background: linear-gradient(135deg, #5865f2 0%, #3b82f6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              📝 สมัครใหม่อีกครั้ง
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #2f3136; padding: 20px; text-align: center; border-top: 1px solid #40444b;">
          <p style="margin: 0; font-size: 12px; color: #72767d;">
            <strong>หากพบปัญหาหรือข้อสงสัย กรุณาติดต่อผู้ดูแลระบบ</strong><br>
            อีเมลนี้ส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ
          </p>
        </div>
        
      </div>
    `,
    
    text: `
      ไม่สามารถอนุมัติได้ - ระบบจองห้องประชุม
      
      สวัสดี ${firstName} ${lastName}
      
      เราขออภัยในความไม่สะดวก
      คำขอสมัครสมาชิกของคุณไม่สามารถอนุมัติได้ในขณะนี้
      
      ขันตอนต่อไป:
      - คุณสามารถสมัครสมาชิกใหม่ได้อีกครั้ง
      - ตรวจสอบข้อมูลให้ถูกต้องและครบถ้วน  
      - หากมีข้อสงสัยกรุณาติดต่อผู้ดูแลระบบ
      
      สมัครใหม่: ${FRONTEND_URL}/register
      
      หากพบปัญหาหรือข้อสงสัย กรุณาติดต่อผู้ดูแลระบบ
    `
  }
}

export const getNewUserNotificationForAdmin = (firstName, lastName, email, position, department) => {
  return {
    subject: '🔔 มีผู้ใช้ใหม่รอการอนุมัติ - ระบบจองห้องประชุม',
    
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #36393f; color: #dcddde; border-radius: 8px; overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #faa61a 0%, #f57c00 100%); padding: 30px 20px; text-align: center;">
          <div style="background-color: rgba(255,255,255,0.1); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; position: relative;">
            <span style="font-size: 40px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">🔔</span>
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: white;">ผู้ใช้ใหม่รอการอนุมัติ</h1>
          <p style="margin: 10px 0 0; font-size: 16px; color: rgba(255,255,255,0.8);">ระบบจองห้องประชุม</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 18px; margin: 0 0 20px; color: #dcddde;">สวัสดี <strong style="color: #faa61a;">ผู้ดูแลระบบ</strong></p>
          
          <div style="background-color: #2f3136; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #faa61a;">
            <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #dcddde;">
              👤 <strong>มีผู้ใช้ใหม่สมัครเข้าใช้งานระบบ</strong><br>
              กรุณาตรวจสอบและพิจารณาอนุมัติ
            </p>
          </div>
          
          <div style="background-color: #2f3136; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px; color: #faa61a; font-size: 16px;">📋 ข้อมูลผู้สมัคร:</h3>
            <table style="width: 100%; color: #dcddde; line-height: 1.6;">
              <tr><td style="padding: 5px 0;"><strong>ชื่อ-นามสกุล:</strong></td><td style="padding: 5px 0; color: #5865f2;">${firstName} ${lastName}</td></tr>
              <tr><td style="padding: 5px 0;"><strong>อีเมล:</strong></td><td style="padding: 5px 0;">${email}</td></tr>
              <tr><td style="padding: 5px 0;"><strong>ตำแหน่ง:</strong></td><td style="padding: 5px 0;">${position}</td></tr>
              <tr><td style="padding: 5px 0;"><strong>หน่วยงาน:</strong></td><td style="padding: 5px 0;">${department}</td></tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${FRONTEND_URL}/dashboard/admin/users" style="background: linear-gradient(135deg, #5865f2 0%, #3b82f6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              👥 จัดการผู้ใช้
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #2f3136; padding: 20px; text-align: center; border-top: 1px solid #40444b;">
          <p style="margin: 0; font-size: 12px; color: #72767d;">
            กรุณาเข้าสู่ระบบเพื่อจัดการคำขออนุมัติ<br>
            อีเมลนี้ส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ
          </p>
        </div>
        
      </div>
    `,
    
    text: `
      ผู้ใช้ใหม่รอการอนุมัติ - ระบบจองห้องประชุม
      
      สวัสดี ผู้ดูแลระบบ
      
      มีผู้ใช้ใหม่สมัครเข้าใช้งานระบบ
      กรุณาตรวจสอบและพิจารณาอนุมัติ
      
      ข้อมูลผู้สมัคร:
      ชื่อ-นามสกุล: ${firstName} ${lastName}
      อีเมล: ${email}
      ตำแหน่ง: ${position}
      หน่วยงาน: ${department}
      
      จัดการผู้ใช้: ${FRONTEND_URL}/dashboard/admin/users
      
      กรุณาเข้าสู่ระบบเพื่อจัดการคำขออนุมัติ
    `
  }
}