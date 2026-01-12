'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle } from 'lucide-react'

export const CustomAlert = {
  confirm: (message, userName = '') => {
    return new Promise((resolve) => {
      const modal = document.createElement('div')
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'
      
      const userDisplay = userName ? `ผู้ใช้ ${userName}` : 'รายการนี้'
      
      modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-[500px] max-w-[90vw] mx-4 border">
          <div class="p-6">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">ยืนยันการลบ</h3>
                <p class="text-sm text-gray-500">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            
            <p class="text-gray-700 mb-6">
              คุณแน่ใจที่จะลบ<span class="font-semibold text-red-600">${userDisplay}</span> หรือไม่?
            </p>
            
            <div class="flex gap-3">
              <button id="cancel-btn" class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
                ยกเลิก
              </button>
              <button id="confirm-btn" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                ลบ
              </button>
            </div>
          </div>
        </div>
      `
      
      document.body.appendChild(modal)
      
      const cancelBtn = modal.querySelector('#cancel-btn')
      const confirmBtn = modal.querySelector('#confirm-btn')
      
      const cleanup = () => {
        document.body.removeChild(modal)
      }
      
      cancelBtn.onclick = () => {
        cleanup()
        resolve(false)
      }
      
      confirmBtn.onclick = () => {
        cleanup()
        resolve(true)
      }
      
      // Close on backdrop click
      modal.onclick = (e) => {
        if (e.target === modal) {
          cleanup()
          resolve(false)
        }
      }
    })
  },

  success: (message = 'ดำเนินการสำเร็จ') => {
    return new Promise((resolve) => {
      const modal = document.createElement('div')
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'
      
      modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-[420px] max-w-[90vw] mx-4 border">
          <div class="p-6 text-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <h3 class="text-lg font-semibold text-gray-900 mb-2">สำเร็จ!</h3>
            <p class="text-gray-600 mb-6">${message}</p>
            
            <button id="ok-btn" class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
              ตกลง
            </button>
          </div>
        </div>
      `
      
      document.body.appendChild(modal)
      
      const okBtn = modal.querySelector('#ok-btn')
      
      const cleanup = () => {
        document.body.removeChild(modal)
        resolve()
      }
      
      okBtn.onclick = cleanup
      
      // Auto close after 3 seconds
      setTimeout(cleanup, 3000)
      
      // Close on backdrop click
      modal.onclick = (e) => {
        if (e.target === modal) {
          cleanup()
        }
      }
    })
  }
}
