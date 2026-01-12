'use client'

import React, { useState, useEffect } from 'react'
import { authUtils } from '@/lib/fetchData'
import StatusBadge from '@/components/StatusBadge'

// Add custom styles
const customStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes bounceIn {
    0% { transform: scale(0.3); }
    50% { transform: scale(1.05); }
    70% { transform: scale(0.9); }
    100% { transform: scale(1); }
  }

  @keyframes shakeIn {
    25% { transform: scale(0.9) rotate(-3deg); }
    50% { transform: scale(1.05) rotate(3deg); }
    75% { transform: scale(0.95) rotate(-1deg); }
    100% { transform: scale(1) rotate(0deg); }
  }

  @keyframes wiggle {
    0%, 7% { transform: rotateZ(0); }
    15% { transform: rotateZ(-15deg); }
    20% { transform: rotateZ(10deg); }
    25% { transform: rotateZ(-10deg); }
    30% { transform: rotateZ(6deg); }
    35% { transform: rotateZ(-4deg); }
    40%, 100% { transform: rotateZ(0); }
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.type = 'text/css'
  styleSheet.innerText = customStyles
  document.head.appendChild(styleSheet)
}

export default function PendingUsersTab({ onSuccess }) {
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState({})

  // Custom Alert States
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [progressMessage, setProgressMessage] = useState('')

  // Custom Dialog Functions
  const showCustomConfirm = (message, action) => {
    return new Promise((resolve) => {
      setConfirmMessage(message)
      setConfirmAction(() => () => {
        resolve(true)
        setShowConfirmDialog(false)
      })
      setShowConfirmDialog(true)
    })
  }

  const showCustomSuccess = (message) => {
    console.log('🎉 [PendingUsersTab] showCustomSuccess:', message)

    // ปิด progress dialog
    setShowProgressDialog(false)

    // แสดง success alert แบบเดียวกับการลบผู้ใช้สำเร็จ
    const alert = document.createElement('div')
    alert.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-0 transition-all duration-300'
    alert.textContent = message
    document.body.appendChild(alert)

    setTimeout(() => {
      alert.classList.add('translate-x-full', 'opacity-0')
      setTimeout(() => document.body.removeChild(alert), 300)
    }, 3000)
  }

  const showCustomError = (message) => {
    console.log('❌ [PendingUsersTab] showCustomError:', message)
    setErrorMessage(message)
    setShowErrorDialog(true)
    setShowProgressDialog(false) // ซ่อน progress dialog
    setTimeout(() => {
      console.log('⏰ [PendingUsersTab] Hide error dialog after 4s')
      setShowErrorDialog(false)
    }, 4000)
  }

  const showProgress = (message) => {
    console.log('⏳ [PendingUsersTab] showProgress:', message)
    setProgressMessage(message)
    setShowProgressDialog(true)
    // ไม่ซ่อน success dialog ทันที ให้ success dialog เป็นคนจัดการเอง
  }

  const handleConfirmCancel = () => {
    setShowConfirmDialog(false)
    setConfirmAction(null)
  }

  // ดึงรายการผู้ใช้รออนุมัติ
  const fetchPendingUsers = async () => {
    try {
      setLoading(true)
      const token = authUtils.getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/admin/pending-users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPendingUsers(data.data || [])
      } else {
        setError('ไม่สามารถดึงข้อมูลผู้ใช้รออนุมัติได้')
      }
    } catch (error) {
      console.error('Error fetching pending users:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  // อนุมัติผู้ใช้
  const handleApprove = async (userId, role) => {
    console.log('✅ [PendingUsersTab] handleApprove:', { userId, role })
    // แสดง Custom Confirm Dialog
    setConfirmMessage('คุณต้องการอนุมัติผู้ใช้หรือไม่?')
    setConfirmAction(() => async () => {
      console.log('🔄 [PendingUsersTab] Executing approve action...')
      setShowConfirmDialog(false)

      // แสดง Progress Dialog ทันทีเพื่อแจ้งผู้ใช้รอ
      showProgress('กำลังอนุมัติ...')

      try {
        setActionLoading(prev => ({ ...prev, [`${role}_${userId}`]: 'approving' }))

        const token = authUtils.getToken()

        // Set timeout for 15 seconds
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('การอนุมัติใช้เวลานานเกินไป (เชื่อมต่อเมลเซิร์ฟเวอร์ช้า)')), 15000)
        )

        const fetchPromise = fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/admin/approve-user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId, role })
        })

        const response = await Promise.race([fetchPromise, timeoutPromise])

        console.log('📡 [PendingUsersTab] Approve response:', response.status, response.ok)

        if (response.ok) {
          const data = await response.json()
          console.log('✅ [PendingUsersTab] Approve success:', data)

          // รอให้การดำเนินการเสร็จสิ้น (เช่น ส่งอีเมล)
          console.log('⏳ [PendingUsersTab] Waiting for operation to complete...')
          await new Promise(resolve => setTimeout(resolve, 1500))

          // แสดง Success Alert
          console.log('🎉 [PendingUsersTab] Operation completed')
          showCustomSuccess('อนุมัติผู้ใช้สำเร็จ')

          // รีเฟรชรายการหลังจากแสดง Success Dialog แล้ว
          console.log('🔄 [PendingUsersTab] Refreshing pending users...')
          setTimeout(async () => {
            await fetchPendingUsers()
            // เรียก onSuccess callback เพื่อรีเฟรชข้อมูลใน parent component
            if (onSuccess) {
              console.log('📞 [PendingUsersTab] Calling onSuccess callback after approve...')
              onSuccess()
            }
          }, 100)
        } else {
          const errorData = await response.json()
          console.log('❌ [PendingUsersTab] Approve error:', errorData)
          showCustomError(`เกิดข้อผิดพลาด: ${errorData.message}`)
        }
      } catch (error) {
        console.error('💥 [PendingUsersTab] Error approving user:', error)
        console.error('💥 [PendingUsersTab] Error details:', error.message, error.stack)
        setShowProgressDialog(false) // ซ่อน Progress Dialog ก่อนแสดง Error
        setTimeout(() => {
          showCustomError(`เกิดข้อผิดพลาดในการอนุมัติผู้ใช้: ${error.message}`)
        }, 100)
      } finally {
        console.log('🏁 [PendingUsersTab] Approve action finished')
        setActionLoading(prev => ({ ...prev, [`${role}_${userId}`]: null }))
        // Fallback: ซ่อน Progress Dialog ใน finally block
        setTimeout(() => {
          setShowProgressDialog(false)
        }, 500)
      }
    })
    setShowConfirmDialog(true)
  }

  // ปฏิเสธผู้ใช้
  const handleReject = async (userId, role) => {
    console.log('❌ [PendingUsersTab] handleReject:', { userId, role })
    // แสดง Custom Confirm Dialog
    setConfirmMessage('คุณต้องการปฏิเสธผู้ใช้นี้ใช่หรือไม่?')
    setConfirmAction(() => async () => {
      console.log('🔄 [PendingUsersTab] Executing reject action...')
      setShowConfirmDialog(false)

      // แสดง Progress Dialog ทันทีเพื่อแจ้งผู้ใช้รอ
      showProgress('กำลังปฏิเสธ...')

      try {
        setActionLoading(prev => ({ ...prev, [`${role}_${userId}`]: 'rejecting' }))

        const token = authUtils.getToken()

        // Set timeout for 15 seconds
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('การปฏิเสธใช้เวลานานเกินไป (เชื่อมต่อเมลเซิร์ฟเวอร์ช้า)')), 15000)
        )

        const fetchPromise = fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/admin/reject-user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId, role })
        })

        const response = await Promise.race([fetchPromise, timeoutPromise])

        console.log('📡 [PendingUsersTab] Reject response:', response.status, response.ok)

        if (response.ok) {
          const data = await response.json()
          console.log('✅ [PendingUsersTab] Reject success:', data)

          // รอให้การดำเนินการเสร็จสิ้น (เช่น ส่งอีเมล)
          console.log('⏳ [PendingUsersTab] Waiting for operation to complete...')
          await new Promise(resolve => setTimeout(resolve, 1500))

          // แสดง Success Alert
          console.log('🎉 [PendingUsersTab] Operation completed')
          showCustomSuccess('ปฏิเสธผู้ใช้สำเร็จ')

          // รีเฟรชรายการหลังจากแสดง Success Dialog แล้ว
          console.log('🔄 [PendingUsersTab] Refreshing pending users...')
          setTimeout(async () => {
            await fetchPendingUsers()
            // เรียก onSuccess callback เพื่อรีเฟรชข้อมูลใน parent component
            if (onSuccess) {
              console.log('📞 [PendingUsersTab] Calling onSuccess callback after reject...')
              onSuccess()
            }
          }, 100)
        } else {
          const errorData = await response.json()
          console.log('❌ [PendingUsersTab] Reject error:', errorData)
          showCustomError(`เกิดข้อผิดพลาด: ${errorData.message}`)
        }
      } catch (error) {
        console.error('💥 [PendingUsersTab] Error rejecting user:', error)
        console.error('💥 [PendingUsersTab] Error details:', error.message, error.stack)
        setShowProgressDialog(false) // ซ่อน Progress Dialog ก่อนแสดง Error
        setTimeout(() => {
          showCustomError(`เกิดข้อผิดพลาดในการปฏิเสธผู้ใช้: ${error.message}`)
        }, 100)
      } finally {
        console.log('🏁 [PendingUsersTab] Reject action finished')
        setActionLoading(prev => ({ ...prev, [`${role}_${userId}`]: null }))
        // Fallback: ซ่อน Progress Dialog ใน finally block
        setTimeout(() => {
          setShowProgressDialog(false)
        }, 500)
      }
    })
    setShowConfirmDialog(true)
  }

  useEffect(() => {
    fetchPendingUsers()
  }, [])

  const getRoleText = (role) => {
    switch (role) {
      case 'user': return 'ผู้ใช้ทั่วไป'
      case 'officer': return 'เจ้าหน้าที่'
      case 'executive': return 'ผู้บริหาร'
      case 'admin': return 'ผู้ดูแลระบบ'
      default: return role
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'user': return 'text-blue-600'
      case 'officer': return 'text-purple-600'
      case 'executive': return 'text-orange-600'
      case 'admin': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">กำลังโหลด...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">❌ {error}</p>
        <button
          onClick={fetchPendingUsers}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          ลองใหม่
        </button>
      </div>
    )
  }

  if (pendingUsers.length === 0) {
    return (
      <div className="text-center py-8">  
        <p className="text-lg font-medium text-gray-700 mb-2">ไม่มีผู้ใช้รออนุมัติ</p>
        <button
          onClick={fetchPendingUsers}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 รีเฟรช
        </button>
      </div>
    )
  }

  // Debug render states (เปิดใช้เพื่อ Debug)
  console.log('🎨 [PendingUsersTab] Render states:', {
    showProgressDialog,
    showErrorDialog
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          👥 ผู้ใช้รออนุมัติ ({pendingUsers.length} คน)
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={fetchPendingUsers}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            🔄 รีเฟรช
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {pendingUsers.map((user) => {
            const userId = user.user_id || user.officer_id || user.executive_id || user.admin_id
            const loadingState = actionLoading[`${user.role}_${userId}`]

            return (
              <li key={`${user.role}_${userId}`} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`text-xs font-medium ${getRoleColor(user.role)}`}>
                            {getRoleText(user.role)}
                          </span>
                          <StatusBadge status={user.status} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      <span className="font-medium">ตำแหน่ง:</span> {user.position || 'ไม่ระบุ'} |{' '}
                      <span className="font-medium">หน่วยงาน:</span> {user.department || 'ไม่ระบุ'}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      สมัครเมื่อ: {new Date(user.created_at).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApprove(userId, user.role)}
                      disabled={loadingState}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {loadingState === 'approving' ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          <span className="text-xs">กำลังอนุมัติ & ส่งเมล...</span>
                        </>
                      ) : (
                        <>
                          <span>✅</span>
                          <span>อนุมัติ</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleReject(userId, user.role)}
                      disabled={loadingState}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {loadingState === 'rejecting' ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          <span className="text-xs">กำลังปฏิเสธ & ส่งเมล...</span>
                        </>
                      ) : (
                        <>
                          <span>❌</span>
                          <span>ปฏิเสธ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>



      {/* Custom Confirm Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full mb-4">
                <span className="text-2xl">❓</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">ยืนยันการดำเนินการ</h3>
              <p className="text-gray-600 text-center mb-6">{confirmMessage}</p>
              <div className="flex space-x-3">
                <button
                  onClick={handleConfirmCancel}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmAction}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Error Dialog - สวยงาม */}
      {showErrorDialog && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99999,
            animation: 'fadeIn 0.3s ease-out'
          }}
          onClick={() => setShowErrorDialog(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center transform transition-all duration-300"
            style={{
              animation: 'shakeIn 0.6s ease-out',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon Section */}
            <div className="relative mb-6">
              <div
                className="w-20 h-20 mx-auto bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center shadow-lg"
                style={{ animation: 'wiggle 1s ease-in-out infinite' }}
              >
                <span className="text-4xl">⚠️</span>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">!</span>
              </div>
            </div>

            {/* Content Section */}
            <h3 className="text-2xl font-bold text-red-600 mb-3 bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
              เกิดข้อผิดพลาด
            </h3>
            <p className="text-gray-700 mb-6 text-base leading-relaxed">
              {errorMessage}
            </p>

            {/* Button Section */}
            <button
              onClick={() => setShowErrorDialog(false)}
              className="px-10 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              รับทราบแล้ว 👌
            </button>
          </div>
        </div>
      )}

      {/* Progress Dialog - สวยงาม */}
      {showProgressDialog && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 99999,
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center transform transition-all duration-300"
            style={{
              animation: 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)'
            }}
          >
            {/* Icon Section - เปลี่ยนตามสถานะ */}
            <div className="relative mb-6">
              {progressMessage?.includes('สำเร็จ') ? (
                // Success Icon
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                // Loading Icon
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center shadow-lg">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                </div>
              )}
            </div>

            {/* Content Section */}
            <h3 className={`text-2xl font-bold mb-3 ${progressMessage?.includes('สำเร็จ')
                ? 'text-green-600'
                : 'text-blue-600 bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent'
              }`}>
              {progressMessage?.includes('สำเร็จ') ? 'สำเร็จ!' : 'กำลังดำเนินการ...'}
            </h3>
            <p className="text-gray-700 mb-6 text-base leading-relaxed whitespace-pre-line">
              {progressMessage}
            </p>

            {/* Loading Dots - แสดงเฉพาะเมื่อกำลังโหลด */}
            {!progressMessage?.includes('สำเร็จ') && (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}