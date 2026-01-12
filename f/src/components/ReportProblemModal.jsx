'use client'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Send, X } from 'lucide-react'

export function ReportProblemModal({ 
  isOpen, 
  onClose, 
  room,
  onSubmit
}) {
  const [reportText, setReportText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVisible, setIsVisible] = useState(false) // state แยก animation

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true) // เปิด modal + animation
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!reportText.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit(room, reportText.trim())
      setReportText('')
      handleClose()
    } catch (error) {
      console.error('Error submitting report:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    setIsVisible(false)
    setTimeout(() => {
      setReportText('')
      onClose()
    }, 300)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className={`
          sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-0
          fixed left-[50%] top-[50%] z-50 grid w-full gap-4 p-6
          ${isVisible ? 'modal-animate-in' : 'modal-animate-out'}
          [&>button]:hidden
        `}
        style={{
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* ปุ่มปิดมุมบนขวา */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            รายงานการใช้ห้องประชุม
          </DialogTitle>
        </DialogHeader>

        {room && (
          <>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🏢</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">
                    {room.room_name}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">คณะ:</span>
                      <span>{room.department || 'ไม่ระบุ'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-base font-medium text-gray-900 block">
                  📝 รายละเอียดปัญหาที่พบ
                </label>
                <Textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="กรุณาอธิบายปัญหาที่พบในห้องประชุมนี้"
                  className="min-h-[120px] resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg text-base p-3 bg-white text-black"
                  disabled={isSubmitting}
                />
                <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                  <span>ข้อความจะถูกส่งไปยังเจ้าหน้าที่ดูแลห้องประชุม</span>
                  <span>{reportText.length}/250</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-3 pt-6">
              <Button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all duration-200"
              >
                ออก
              </Button>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!reportText.trim() || isSubmitting || reportText.length > 250}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? 'กำลังส่ง...' : 'ส่งรายงาน'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
