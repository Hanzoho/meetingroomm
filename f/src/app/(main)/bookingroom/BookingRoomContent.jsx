'use client'

import { useSearchParams } from 'next/navigation'
import React, { useMemo } from 'react'
import { meetingrooms as allMeetingrooms } from '@/lib/mockdata'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'

const MeetingroomCard = ({ meetingroom }) => {
  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl">
      <CardHeader className="p-0">
        <div className="relative h-48 w-full">
          <Image
            src={meetingroom.image_url}
            alt={`รูปภาพของ ${meetingroom.name}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            priority={meetingroom.id <= 4}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <h3 className="mb-2 text-lg font-semibold">{meetingroom.name}</h3>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>รองรับ {meetingroom.capacity} คน</span>
          </div>
          <Badge variant={meetingroom.available ? 'default' : 'destructive'}>
            {meetingroom.available ? 'ว่าง' : 'ไม่ว่าง'}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full">
          <Link href={`/bookingroom/${meetingroom.id}`}>ดูรายละเอียด</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

const BookingRoomContent = () => {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const size = searchParams.get('size') || 'all'

  const filteredRooms = useMemo(() => {
    if (!Array.isArray(allMeetingrooms)) {
      console.error(
        'ข้อมูลห้องประชุม (allMeetingrooms) ไม่ถูกต้อง หรือไม่ถูกโหลด',
      )
      return []
    }
    return allMeetingrooms
      .filter((room) => {
        if (size === 'all') return true
        if (size === 'small') return room.capacity <= 10
        if (size === 'medium')
          return room.capacity > 10 && room.capacity <= 20
        if (size === 'large') return room.capacity > 20
        return true
      })
      .filter((room) => room.name.toLowerCase().includes(query.toLowerCase()))
  }, [query, size, allMeetingrooms])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">ห้องประชุมทั้งหมด</h1>
        <p className="text-muted-foreground">
          เลือกและจองห้องประชุมที่เหมาะกับความต้องการของคุณ
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredRooms.map((room) => (
          <MeetingroomCard meetingroom={room} key={room.id} />
        ))}
      </div>
    </div>
  )
}

export default BookingRoomContent