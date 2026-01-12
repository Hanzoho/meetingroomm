// 📋 RoomDetailModal.jsx - Modal แสดงรายละเอียดห้องประชุมสำหรับ Officer
// ใช้สำหรับแสดงข้อมูลห้องประชุมแบบ read-only พร้อม animation สวยๆ และ background blur

'use client'

import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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

export default function RoomDetailModal({ 
  showModal, 
  selectedRoom, 
  isOpening, 
  isClosing, 
  onClose, 
  onEdit 
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

  const handleEdit = () => {
    if (onEdit) onEdit(selectedRoom)
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ease-out ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* 🎨 Background Blur - ลดเบลอให้นิดนึง */}
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

      {/* 🎨 Modal Content - พื้นหลังสีขาว */}
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
            
            {/* 🏷️ Header - สีเทาเข้ม */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
              <h3 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                📋 รายละเอียดห้องประชุม
              </h3>
              <button
                onClick={handleClose}
                className="text-red-600 hover:text-red-700 text-3xl font-bold w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 hover:rotate-90"
              >
                ×
              </button>
            </div>

            {/* 📄 Content */}
            <div className="space-y-6">
              
              {/* 🏢 Room Name & Image */}
              <div>
                <h4 className="text-3xl font-bold text-gray-900 mb-4">{selectedRoom.room_name}</h4>
                {/* 🖼️ Room Image - แสดงรูปเต็มกรอบใหญ่ */}
                <div className="w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden mb-4">
                  <img
                    key={`modal-img-${selectedRoom.room_id}-${selectedRoom.imageTimestamp || (selectedRoom.updated_at ? new Date(selectedRoom.updated_at).getTime() : Date.now())}`}
                    src={`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/image/${selectedRoom.room_id}?t=${selectedRoom.imageTimestamp || (selectedRoom.updated_at ? new Date(selectedRoom.updated_at).getTime() : Date.now())}`}
                    alt={selectedRoom.room_name}
                    className="w-full h-80 object-cover rounded-xl shadow-lg"
                    onError={(e) => {
                      console.log('🖼️ Failed to load room image in modal for room_id:', selectedRoom.room_id)
                      e.target.style.display = 'none'
                      // Show fallback
                      const fallback = e.target.nextSibling
                      if (fallback) {
                        fallback.style.display = 'flex'
                        fallback.className = 'w-full h-80 flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-xl'
                      }
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
                  <p className="text-gray-900 text-lg">{selectedRoom.location_m}</p>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">🏢 คณะ</label>
                  <p className="text-gray-900 text-lg">{selectedRoom.department}</p>
                </div>
              </div>

              {/* 👥 Capacity & Status - แนวนอน */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">👥 ความจุ</label>
                  <p className="text-gray-900 text-lg">{selectedRoom.capacity} คน</p>
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">📊 สถานะ</label>
                  {getStatusBadge(selectedRoom.status_m)}
                </div>
              </div>

              {/* 📝 Details */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">📝 รายละเอียด</label>
                <p className="text-gray-900 leading-relaxed text-lg">
                  {selectedRoom.details_m || 'ไม่มีรายละเอียดเพิ่มเติม'}
                </p>
              </div>

              {/* 🛠️ Equipment List - เรียงด้านข้างสวยๆ */}
              <div>
                <label className="block text-base font-medium text-gray-700 mb-3">🛠️ อุปกรณ์ในห้อง</label>
                <div className="flex flex-wrap gap-2">
                  {selectedRoom.equipment?.length > 0 ? (
                    selectedRoom.equipment.map((eq) => (
                      <div key={eq.equipment_id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base hover:bg-gray-50 transition-colors shadow-sm">
                        <span className="font-medium text-gray-800">{eq.equipment_n}</span>
                        <span className="text-gray-800 ml-2 text-sm">จำนวน {eq.quantity} อัน</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 italic bg-gray-50 rounded-lg px-4 py-3 text-lg">
                      ไม่มีอุปกรณ์ในห้องนี้
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 🔘 Action Buttons */}
            <div className="flex space-x-3 mt-8">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-800 border-2 border-gray-300 hover:border-gray-400 shadow-md font-semibold transition-all duration-200"
              >
                ปิด
              </Button>
              <Button
                onClick={handleEdit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md font-semibold transition-all duration-200"
              >
                ✏️ แก้ไข
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
