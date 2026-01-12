'use client'

import React from 'react'
import { ROLE_CONFIG } from '@/constants/userManagement'

export default function UserList({ 
  users, 
  loading, 
  currentPage, 
  usersPerPage, 
  onEdit, 
  onDelete,
  onPageChange 
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-12 text-center">
          <div className="text-6xl mb-4">😔</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">ไม่พบผู้ใช้</h3>
          <p className="text-gray-600">ไม่มีผู้ใช้ในหมวดหมู่นี้</p>
        </div>
      </div>
    )
  }

  // Pagination logic
  const totalPages = Math.ceil(users.length / usersPerPage)
  const startIndex = (currentPage - 1) * usersPerPage
  const endIndex = startIndex + usersPerPage
  const currentUsers = users.slice(startIndex, endIndex)

  const getRoleBadge = (role) => {
    const config = ROLE_CONFIG[role] || ROLE_CONFIG.user
    
    return (
      <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} max-w-fit`}>
        <span className="mr-1">{config.icon}</span>
        <span className="truncate">{config.label}</span>
      </span>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">
          รายการผู้ใช้ ({users.length.toLocaleString()} คน)
        </h3>
      </div>

      {/* User List */}
      <div className="divide-y divide-gray-200">
        {currentUsers.map((user, index) => {
          const userId = user.user_id || user.officer_id || user.executive_id || user.admin_id;
          const uniqueKey = `${user.role}-${userId}-${index}`;
          
          // สร้าง URL รูปโปรไฟล์ตาม role
          const profileImageUrl = user.profile_image 
            ? `/api/upload/profile-image/${userId}/${user.role}`
            : null;
          
          return (
          <div key={uniqueKey} className="p-3 sm:p-6 hover:bg-gray-50 transition-colors duration-200 ">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-3 sm:space-x-4">
                {profileImageUrl ? (
                  <img 
                    src={profileImageUrl}
                    alt={`${user.first_name} ${user.last_name}`}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      // ถ้าโหลดรูปไม่สำเร็จ ให้แสดง fallback
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg"
                  style={{ display: profileImageUrl ? 'none' : 'flex' }}
                >
                  {user.first_name?.charAt(0) || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 truncate select-text cursor-text">
                    {user.first_name} {user.last_name}
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 space-y-1 sm:space-y-0">
                    <p className="text-xs sm:text-sm text-gray-600 truncate select-text cursor-text">{user.email}</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate select-text cursor-text">{user.position}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mt-2 space-y-1 sm:space-y-0 select-text cursor-text">
                    {getRoleBadge(user.role)}
                    <span className="text-xs text-gray-500 truncate select-text cursor-text">
                      {user.department}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={() => onEdit(user)}
                  className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center text-xs sm:text-sm"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="hidden sm:inline">แก้ไข</span>
                </button>
                <button
                  onClick={() => {
                    const userId = user.user_id || user.officer_id || user.executive_id || user.admin_id;
                    onDelete(userId, user.role, user);
                  }}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center text-xs sm:text-sm"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">ลบ</span>
                </button>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gray-50 px-3 sm:px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="text-xs sm:text-sm text-gray-700 order-2 sm:order-1">
              แสดง {startIndex + 1}-{Math.min(endIndex, users.length)} จาก {users.length.toLocaleString()} คน
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 order-1 sm:order-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                ก่อนหน้า
              </button>
              
              {Array.from({ length: Math.min(3, totalPages) }, (_, index) => {
                const page = index + 1
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium min-w-[32px] sm:min-w-[36px] ${
                      currentPage === page
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
              
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}