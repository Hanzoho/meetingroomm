import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import { Button } from './ui/button'

const MeetingroomCard = ({ meetingroom }) => {
  // ฟังก์ชันตรวจสอบสถานะห้อง
  const getRoomStatus = () => {
    if (meetingroom.status_m === 'maintenance') {
      return { text: 'ไม่พร้อมใช้งาน', variant: 'destructive' }
    }
    if (meetingroom.status_m === 'available') {
      return { text: 'พร้อมใช้งาน', variant: 'default' }
    }
    // fallback เดิม
    return { 
      text: meetingroom.available !== false ? 'ว่าง' : 'ไม่ว่าง', 
      variant: meetingroom.available !== false ? 'default' : 'destructive' 
    }
  }

  const roomStatus = getRoomStatus()

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
      <CardHeader className="p-0">
        <div className="relative h-48 w-full">
          {meetingroom.images && meetingroom.images.length > 0 ? (
            <Image
              src={meetingroom.images[0]}
              alt={`รูปภาพของ ${meetingroom.name}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              priority={meetingroom.id <= 4} // โหลดรูปแรกๆ ก่อน
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <span className="text-muted-foreground">ไม่มีรูปภาพ</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <h3 className="mb-2 text-lg font-semibold">{meetingroom.room_name || meetingroom.name}</h3>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>รองรับ {meetingroom.capacity} คน</span>
          </div>
          <Badge variant={roomStatus.variant}>
            {roomStatus.text}
          </Badge>
        </div>
        {/* เพิ่มข้อมูลตำแหน่งและคณะ/หน่วยงาน */}
        {(meetingroom.location_m || meetingroom.department) && (
          <div className="mt-2 text-xs text-muted-foreground">
            {meetingroom.location_m && <div>📍 {meetingroom.location_m}</div>}
            {meetingroom.department && <div>� {meetingroom.department}</div>}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full">
          <Link href={`/bookingroom/${meetingroom.room_id || meetingroom.id}`}>ดูรายละเอียด</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export default MeetingroomCard