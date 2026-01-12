'use client'

import Image from 'next/image'
import React, { useState, useMemo, useEffect } from 'react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
  Calendar as CalendarIcon,
  Users,
  Tag,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { Calendar } from './ui/calendar'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { calendarAPI } from '@/lib/fetchData' // เพิ่ม import สำหรับดึงข้อมูลจริง
import { Textarea } from '@/components/ui/textarea' // เพิ่ม import สำหรับ textarea
import { 
  generateTimeSlots, 
  calculateDuration, 
  validateBookingData, 
  createBookingData,
  WORKING_HOURS 
} from '@/utils/bookingHelpers'

const MeetingroomDetail = ({ meetingroom }) => {
  const [date, setDate] = useState()
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [bookingDetails, setBookingDetails] = useState('') // เพิ่มฟิลด์รายละเอียด
  const [calendarData, setCalendarData] = useState(null) // เพิ่ม state สำหรับข้อมูลปฏิทิน
  const [loadingCalendar, setLoadingCalendar] = useState(false) // loading state
  const [submittingBooking, setSubmittingBooking] = useState(false) // loading state สำหรับการจอง
  const router = useRouter()
  const [selectedImage, setSelectedImage] = useState(null);

  // Determine the list of images, supporting both `images` array and `image_url` string.
  const imageList = useMemo(() => {
    if (meetingroom?.images && Array.isArray(meetingroom.images) && meetingroom.images.length > 0) {
      return meetingroom.images;
    }
    if (typeof meetingroom?.image_url === 'string' && meetingroom.image_url) {
      return [meetingroom.image_url];
    }
    return [];
  }, [meetingroom]);

  useEffect(() => {
    // Set the initial selected image from the determined list.
    setSelectedImage(imageList.length > 0 ? imageList[0] : null);
  }, [imageList]);

  // ✅ ดึงข้อมูลปฏิทินจริงจาก backend เมื่อเลือกวันที่
  useEffect(() => {
    if (!date || !meetingroom?.room_id) return

    const fetchCalendarData = async () => {
      setLoadingCalendar(true)
      try {
        const month = date.getMonth() + 1
        const year = date.getFullYear()
        
        const result = await calendarAPI.getDetailedCalendar(meetingroom.room_id, month, year)
        setCalendarData(result)
      } catch (error) {
        console.error('ไม่สามารถดึงข้อมูลปฏิทินได้:', error)
        toast.error('ไม่สามารถดึงข้อมูลปฏิทินได้')
      } finally {
        setLoadingCalendar(false)
      }
    }

    fetchCalendarData()
  }, [date, meetingroom?.room_id])

  if (!meetingroom) {
    return <div>ไม่พบข้อมูลห้องประชุม</div>
  }

  // ✅ ใช้ helper function สำหรับสร้าง time slots
  const timeSlots = useMemo(() => generateTimeSlots(), [])

  // ✅ ดึงข้อมูลการจองจริงจาก calendarData
  const bookedRanges = useMemo(() => {
    if (!calendarData || !date) return []

    const dateString = date.toISOString().split('T')[0] // YYYY-MM-DD format
    const dayData = calendarData.calendar?.daily_availability?.find(day =>
      day.date === dateString
    )

    if (!dayData || !dayData.slots) return []

    // แปลง slots ที่จองแล้วให้เป็น time ranges
    const bookedSlots = dayData.slots.filter(slot => !slot.available)
    const ranges = []

    bookedSlots.forEach(slot => {
      if (slot.start_time && slot.end_time) {
        ranges.push({
          start: slot.start_time.substring(0, 5), // HH:MM
          end: slot.end_time.substring(0, 5)      // HH:MM
        })
      }
    })

    return ranges
  }, [calendarData, date])

  const isSlotBooked = (slot) => {
    return bookedRanges.some((range) => slot >= range.start && slot < range.end)
  }

  // ✅ คำนวณเวลาสิ้นสุดที่สามารถเลือกได้ (ต้องมากกว่าเวลาเริ่มต้นอย่างน้อย 1 ชั่วโมง)
  const availableEndTimes = useMemo(() => {
    if (!startTime) return []
    
    const startIndex = timeSlots.indexOf(startTime)
    if (startIndex === -1) return []

    // หาการจองถัดไปที่ขัดแย้ง
    const nextBookingIndex = timeSlots.findIndex((slot, index) => 
      index > startIndex && isSlotBooked(slot)
    )

    // กำหนดขอบเขตเวลาสิ้นสุด
    let endLimit = timeSlots.length
    if (nextBookingIndex !== -1) {
      endLimit = nextBookingIndex
    }

    // ต้องจองอย่างน้อย 1 ชั่วโมง (1 slot = 1 ชั่วโมง)
    const minEndIndex = startIndex + 1 // อย่างน้อย 1 ชั่วโมง
    
    // ตรวจสอบให้แน่ใจว่ามีเวลาสิ้นสุดให้เลือก
    if (endLimit <= minEndIndex) return []
    
    return timeSlots.slice(minEndIndex, endLimit)
  }, [startTime, timeSlots, bookedRanges])

  const handleBookingConfirmation = async () => {
    setSubmittingBooking(true)
    try {
      // ✅ ใช้ helper function ตรวจสอบข้อมูล
      const validation = validateBookingData(
        meetingroom?.room_id, 
        date, 
        startTime, 
        endTime, 
        bookingDetails
      )
      
      if (!validation.isValid) {
        toast.error('ข้อมูลไม่ถูกต้อง', {
          description: validation.errors.join(', ')
        })
        return
      }

      // ✅ ใช้ helper function สร้างข้อมูลการจอง
      const bookingData = createBookingData(
        meetingroom.room_id,
        date,
        startTime,
        endTime,
        bookingDetails
      )

      console.log('Sending booking data:', bookingData)

      // ส่งข้อมูลไปยัง API
      const response = await fetch(`/api/protected/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(bookingData)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('ทำการจองสำเร็จ!', {
          description: `คุณได้จอง ${meetingroom.room_name || meetingroom.name} ในวันที่ ${format(date, 'PPP', { locale: th })} เวลา ${startTime} - ${endTime} น. (รออนุมัติ)`,
          action: {
            label: 'ดูการจองของฉัน',
            onClick: () => router.push('/my-reservations'),
          },
        })

        // รีเซ็ตฟอร์ม
        setStartTime('')
        setEndTime('')
        setBookingDetails('')
        setDate(undefined)

        // รีเฟรชข้อมูลปฏิทิน
        if (date && meetingroom?.room_id) {
          const month = date.getMonth() + 1
          const year = date.getFullYear()
          
          const result = await calendarAPI.getDetailedCalendar(meetingroom.room_id, month, year)
          setCalendarData(result)
        }
        
      } else {
        // แสดงข้อผิดพลาดจาก backend
        toast.error('ไม่สามารถจองได้', {
          description: result.message || 'เกิดข้อผิดพลาดในการจอง'
        })

        // หากมีข้อมูล conflicts แสดงรายละเอียด
        if (result.conflicts && result.conflicts.length > 0) {
          console.log('Booking conflicts:', result.conflicts)
        }
      }

    } catch (error) {
      console.error('Booking error:', error)
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ', {
        description: 'กรุณาลองใหม่อีกครั้ง'
      })
    } finally {
      setSubmittingBooking(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Image Section */}
        <div>
          <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg shadow-lg">
            {selectedImage ? (
              <Image
                src={selectedImage}
                alt={meetingroom.name}
                fill
                className="object-cover transition-opacity duration-300"
                key={selectedImage}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary">
                <span className="text-muted-foreground">ไม่มีรูปภาพ</span>
              </div>
            )}
          </div>
          {/* Thumbnails */}
          {imageList.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {imageList.map((image, index) => (
                <button
                  key={index}
                  className={`relative aspect-square overflow-hidden rounded-md ring-2 ring-offset-2 ring-offset-background transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary ${
                    selectedImage === image ? 'ring-primary' : 'ring-transparent'
                  }`}
                  onClick={() => setSelectedImage(image)}
                >
                  <Image
                    src={image}
                    alt={`${meetingroom.name} - รูปภาพ ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="10vw"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details and Booking Section */}
        <div>
          <h1 className="mb-2 text-3xl font-bold">{meetingroom.room_name || meetingroom.name}</h1>
          <Badge
            className={`mb-4 inline-block ${
              meetingroom.status_m === 'available' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {meetingroom.status_m === 'available' ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}
          </Badge>
          <p className="mb-6 text-gray-600">{meetingroom.details_m || meetingroom.description}</p>

          <Card>
            <CardHeader>
              <CardTitle>รายละเอียด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 🏢 คณะ/หน่วยงาน - ความสูงคงที่ */}
              <div className="flex items-start py-1 border-b border-gray-200 h-[40px]">
                <span className="text-gray-600 flex items-center gap-3 font-medium min-w-[140px] flex-shrink-0">
                  <span className="text-lg">🏢</span>
                  <span className="text-base">คณะ/หน่วยงาน</span>
                </span>
                <span className="text-gray-900 text-base leading-relaxed ml-3 line-clamp-1 overflow-hidden">
                  {meetingroom.department || '-'}
                </span>
              </div>

              {/* 📍 สถานที่ - ความสูงคงที่ */}
              <div className="flex items-start py-1 border-b border-gray-200 h-[40px]">
                <span className="text-gray-600 flex items-center gap-3 font-medium min-w-[140px] flex-shrink-0">
                  <span className="text-lg">📍</span>
                  <span className="text-base">สถานที่</span>
                </span>
                <span className="text-gray-900 text-base leading-relaxed ml-3 line-clamp-1 overflow-hidden">
                  {meetingroom.location_m || '-'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <span>
                  รองรับผู้เข้าร่วมสูงสุด:{' '}
                  <span className="font-semibold">{meetingroom.capacity} คน</span>
                </span>
              </div>

              <div>
                <h4 className="mb-2 font-semibold">สิ่งอำนวยความสะดวก:</h4>
                <div className="flex flex-wrap gap-2">
                  {meetingroom.amenities?.map((amenity, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Form Placeholder */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>ทำการจอง</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Selection */}
              <div>
                <h4 className="mb-2 text-center font-semibold text-muted-foreground">
                  1. เลือกวันที่
                </h4>
                <div className="flex justify-center">
                  <Calendar
                    locale={th}
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      if (newDate) {
                        setDate(newDate)
                        setStartTime('')
                        setEndTime('')
                      }
                    }}
                    disabled={(day) =>
                      day < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    className="rounded-md border"
                  />
                </div>
              </div>

              {/* Time Selection */}
              {date && (
                <div className="space-y-4">
                  <h4 className="text-center font-semibold text-muted-foreground">
                    2. เลือกเวลา
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">เวลาเริ่มต้น</label>
                      <Select
                        onValueChange={(value) => {
                          setStartTime(value)
                          setEndTime('') // Reset end time when start time changes
                        }}
                        value={startTime}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกเวลา" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.slice(0, -1).map((time) => (
                            <SelectItem 
                              key={`start-${time}`} 
                              value={time} 
                              disabled={isSlotBooked(time)}
                            >
                              {time} {isSlotBooked(time) ? '(จองแล้ว)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">เวลาสิ้นสุด</label>
                      <Select onValueChange={setEndTime} value={endTime} disabled={!startTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกเวลา" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableEndTimes.map((time) => (
                            <SelectItem key={`end-${time}`} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      รายละเอียดการจอง <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      placeholder="กรุณาระบุวัตถุประสงค์การใช้ห้องประชุม เช่น ประชุมคณะกรรมการ, อบรมพนักงาน, สัมมนา"
                      value={bookingDetails}
                      onChange={(e) => setBookingDetails(e.target.value)}
                      className="min-h-[80px]"
                      maxLength={500}
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      {bookingDetails.length}/500 ตัวอักษร
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Status */}
              {date && startTime && endTime && (
                <div className="rounded-lg bg-blue-50 p-4">
                  <h4 className="mb-2 font-semibold text-blue-900">สรุปการจอง</h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p><strong>ห้อง:</strong> {meetingroom.room_name || meetingroom.name}</p>
                    <p><strong>วันที่:</strong> {format(date, 'PPP', { locale: th })}</p>
                    <p><strong>เวลา:</strong> {startTime} - {endTime} น.</p>
                    <p><strong>ระยะเวลา:</strong> {calculateDuration(startTime, endTime)} ชั่วโมง</p>
                  </div>
                </div>
              )}

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    className="w-full"
                    disabled={meetingroom.status_m !== 'available' || !date || !startTime || !endTime || !bookingDetails.trim() || submittingBooking}
                  >
                    {submittingBooking ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        กำลังจอง...
                      </>
                    ) : (
                      meetingroom.status_m === 'available' ? 'ทำการจอง' : 'ห้องไม่พร้อมใช้งาน'
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>สรุปรายการจอง</DialogTitle>
                    <DialogDescription>
                      โปรดตรวจสอบรายละเอียดการจองของคุณก่อนกดยืนยัน
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ห้องประชุม:</span>
                      <span className="font-semibold">{meetingroom.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">วันที่:</span>
                      <span className="font-semibold">
                        {date ? format(date, 'PPP', { locale: th }) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">เวลา:</span>
                      <span className="font-semibold">
                        {startTime && endTime ? `${startTime} - ${endTime} น.` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">รายละเอียด:</span>
                      <span className="font-semibold max-w-64 text-right break-words">
                        {bookingDetails || 'ไม่ระบุ'}
                      </span>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">ยกเลิก</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button onClick={handleBookingConfirmation}>
                        ยืนยันการจอง
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default MeetingroomDetail
