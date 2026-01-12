'use client'

import React, { useState, useEffect, useRef } from 'react'
import { authUtils } from '@/lib/fetchData'
import Link from 'next/link'
import { UnifiedRoomCard } from '@/components/UnifiedRoomCard'
import UserRoomDetailModal from '@/components/UserRoomDetailModal'
import { ReportProblemModal } from '@/components/ReportProblemModal'
import { CustomAlert } from '@/components/ui/custom-alert'

// 🔍 Smart Search Custom Select Component - นำมาจากหน้าจองห้องประชุม
function SmartCustomSelect({ value, onChange, options, className, placeholder, required, label }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSelect = (selectedValue) => {
    onChange({ target: { value: selectedValue } })
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleToggle = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearchTerm('')
    }
  }

  // ✨ Smart search function
  const smartSearch = (searchTerm, optionLabel) => {
    if (!searchTerm) return true
    
    const search = searchTerm.toLowerCase().trim()
    const label = optionLabel.toLowerCase()
    
    // 1. ค้นหาแบบ exact match ก่อน
    if (label.includes(search)) {
      return true
    }
    
    // 2. ลบคำที่ไม่จำเป็นและค้นหา
    const cleanSearch = search
      .replace(/ห้อง/g, '')
      .replace(/ประชุม/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    
    if (cleanSearch && cleanSearch.length >= 2 && label.includes(cleanSearch)) {
      return true
    }
    
    return false
  }

  // Filter options based on smart search
  const filteredOptions = options.filter(option => 
    smartSearch(searchTerm, option.label)
  )

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={handleToggle}
        className={className}
        required={required}
        style={{
          backgroundImage: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none'
        }}
      >
        <span className="block truncate text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-green-200 rounded-xl shadow-lg z-50 max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 ค้นหา..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm text-gray-900 placeholder-gray-500 bg-white"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          {/* Options List */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-3 text-left hover:bg-green-50 hover:text-green-800 transition-colors duration-150 ${
                    index === filteredOptions.length - 1 ? 'rounded-b-xl' : ''
                  } ${
                    value === option.value ? 'bg-green-50 text-green-800 font-medium' : 'text-gray-900'
                  }`}
                >
                  <span className={`${value === option.value ? 'text-green-800' : 'text-gray-900'}`}>
                    {option.label}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-gray-500">
                <span className="text-2xl mb-2 block">🔍</span>
                <p>ไม่พบรายการที่ตรงกับ "{searchTerm}"</p>
                <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหาหรือตรวจสอบการสะกด</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}



// Search and Filter Component
function SearchAndFilter({ filters, onFilterChange, departments }) {
  // 🔍 Smart search function สำหรับค้นหาชื่อห้อง
  const [searchQuery, setSearchQuery] = useState(filters.search || '')
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || '')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Update filters when debounced search changes
  useEffect(() => {
    onFilterChange({ ...filters, search: debouncedSearch })
  }, [debouncedSearch])

  // Smart search for room names - เหมือนหน้าจองห้องประชุม
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  // Format departments for dropdown
  const departmentOptions = [
    { value: '', label: '-- ทุกหน่วยงาน --' },
    ...departments.map(dept => ({ value: dept, label: dept }))
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6 mb-6 lg:mb-8">
      <div className="mb-4 lg:mb-6">
        <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-2 flex items-center">
          <span className="text-2xl lg:text-3xl mr-2 lg:mr-3">🔍</span>
          ค้นหาและกรองห้องประชุม
        </h2>
        <p className="text-gray-600 text-sm lg:text-base">
          ใช้ตัวกรองด้านล่างเพื่อค้นหาห้องประชุมที่เหมาะสม
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Smart Search Input */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ค้นหาชื่อห้อง
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหาชื่อห้อง"
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 text-gray-900 bg-white text-sm lg:text-base"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <span className="text-gray-400 text-lg">🔍</span>
            </div>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setDebouncedSearch('')
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                title="ล้างการค้นหา"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Smart Department Filter */}
        <div className="lg:col-span-1">
          <SmartCustomSelect
            value={filters.department || ''}
            onChange={(e) => onFilterChange({ ...filters, department: e.target.value })}
            options={departmentOptions}
            label="หน่วยงาน"
            placeholder="-- ทุกหน่วยงาน --"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 text-gray-900 bg-white text-sm lg:text-base relative"
          />
        </div>

        {/* Capacity Filter */}
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ความจุขั้นต่ำ (คน)
          </label>
          <input
            type="number"
            min="1"
            max="500"
            placeholder="เช่น 10"
            value={filters.minCapacity || ''}
            onChange={(e) => {
              const value = e.target.value
              // ตรวจสอบว่าเป็นตัวเลขที่ถูกต้อง
              if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 500)) {
                onFilterChange({ ...filters, minCapacity: value })
              }
            }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 text-gray-900 bg-white text-sm lg:text-base"
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 ระบุจำนวนคนขั้นต่ำที่ต้องการ (1-500 คน)
          </p>
        </div>
      </div>
    </div>
  )
}

// Rooms Display Component - ใช้แค่ Grid View
function RoomsDisplay({ rooms, onViewDetails, onReportProblem }) {
  if (rooms.length === 0) {
    return (
      <div className="text-center py-12 lg:py-16">
        <div className="text-6xl lg:text-8xl mb-4">🔍</div>
        <h3 className="text-xl lg:text-2xl font-bold text-gray-800 mb-2">ไม่พบห้องประชุม</h3>
        <p className="text-gray-600 text-sm lg:text-base">ลองปรับเกณฑ์การค้นหาใหม่</p>
      </div>
    )
  }

  // ใช้ UnifiedRoomCard ในโหมด User
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
      {rooms.map((room, index) => (
        <UnifiedRoomCard 
          key={`room-card-${room.id || index}`} 
          room={room}
          mode="user"
          onViewDetails={onViewDetails}
          onReportProblem={onReportProblem}
        />
      ))}
    </div>
  )
}

// Main Room Directory Page Component
export default function RoomDirectoryPage() {
  const [rawRooms, setRawRooms] = useState([]) // ห้องทั้งหมดจาก API
  const [rooms, setRooms] = useState([]) // ห้องที่ถูกกรองแล้ว
  const [departments, setDepartments] = useState([])
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    minCapacity: ''
  })

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(6) // 6 cards per page (2 rows x 3 cols)

  // 🔍 Modal States for Room Details
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [detailModalOpening, setDetailModalOpening] = useState(false)
  const [detailModalClosing, setDetailModalClosing] = useState(false)

  // 📝 Modal States for Report Problem
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedRoomForReport, setSelectedRoomForReport] = useState(null)



  // 🎯 Handle View Details - เปิด Modal
  const handleViewDetails = (room) => {
    setSelectedRoom(room)
    setDetailModalOpening(true)
    setShowDetailModal(true)

    // Animation timing
    setTimeout(() => {
      setDetailModalOpening(false)
    }, 50)
  }

  // 📝 Handle Report Problem - เปิด Modal รายงานปัญหา
  const handleReportProblem = (room) => {
    setSelectedRoomForReport(room)
    setShowReportModal(true)
  }

  // 📝 Handle Submit Report - ส่งรายงานปัญหา
  const handleSubmitReport = async (room, reportText) => {
    try {
      const token = localStorage.getItem('token')
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/reservations/report-problem`
      
      console.log('🔍 Submitting report to:', apiUrl)
      console.log('🔍 Request data:', {
        room_id: room.room_id,
        comment: reportText
      })
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          room_id: room.room_id,
          comment: reportText
        })
      })

      console.log('🔍 Response status:', response.status)
      console.log('🔍 Response ok:', response.ok)
      
      const result = await response.json()
      console.log('🔍 Response data:', result)
      
      if (result.success) {
        // แสดงข้อความสำเร็จแบบสวยงาม
        showReportSuccessAnimation(`รายงานสำเร็จ!\n\nห้อง: ${room.room_name}\nเจ้าหน้าที่จะดำเนินการตรวจสอบในเร็วๆ นี้`)
      } else {
        throw new Error(result.message || 'ส่งรายงานไม่สำเร็จ')
      }
    } catch (error) {
      console.error('❌ Error submitting report:', error)
      // แสดงข้อความเกิดข้อผิดพลาดแบบสวยงาม
      showReportErrorAnimation(`เกิดข้อผิดพลาดในการส่งรายงาน: ${error.message}`)
      throw error
    }
  }

  // 🎉 Show Success Animation สำหรับรายงานปัญหา
  const showReportSuccessAnimation = (message) => {
    // สร้าง overlay สำหรับ backdrop พร้อม advanced blur effects 🎨
    const overlay = document.createElement('div')
    overlay.className = 'fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-lg backdrop-saturate-150'
    overlay.style.cssText = `
      background: linear-gradient(135deg, 
        rgba(0, 0, 0, 0.4) 0%, 
        rgba(0, 0, 0, 0.2) 50%, 
        rgba(0, 0, 0, 0.3) 100%
      );
      animation: backdropFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    `

    // สร้าง success modal ตามธีมที่เพื่อนใช้
    const successDiv = document.createElement('div')
    successDiv.className = 'relative max-w-md w-full mx-4 overflow-hidden border-2 border-green-200 bg-white rounded-2xl shadow-2xl'
    successDiv.style.cssText = `
      animation: modalSlideIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    `
    
    successDiv.innerHTML = `
      <!-- Header สไตล์เดียวกับ Custom Alert -->
      <div style="
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1.5rem;
        margin: -0.5rem -0.5rem 1rem -0.5rem;
        position: relative;
        overflow: hidden;
      ">
        <!-- Animated Background Elements -->
        <div style="
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
        "></div>
        <div style="
          position: absolute;
          top: 0;
          right: 0;
          width: 128px;
          height: 128px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
          transform: translate(64px, -64px);
          animation: pulse 2s infinite;
        "></div>
        
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          z-index: 10;
        ">
          <span style="
            margin-right: 0.75rem;
            font-size: 2rem;
            animation: iconBounce 0.8s ease-out;
          ">📋</span>
          <h3 style="
            font-size: 1.25rem;
            font-weight: bold;
            color: white;
            margin: 0;
            animation: textSlideIn 0.6s ease-out 0.2s both;
          ">รายงานสำเร็จ!</h3>
        </div>
      </div>
      
      <!-- Body Content -->
      <div style="
        padding: 0.5rem 1.5rem 1.5rem 1.5rem;
        text-align: center;
      ">
        <!-- Success Icon -->
        <div style="
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem auto;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
          animation: successIconScale 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s both;
          position: relative;
        ">
          <svg style="width: 40px; height: 40px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
          </svg>
          
          <!-- Ripple Effects -->
          <div style="
            position: absolute;
            inset: -8px;
            border-radius: 50%;
            border: 3px solid #10b981;
            animation: ripple 2s infinite;
            opacity: 0.6;
          "></div>
          <div style="
            position: absolute;
            inset: -16px;
            border-radius: 50%;
            border: 2px solid #34d399;
            animation: ripple 2s infinite 0.4s;
            opacity: 0.4;
          "></div>
        </div>
        
        <!-- Message -->
        <p style="
          color: #374151;
          font-size: 1.1rem;
          font-weight: 500;
          margin: 0;
          animation: messageSlideUp 0.6s ease-out 0.5s both;
          white-space: pre-line;
        ">${message.replace('✅ ', '')}</p>
      </div>
    `

    // เพิ่ม CSS keyframes ตามธีม
    const style = document.createElement('style')
    style.textContent = `
      @keyframes backdropFadeIn {
        from { 
          opacity: 0; 
          backdrop-filter: blur(0px) saturate(100%); 
        }
        to { 
          opacity: 1; 
          backdrop-filter: blur(16px) saturate(150%); 
        }
      }
      
      @keyframes backdropFadeOut {
        from { 
          opacity: 1; 
          backdrop-filter: blur(16px) saturate(150%); 
        }
        to { 
          opacity: 0; 
          backdrop-filter: blur(0px) saturate(100%); 
        }
      }
      
      @keyframes modalSlideIn {
        from {
          transform: scale(0.8) translateY(40px) rotate(2deg);
          opacity: 0;
        }
        to {
          transform: scale(1) translateY(0) rotate(0deg);
          opacity: 1;
        }
      }
      
      @keyframes modalSlideOut {
        from {
          transform: scale(1) translateY(0) rotate(0deg);
          opacity: 1;
        }
        to {
          transform: scale(0.8) translateY(40px) rotate(-2deg);
          opacity: 0;
        }
      }
      
      @keyframes iconBounce {
        0%, 20%, 53%, 80%, 100% {
          transform: scale(1) rotate(0deg);
        }
        40%, 43% {
          transform: scale(1.2) rotate(-5deg);
        }
        70% {
          transform: scale(1.1) rotate(3deg);
        }
        90% {
          transform: scale(1.05) rotate(-1deg);
        }
      }
      
      @keyframes textSlideIn {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes successIconScale {
        from {
          transform: scale(0) rotate(-180deg);
          opacity: 0;
        }
        60% {
          transform: scale(1.15) rotate(10deg);
          opacity: 0.8;
        }
        to {
          transform: scale(1) rotate(0deg);
          opacity: 1;
        }
      }
      
      @keyframes messageSlideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes ripple {
        0% {
          transform: scale(1);
          opacity: 0.6;
        }
        50% {
          opacity: 0.3;
        }
        100% {
          transform: scale(1.8);
          opacity: 0;
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          opacity: 0.4;
          transform: scale(1);
        }
        50% {
          opacity: 0.2;
          transform: scale(1.1);
        }
      }
    `
    document.head.appendChild(style)

    overlay.appendChild(successDiv)
    document.body.appendChild(overlay)

    // Auto close เร็วขึ้น (1.5 วินาที แทน 2.5 วินาที) และ animate out
    setTimeout(() => {
      overlay.style.animation = 'backdropFadeOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
      successDiv.style.animation = 'modalSlideOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
      
      setTimeout(() => {
        try {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay)
          }
          if (document.head.contains(style)) {
            document.head.removeChild(style)
          }
        } catch (e) {
          console.log('Cleanup already done')
        }
      }, 400)
    }, 1500) // ลดจาก 2500ms เหลือ 1500ms

    // ปิดเมื่อคลิก overlay
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.animation = 'backdropFadeOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
        successDiv.style.animation = 'modalSlideOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
        
        setTimeout(() => {
          try {
            if (document.body.contains(overlay)) {
              document.body.removeChild(overlay)
            }
            if (document.head.contains(style)) {
              document.head.removeChild(style)
            }
          } catch (e) {
            console.log('Cleanup already done')
          }
        }, 400)
      }
    })
  }

  // ❌ Show Error Animation สำหรับรายงานปัญหา
  const showReportErrorAnimation = (message) => {
    // สร้าง overlay สำหรับ backdrop พร้อม advanced blur effects 🎨
    const overlay = document.createElement('div')
    overlay.className = 'fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-lg backdrop-saturate-150'
    overlay.style.cssText = `
      background: linear-gradient(135deg, 
        rgba(0, 0, 0, 0.4) 0%, 
        rgba(0, 0, 0, 0.2) 50%, 
        rgba(0, 0, 0, 0.3) 100%
      );
      animation: backdropFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    `

    // สร้าง error modal
    const errorDiv = document.createElement('div')
    errorDiv.className = 'relative max-w-md w-full mx-4 overflow-hidden border-2 border-red-200 bg-white rounded-2xl shadow-2xl'
    errorDiv.style.cssText = `
      animation: modalSlideIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    `
    
    errorDiv.innerHTML = `
      <!-- Header สำหรับ Error -->
      <div style="
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 1.5rem;
        margin: -0.5rem -0.5rem 1rem -0.5rem;
        position: relative;
        overflow: hidden;
      ">
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          z-index: 10;
        ">
          <span style="
            margin-right: 0.75rem;
            font-size: 2rem;
            animation: iconBounce 0.8s ease-out;
          ">❌</span>
          <h3 style="
            font-size: 1.25rem;
            font-weight: bold;
            color: white;
            margin: 0;
            animation: textSlideIn 0.6s ease-out 0.2s both;
          ">เกิดข้อผิดพลาด!</h3>
        </div>
      </div>
      
      <!-- Body Content -->
      <div style="
        padding: 0.5rem 1.5rem 1.5rem 1.5rem;
        text-align: center;
      ">
        <!-- Error Icon -->
        <div style="
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem auto;
          border-radius: 50%;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
          animation: successIconScale 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s both;
        ">
          <svg style="width: 40px; height: 40px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        
        <!-- Message -->
        <p style="
          color: #374151;
          font-size: 1.1rem;
          font-weight: 500;
          margin: 0;
          animation: messageSlideUp 0.6s ease-out 0.5s both;
        ">${message.replace('❌ ', '')}</p>
      </div>
    `

    // ใช้ style เดียวกัน
    const style = document.createElement('style')
    style.textContent = `
      @keyframes backdropFadeIn {
        from { 
          opacity: 0; 
          backdrop-filter: blur(0px) saturate(100%); 
        }
        to { 
          opacity: 1; 
          backdrop-filter: blur(16px) saturate(150%); 
        }
      }
      
      @keyframes backdropFadeOut {
        from { 
          opacity: 1; 
          backdrop-filter: blur(16px) saturate(150%); 
        }
        to { 
          opacity: 0; 
          backdrop-filter: blur(0px) saturate(100%); 
        }
      }
      
      @keyframes modalSlideIn {
        from {
          transform: scale(0.8) translateY(40px) rotate(2deg);
          opacity: 0;
        }
        to {
          transform: scale(1) translateY(0) rotate(0deg);
          opacity: 1;
        }
      }
      
      @keyframes modalSlideOut {
        from {
          transform: scale(1) translateY(0) rotate(0deg);
          opacity: 1;
        }
        to {
          transform: scale(0.8) translateY(40px) rotate(-2deg);
          opacity: 0;
        }
      }
      
      @keyframes iconBounce {
        0%, 20%, 53%, 80%, 100% {
          transform: scale(1) rotate(0deg);
        }
        40%, 43% {
          transform: scale(1.2) rotate(-5deg);
        }
        70% {
          transform: scale(1.1) rotate(3deg);
        }
        90% {
          transform: scale(1.05) rotate(-1deg);
        }
      }
      
      @keyframes textSlideIn {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes successIconScale {
        from {
          transform: scale(0) rotate(-180deg);
          opacity: 0;
        }
        60% {
          transform: scale(1.15) rotate(10deg);
          opacity: 0.8;
        }
        to {
          transform: scale(1) rotate(0deg);
          opacity: 1;
        }
      }
      
      @keyframes messageSlideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `
    document.head.appendChild(style)

    overlay.appendChild(errorDiv)
    document.body.appendChild(overlay)

    // Auto close
    setTimeout(() => {
      overlay.style.animation = 'backdropFadeOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
      errorDiv.style.animation = 'modalSlideOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
      
      setTimeout(() => {
        try {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay)
          }
          if (document.head.contains(style)) {
            document.head.removeChild(style)
          }
        } catch (e) {
          console.log('Cleanup already done')
        }
      }, 400)
    }, 2000)

    // ปิดเมื่อคลิก overlay
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.animation = 'backdropFadeOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
        errorDiv.style.animation = 'modalSlideOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards'
        
        setTimeout(() => {
          try {
            if (document.body.contains(overlay)) {
              document.body.removeChild(overlay)
            }
            if (document.head.contains(style)) {
              document.head.removeChild(style)
            }
          } catch (e) {
            console.log('Cleanup already done')
          }
        }, 400)
      }
    })
  }

  // 🎯 Smart Search Function - เหมือนหน้าจองห้องประชุม
  const smartRoomSearch = (rooms, searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return rooms
    
    const search = searchTerm.toLowerCase().trim()
    
    return rooms.filter(room => {
      const roomName = room.room_name?.toLowerCase() || ''
      const location = room.location_m?.toLowerCase() || ''
      const department = room.department?.toLowerCase() || ''
      
      // 1. ค้นหาแบบ exact match ก่อน
      if (roomName.includes(search) || location.includes(search) || department.includes(search)) {
        return true
      }
      
      // 2. Smart search - ลบคำที่ไม่จำเป็นและค้นหา
      const cleanSearch = search
        .replace(/ห้อง/g, '')
        .replace(/ประชุม/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      
      if (cleanSearch && cleanSearch.length >= 1) {
        const cleanRoomName = roomName
          .replace(/ห้อง/g, '')
          .replace(/ประชุม/g, '')
          .replace(/\s+/g, ' ')
          .trim()
        
        // ค้นหาในชื่อห้องที่ clean แล้ว
        if (cleanRoomName.includes(cleanSearch)) {
          return true
        }
        
        // ค้นหาแบบ partial match ในชื่อห้องเดิม
        if (roomName.includes(cleanSearch)) {
          return true
        }
      }
      
      return false
    })
  }

  useEffect(() => {
    fetchRooms()
    fetchDepartments()
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [filters.department]) // เอา minCapacity ออก เพราะใช้ client-side filtering

  // 🔍 Client-side Smart Search และ Filter
  useEffect(() => {
    let filteredRooms = [...rawRooms]
    console.log('🔍 Starting filter process...')
    console.log('📊 Raw rooms count:', rawRooms.length)
    console.log('🔍 Search term:', filters.search)
    console.log('👥 Min capacity:', filters.minCapacity)
    
    // Apply smart search
    if (filters.search && filters.search.trim() !== '') {
      filteredRooms = smartRoomSearch(filteredRooms, filters.search)
      console.log('📝 After search filter:', filteredRooms.length)
    }
    
    // Apply minimum capacity filter
    if (filters.minCapacity && filters.minCapacity !== '') {
      const minCap = parseInt(filters.minCapacity)
      if (!isNaN(minCap) && minCap > 0) {
        console.log('👥 Filtering by min capacity:', minCap)
        filteredRooms = filteredRooms.filter(room => {
          const roomCapacity = parseInt(room.capacity)
          const passes = roomCapacity >= minCap
          console.log(`🏢 ${room.room_name}: ${roomCapacity} >= ${minCap} = ${passes}`)
          return passes
        })
        console.log('👥 After capacity filter:', filteredRooms.length)
      }
    }
    
    console.log('✅ Final filtered rooms:', filteredRooms.length)
    setRooms(filteredRooms)
  }, [rawRooms, filters.search, filters.minCapacity])

  const fetchRooms = async () => {
    try {
      const token = authUtils.getToken()
      
      if (!token) {
        window.location.href = '/login'
        return
      }

      // Build query parameters (ใช้ client-side filtering สำหรับ search และ capacity)
      const params = new URLSearchParams()
      if (filters.department) params.append('department', filters.department)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rooms?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.status === 401) {
        authUtils.stopTokenExpiryCheck()
        authUtils.clearAuth()
        window.location.href = '/login'
        return
      }

      if (response.ok) {
        const data = await response.json()
        console.log('Rooms data:', data)
        setRawRooms(data.rooms || data || [])
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
    }
  }

  const fetchDepartments = async () => {
    try {
      const token = authUtils.getToken()
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/departments`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log('Departments data:', data)
        // Handle different response formats
        let deptList = []
        if (data.departments) {
          deptList = data.departments
        } else if (data.data) {
          deptList = data.data
        } else if (Array.isArray(data)) {
          deptList = data
        }
        
        // Extract department names if they are objects
        const deptNames = deptList.map(dept => 
          typeof dept === 'object' ? dept.name || dept.department_name || dept : dept
        )
        
        setDepartments(deptNames)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
      // Fallback departments
      setDepartments(['เทคโนโลยีสารสนเทศ', 'บริหารธุรกิจ', 'ครุศาสตร์', 'มนุษยศาสตร์'])
    }
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(rooms.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRooms = rooms.slice(startIndex, endIndex)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2 flex items-center">
          <span className="text-3xl lg:text-4xl mr-2 lg:mr-3">🏢</span>
          ค้นหาห้องประชุม
        </h1>
        <p className="text-gray-600 text-sm lg:text-base">
          ค้นหาและเลือกห้องประชุมที่เหมาะสมกับความต้องการของคุณ
        </p>
      </div>

      {/* Search and Filter */}
      <SearchAndFilter 
        filters={filters} 
        onFilterChange={setFilters} 
        departments={departments}
      />

      {/* Results Summary with Pagination Info */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-gray-600 text-sm lg:text-base">
            ทั้งหมด <span className="font-semibold text-gray-800">{rooms.length}</span> ห้องประชุม
          </p>
          <div className="text-sm text-gray-500">
            แบ่งหน้า: <span className="font-medium">{currentPage} / {totalPages}</span>
          </div>
        </div>
      </div>

      {/* Rooms Display - แสดงเฉพาะหน้าปัจจุบัน */}
      <RoomsDisplay 
        rooms={paginatedRooms} 
        onViewDetails={handleViewDetails}
        onReportProblem={handleReportProblem}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-8 gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            ก่อนหน้า
          </button>

          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            )
          })}

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            ถัดไป
          </button>
        </div>
      )}

      {/* 📋 User Room Detail Modal */}
      <UserRoomDetailModal
        showModal={showDetailModal}
        selectedRoom={selectedRoom}
        isOpening={detailModalOpening}
        isClosing={detailModalClosing}
        onClose={() => {
          setDetailModalClosing(true)
          setTimeout(() => {
            setShowDetailModal(false)
            setDetailModalClosing(false)
            setDetailModalOpening(false)
            setSelectedRoom(null)
          }, 200)
        }}
      />

      {/* 📝 Report Problem Modal */}
      <ReportProblemModal
        isOpen={showReportModal}
        room={selectedRoomForReport}
        onClose={() => {
          setShowReportModal(false)
          setSelectedRoomForReport(null)
        }}
        onSubmit={handleSubmitReport}
      />


    </div>
  )
}
