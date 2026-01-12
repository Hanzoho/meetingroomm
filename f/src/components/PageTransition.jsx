'use client'

import { useEffect, useState } from 'react'

export default function PageTransition({ children }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // จำลองการโหลดหน้า
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100) // ลดเวลาให้สั้นลง

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-300">
      {children}
    </div>
  )
}
