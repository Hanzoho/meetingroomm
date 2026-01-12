// Debug Utility สำหรับควบคุม console.log ใน production
export const debugLog = {
  log: (...args) => {
    if (process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true') {
      console.log(...args)
    }
  },
  
  error: (...args) => {
    if (process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true') {
      // ไม่ log credential errors และ validation errors ที่เป็นปกติ
      const errorMessage = args.join(' ')
      if (errorMessage.includes('Unauthorized') || 
          errorMessage.includes('อีเมลหรือรหัสผ่านไม่ถูกต้อง') ||
          errorMessage.includes('Invalid credentials') ||
          errorMessage.includes('อีเมลนี้ถูกใช้งานแล้ว') ||
          errorMessage.includes('เลขบัตรประชาชนนี้ถูกใช้งานแล้ว') ||
          errorMessage.includes('409') ||
          errorMessage.includes('Conflict')) {
        return // ไม่ log validation errors ที่จัดการแล้วใน UI
      }
      console.error(...args)
    }
  },
  
  warn: (...args) => {
    if (process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true') {
      console.warn(...args)
    }
  },
  
  info: (...args) => {
    if (process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true') {
      console.info(...args)
    }
  },

  // สำหรับ login attempts - แสดงเฉพาะใน development
  loginAttempt: (data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Login attempt with:', { 
        email: data.email, 
        password: '***' // ซ่อนรหัสผ่านจริง
      })
    }
  }
}

// สำหรับ Production - แสดงเฉพาะ error ที่จำเป็น
export const prodLog = {
  // แสดงเฉพาะ error ที่สำคัญ
  criticalError: (...args) => {
    console.error('System Error:', ...args)
  },
  
  // ไม่แสดงอะไรเลยใน production
  silent: () => {}
}
