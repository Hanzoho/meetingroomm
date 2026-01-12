import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

/**
 * Unified Room Card Component
 * ใช้ได้ทั้งหน้า Officer และ User โดยควบคุมผ่าน props
 * 
 * @param {Object} room - ข้อมูลห้องประชุม
 * @param {string} mode - โหมดการแสดงผล ('officer' | 'user')
 * @param {Function} onViewDetails - Callback สำหรับดูรายละเอียด (เปิด Modal)
 * @param {Function} onEdit - Callback สำหรับแก้ไข (เฉพาะ Officer)
 * @param {Function} onDelete - Callback สำหรับลบ (เฉพาะ Officer)
 * @param {Function} getStatusBadge - Function สำหรับแสดง status badge (เฉพาะ Officer)
 */
export function UnifiedRoomCard({ 
  room, 
  mode = 'user', 
  onViewDetails,
  onEdit,
  onDelete,
  getStatusBadge,
  onReportProblem
}) {
  
  // 🎯 Data mapping: แปลงข้อมูลให้เหมือนกันทั้ง Officer และ User API
  const mappedRoom = {
    // Officer API fields -> User API fields mapping
    room_id: room.room_id || room.id,
    room_name: room.room_name || room.name,
    capacity: room.capacity,
    location_m: room.location_m || room.location,
    department: room.department,
    details_m: room.details_m || room.description,
    status_m: room.status_m || room.status || 'available',
    equipment: room.equipment || [],
    has_image: room.has_image || !!room.image,
    current_users: room.current_users || 0,
    availability: room.availability || 0,
    imageTimestamp: room.imageTimestamp
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border border-gray-200/50 bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 overflow-hidden rounded-3xl shadow-md flex flex-col h-[720px] p-0 gap-0">
      {/* 📷 Room Image - เต็มมุมบนสุดของ Card */}
      <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden flex-shrink-0 rounded-t-3xl">
        {/* เช็คว่ามีรูปหรือไม่ก่อนจะโหลด */}
        {mappedRoom.has_image === true && mappedRoom.room_id ? (
          <>
            {/* 🖼️ Room Image - โหลดผ่าน API endpoint */}
            <img
              key={`room-img-${mappedRoom.room_id}`}
              src={`/api/rooms/image/${mappedRoom.room_id}${mappedRoom.imageTimestamp ? `?t=${mappedRoom.imageTimestamp}` : ''}`}
              alt={mappedRoom.room_name}
              className="w-full h-full object-cover transition-transform duration-300 rounded-t-3xl"
              onError={(e) => {
                e.target.style.display = 'none'
                const fallback = e.target.parentElement.querySelector('.fallback-image')
                if (fallback) fallback.style.display = 'flex'
              }}
            />

            {/* Fallback สำหรับกรณีที่รูปโหลดไม่ได้ */}
            <div className="fallback-image absolute inset-0 w-full h-full hidden items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-t-3xl">
              <div className="text-center">
                <div className="text-6xl mb-3 text-blue-400 drop-shadow-lg">🏢</div>
                <p className="text-blue-600 font-semibold text-sm">ไม่มีรูปภาพ</p>
              </div>
            </div>
          </>
        ) : (
          /* แสดง fallback เลยสำหรับห้องที่ไม่มีรูป */
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-t-3xl">
            <div className="text-center">
              <div className="text-6xl mb-3 text-blue-400 drop-shadow-lg">🏢</div>
              <p className="text-blue-600 font-semibold text-sm">ไม่มีรูปภาพ</p>
            </div>
          </div>
        )}

        {/* 🏷️ Status Badge Overlay - ทั้ง Officer และ User */}
        {((mode === 'officer' && getStatusBadge) || mode === 'user') && (
          <div className="absolute top-3 right-3 z-10">
            {mode === 'officer' ? getStatusBadge(mappedRoom.status_m) : (
              // Status Badge สำหรับ User
              <div className={`px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${
                mappedRoom.status_m === 'maintenance'
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-700 border-yellow-200'
                  : 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200'
              }`}>
                {mappedRoom.status_m === 'maintenance'
                  ? '⚠️ ไม่พร้อมใช้งาน'
                  : '✅ พร้อมใช้งาน'}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative flex-1 flex flex-col">
        {/* 📝 Card Content */}
        <div className="p-5 flex-1 flex flex-col min-h-[360px]">
          
          {/* ส่วนเนื้อหา - ความสูงคงที่ */}
          <div className="flex-1 space-y-3 h-[300px] overflow-hidden">

            {/* 🏷️ Room Name - ความสูงคงที่ */}
            <div className="pb-2 border-b border-gray-200/60 h-14 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 leading-tight tracking-wide line-clamp-2 flex-1 pr-2">
                {mappedRoom.room_name}
              </h3>
              
              {/* 👥 กรอบแสดงจำนวนคนที่กำลังใช้งาน - เฉพาะ Officer */}
              {mode === 'officer' && mappedRoom.current_users !== undefined ? (
                <div className={`flex-shrink-0 border rounded-lg px-3 py-1 shadow-sm ${
                  mappedRoom.current_users > 0 
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                    : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                }`}>
                  <span className={`text-sm font-medium ${
                    mappedRoom.current_users > 0 ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {mappedRoom.current_users > 0 ? `${mappedRoom.current_users} คน` : 'ว่าง'}
                  </span>
                </div>
              ) : null}
            </div>

            {/* 📊 Room Information */}
            <div className="space-y-3">
              
              {/* 🏢 คณะ/หน่วยงาน */}
              <div className="flex items-start py-1 border-b border-gray-200 h-[40px]">
                <span className="text-gray-600 flex items-center gap-3 font-medium min-w-[140px] flex-shrink-0">
                  <span className="text-lg">🏢</span>
                  <span className="text-base">คณะ/หน่วยงาน</span>
                </span>
                <span className="text-gray-900 text-base leading-relaxed ml-3 line-clamp-1 overflow-hidden">
                  {mappedRoom.department || 'ไม่ระบุ'}
                </span>
              </div>

              {/* 📍 สถานที่ */}
              <div className="flex items-start py-1 border-b border-gray-200 h-[40px]">
                <span className="text-gray-600 flex items-center gap-3 font-medium min-w-[140px] flex-shrink-0">
                  <span className="text-lg">📍</span>
                  <span className="text-base">สถานที่</span>
                </span>
                <span className="text-gray-900 text-base leading-relaxed ml-3 line-clamp-1 overflow-hidden">
                  {mappedRoom.location_m || 'ไม่ระบุตำแหน่ง'}
                </span>
              </div>

              {/* 👥 ความจุ */}
              <div className="flex items-center py-1 border-b border-gray-200 h-[40px]">
                <span className="text-gray-600 flex items-center gap-3 font-medium min-w-[140px] flex-shrink-0">
                  <span className="text-lg">👥</span>
                  <span className="text-base">ความจุ</span>
                </span>
                <span className="text-gray-900 text-base leading-relaxed ml-3">
                  {mappedRoom.capacity ? `${mappedRoom.capacity} คน` : 'ไม่ระบุ'}
                </span>
              </div>

              {/* 📝 รายละเอียดเพิ่มเติม */}
              <div className="flex items-start py-1 border-b border-gray-200 h-[40px]">
                <span className="text-gray-600 flex items-start gap-3 font-medium min-w-[140px] flex-shrink-0 pt-1">
                  <span className="text-lg">📝</span>
                  <span className="text-base">รายละเอียด</span>
                </span>
                <span className="text-gray-900 text-base leading-relaxed ml-3 line-clamp-1 overflow-hidden pt-1">
                  {mappedRoom.details_m ?
                    mappedRoom.details_m :
                    <span className="text-gray-400 italic">ไม่ระบุ</span>
                  }
                </span>
              </div>

              {/* 🛠️ อุปกรณ์ */}
              <div className="py-1 h-[65px] overflow-hidden">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">🛠️</span>
                  <span className="text-gray-600 font-medium text-base">อุปกรณ์</span>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-6 h-[40px] items-start content-start overflow-hidden">
                  {mappedRoom.equipment?.length > 0 ? (
                    <>
                      {mappedRoom.equipment.slice(0, 3).map((eq, index) => {
                        // Handle different equipment formats
                        const equipmentName = typeof eq === 'object' ? 
                          (eq.equipment_n || eq.equipment_name || eq.name || 'อุปกรณ์') : 
                          eq
                        const quantity = typeof eq === 'object' ? eq.quantity || '' : ''
                        
                        return (
                          <Badge 
                            key={`eq-${mappedRoom.room_id}-${index}`} 
                            className="bg-blue-50 text-blue-700 border-blue-200 text-sm hover:bg-blue-100 transition-colors"
                          >
                            {equipmentName}{quantity ? ` (${quantity})` : ''}
                          </Badge>
                        )
                      })}
                      {mappedRoom.equipment.length > 3 && (
                        <Badge className="bg-orange-50 text-orange-600 border-orange-200 text-sm font-semibold">
                          +{mappedRoom.equipment.length - 3} อื่นๆ
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400 italic text-base">ไม่มีอุปกรณ์</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ส่วนปุ่ม - ติดด้านล่างเสมอ */}
          <div className="mt-auto pt-1 border-t border-gray-200 flex-shrink-0 h-[100px]">
            {mode === 'officer' ? (
              /* Officer Mode: ดู, แก้ไข, ลบ */
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails && onViewDetails(room)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 border-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:border-blue-700 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-200/50"
                >
                  📋 ดู
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit && onEdit(room)}
                  className="bg-gradient-to-r from-green-500 to-green-600 border-green-600 text-white hover:from-green-600 hover:to-green-700 hover:border-green-700 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-200/50"
                >
                  ✏️ แก้ไข
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete && onDelete(room)}
                  className="bg-gradient-to-r from-red-500 to-red-600 border-red-600 text-white hover:from-red-600 hover:to-red-700 hover:border-red-700 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-200/50"
                >
                  🗑️ ลบ
                </Button>
              </div>
            ) : (
              /* User Mode: ดูรายละเอียด, จองเลย, รายงานปัญหา */
              <div className="space-y-2">
                {/* ปุ่มหลัก: ดูรายละเอียดและจองเลย */}
                <div className={`${
                  mappedRoom.status_m === 'maintenance'
                    ? 'grid grid-cols-1 gap-3'  // ห้องไม่พร้อม: แสดงปุ่มเดียว
                    : 'grid grid-cols-2 gap-3'  // ห้องพร้อม: แสดงสองปุ่ม
                }`}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails && onViewDetails(mappedRoom)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 border-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:border-blue-700 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-200/50"
                  >
                    📋 ดูรายละเอียด
                  </Button>
                  {/* ปุ่มจอง - แสดงเฉพาะเมื่อห้องพร้อมใช้งาน */}
                  {mappedRoom.status_m !== 'maintenance' && (
                    <Link
                      href={`/reserve?room_id=${mappedRoom.room_id}`}
                      className="flex-1"
                    >
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 border-green-600 text-white hover:from-green-600 hover:to-green-700 hover:border-green-700 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-200/50"
                      >
                        📅 จองเลย
                      </Button>
                    </Link>
                  )}
                </div>

                {/* ปุ่มรายงานปัญหา - ปุ่มเล็กตรงกลาง */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      if (onReportProblem) {
                        onReportProblem(mappedRoom)
                      }
                    }}
                    className="bg-white border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-700 text-xs px-3 py-1 h-6 transition-all duration-200 hover:shadow-sm"
                  >
                    📝 รายงานการใช้ห้องประชุม
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}