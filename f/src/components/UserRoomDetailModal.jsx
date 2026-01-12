// 📋 UserRoomDetailModal.jsx - Modal แสดงรายละเอียดห้องประชุมสำหรับ User
// ใช้สำหรับแสดงข้อมูลห้องประชุมแบบ read-only สำหรับผู้ใช้งานทั่วไป

'use client'

import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

// 🎨 Status Badge Components
const getStatusBadge = (status) => {
  const statusConfig = {
    available: { label: 'พร้อมใช้งาน', color: 'bg-green-100 text-green-800 border-green-200' },
    maintenance: { label: 'ปรับปรุง', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    unavailable: { label: 'ไม่พร้อมใช้', color: 'bg-red-100 text-red-800 border-red-200' }
  }
  
  const config = statusConfig[status] || statusConfig.available
  
  return (
    <Badge className={`${config.color} font-medium px-3 py-1 rounded-full border`}>
      {config.label}
    </Badge>
  )
}

export default function UserRoomDetailModal({ 
  showModal, 
  selectedRoom, 
  isOpening, 
  isClosing, 
  onClose 
}) {
  // 🔒 ล็อค body scroll เมื่อเปิด modal
  useEffect(() => {
    if (showModal) {
      // ล็อค scroll
      document.body.style.overflow = 'hidden'
      
      // cleanup function: ปลดล็อค scroll เมื่อปิด modal
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [showModal])

  // ถ้าไม่มี modal หรือไม่มีห้องที่เลือก ไม่แสดงอะไร
  if (!showModal || !selectedRoom) return null

  const handleClose = () => {
    if (onClose) onClose()
  }

  // 🎯 Data mapping: แปลงข้อมูลให้ใช้ได้ทั้ง Officer และ User API
  const mappedRoom = {
    room_id: selectedRoom.room_id || selectedRoom.id,
    room_name: selectedRoom.room_name || selectedRoom.name,
    capacity: selectedRoom.capacity,
    location_m: selectedRoom.location_m || selectedRoom.location,
    department: selectedRoom.department,
    details_m: selectedRoom.details_m || selectedRoom.description,
    equipment: selectedRoom.equipment || [],
    status_m: selectedRoom.status_m || selectedRoom.status || 'available',
    imageTimestamp: selectedRoom.imageTimestamp
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ease-out ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* 🎨 Background Blur */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 transition-all duration-300 ease-out ${
          isClosing
            ? 'opacity-0 backdrop-blur-none'
            : isOpening
              ? 'opacity-0 backdrop-blur-none'
              : 'opacity-100 backdrop-blur-sm'
        }`}
        onClick={handleClose}
      />

      {/* 🎨 Modal Content */}
      <div className={`relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] transform transition-all duration-400 ease-out ${
        isClosing
          ? 'scale-90 opacity-0 translate-y-4 rotate-1'
          : isOpening
            ? 'scale-75 opacity-0 translate-y-8 -rotate-1'
            : 'scale-100 opacity-100 translate-y-0 rotate-0'
      } border border-gray-200`}>
        
        {/* 📜 Custom Scrollbar Container */}
        <div 
          className="overflow-y-auto max-h-[90vh] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db transparent'
          }}
        >
          <div className="p-8">
            
            {/* 🏷️ Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
              <h3 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                📋 รายละเอียดห้องประชุม
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-red-600 hover:bg-red-50 text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 hover:border-red-300 transition-all duration-200 hover:scale-105 flex-shrink-0"
                title="ปิด"
              >
                ×
              </button>
            </div>

            {/* 📄 Content */}
            <div className="space-y-6">
              
              {/* 🏢 Room Name & Image */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-3xl font-bold text-gray-900">{mappedRoom.room_name}</h4>
                </div>
                
                {/* 🖼️ Room Image - แสดงรูปเต็มกรอบใหญ่ */}
                <div className="w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden">
                  <img
                    key={`modal-img-${mappedRoom.room_id}`}
                    src={`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/image/${mappedRoom.room_id}${mappedRoom.imageTimestamp ? `?t=${mappedRoom.imageTimestamp}` : ''}`}
                    alt={mappedRoom.room_name}
                    className="w-full h-80 object-cover rounded-xl shadow-lg"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      const fallback = e.target.nextSibling
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                  <div className="w-full h-80 hidden items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-xl">
                    <div className="text-center">
                      <div className="text-8xl mb-4 text-blue-400 drop-shadow-lg">🏢</div>
                      <p className="text-blue-600 font-semibold text-lg">ไม่มีรูปภาพ</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 📍 Location & Department - แนวนอน */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">📍 สถานที่</label>
                  <p className="text-gray-900 text-lg">{mappedRoom.location_m || 'ไม่ระบุตำแหน่ง'}</p>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">🏢 คณะ/หน่วยงาน</label>
                  <p className="text-gray-900 text-lg">{mappedRoom.department || 'ไม่ระบุ'}</p>
                </div>
              </div>

              {/* 👥 Capacity & Status - แนวนอน */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">👥 ความจุ</label>
                  <p className="text-gray-900 text-lg">
                    {mappedRoom.capacity ? `${mappedRoom.capacity} คน` : 'ไม่ระบุ'}
                  </p>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">📊 สถานะ</label>
                  {getStatusBadge(mappedRoom.status_m)}
                </div>
              </div>

              {/* 📝 Details */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">📝 รายละเอียด</label>
                <p className="text-gray-900 leading-relaxed text-lg">
                  {mappedRoom.details_m || 'ไม่มีรายละเอียดเพิ่มเติม'}
                </p>
              </div>

              {/* 🛠️ Equipment List */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-3">🛠️ อุปกรณ์ในห้อง</label>
                <div className="flex flex-wrap gap-2">
                  {mappedRoom.equipment?.length > 0 ? (
                    mappedRoom.equipment.map((eq, index) => {
                      // Handle different equipment formats
                      const equipmentName = typeof eq === 'object' ? 
                        (eq.equipment_n || eq.equipment_name || eq.name || 'อุปกรณ์') : 
                        eq
                      const quantity = typeof eq === 'object' ? eq.quantity || '' : ''
                      
                      return (
                        <div key={`modal-eq-${mappedRoom.room_id}-${index}`} className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base hover:bg-gray-50 transition-colors shadow-sm">
                          <span className="font-medium text-gray-800">{equipmentName}</span>
                          {quantity && <span className="text-gray-800 ml-2 text-sm">จำนวน {quantity} อัน</span>}
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-gray-400 italic bg-gray-50 rounded-lg px-4 py-3 text-lg">
                      ไม่มีอุปกรณ์ในห้องนี้
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 🔘 Action Buttons - สำหรับ User: ปิด และ จองเลย (ถ้าพร้อมใช้งาน) */}
            <div className={`flex space-x-3 mt-8 ${
              mappedRoom.status_m === 'maintenance'
                ? 'justify-center'  // ห้องไม่พร้อม: ปุ่มตรงกลาง
                : ''               // ห้องพร้อม: ปุ่มแยกซ้าย-ขวา
            }`}>
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-800 border-2 border-gray-300 hover:border-gray-400 shadow-md font-semibold transition-all duration-200"
              >
                ปิด
              </Button>
              {/* ปุ่มจอง - แสดงเฉพาะเมื่อห้องพร้อมใช้งาน */}
              {mappedRoom.status_m !== 'maintenance' && (
                <Link
                  href={`/reserve?room_id=${mappedRoom.room_id}`}
                  className="flex-1"
                >
                  <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md font-semibold transition-all duration-200">
                    📅 จองเลย
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}