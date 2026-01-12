'use client'

import React, { useState, useCallback } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import Footer from './Footer'

export default function DashboardLayout({ user, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false) // เริ่มต้นปิดสำหรับมือถือ
  
  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false)
  }, [])
  
  const handleMenuClick = useCallback(() => {
    setSidebarOpen(!sidebarOpen)
  }, [sidebarOpen])

  // ถ้าไม่มี user หรือ user ยังเป็น dummy object ให้แสดง children เลย (ให้แต่ละหน้าจัดการ loading เอง)
  if (!user || (user.user_id === 0 && user.role === 'user')) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" key={`dashboard-${user.user_id}-${user.role}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-[55] bg-black bg-opacity-50 lg:hidden"
          onClick={handleSidebarClose}
        />
      )}

      {/* Sidebar - Fixed position for both desktop and mobile */}
      <div className={`
        fixed top-0 left-0 h-full ${sidebarOpen ? 'z-[60]' : 'z-40'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        transition-transform duration-300 ease-in-out lg:transition-none
      `}>
        <Sidebar 
          user={user} 
          isOpen={sidebarOpen} 
          onToggle={handleMenuClick} 
          onClose={handleSidebarClose}
        />
      </div>

      {/* Main Content with proper spacing for fixed sidebar */}
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Top Bar */}
        <TopBar 
          key={`topbar-${user.user_id}-${user.role}`}
          user={user} 
          onMenuClick={handleMenuClick} 
        />

        {/* Page Content - ให้ขยายเต็มพื้นที่ */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>

        {/* Footer - จะอยู่ด้านล่างสุดเสมอ */}
        <Footer />
      </div>
    </div>
  )
}
