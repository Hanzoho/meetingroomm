// Debug Utility สำหรับ Backend
export const debugLog = {
  log: (...args) => {
    if (process.env.ENABLE_DEBUG === 'true') {
      console.log(...args)
    }
  },
  
  error: (...args) => {
    if (process.env.ENABLE_DEBUG === 'true') {
      console.error(...args)
    }
  },
  
  warn: (...args) => {
    if (process.env.ENABLE_DEBUG === 'true') {
      console.warn(...args)
    }
  },
  
  info: (...args) => {
    if (process.env.ENABLE_DEBUG === 'true') {
      console.info(...args)
    }
  }
}

// สำหรับ Production - แสดงเฉพาะ error ที่จำเป็น
export const prodLog = {
  // แสดงเฉพาะ error ที่สำคัญ
  criticalError: (...args) => {
    console.error('System Error:', ...args)
  },
  
  // Security logs ที่ควรเก็บใน production
  security: (...args) => {
    console.log('Security:', ...args)
  },
  
  // ไม่แสดงอะไรเลยใน production
  silent: () => {}
}
