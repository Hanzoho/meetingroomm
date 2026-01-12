'use client'

import React from 'react'

export default function UserFilters({ activeTab, onTabChange, onAddUser }) {
  const filterOptions = [
    { key: 'all', label: 'ทั้งหมด', icon: '👥' },
    { key: 'pending', label: 'รออนุมัติ', icon: '⏳' },
    { key: 'user', label: 'ผู้ใช้ทั่วไป', icon: '👤' },
    { key: 'officer', label: 'เจ้าหน้าที่', icon: '👨‍💻' },
    { key: 'executive', label: 'ผู้บริหาร', icon: '👨‍💼' },
    { key: 'admin', label: 'ผู้ดูแลระบบ', icon: '⚙️' }
  ]

  const currentFilter = filterOptions.find(option => option.key === activeTab)

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <span className="text-2xl mr-3"></span>
              จัดการผู้ใช้ระบบ
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              เพิ่ม แก้ไข และจัดการข้อมูลผู้ใช้ในระบบ
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            {/* Add User Button */}
            <button
              onClick={() => {
                console.log('🚀 [UserFilters] Add User button clicked!')
                onAddUser()
              }}
              className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              เพิ่มผู้ใช้ใหม่
            </button>

            {/* Filter Dropdown */}
              <div className="relative">
                <select
                  value={activeTab}
                  onChange={(e) => onTabChange(e.target.value)}
                  className="appearance-none w-full bg-white border border-gray-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-900 transition-all duration-200 cursor-pointer"
                >
                  {filterOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
                
                {/* Dropdown Arrow */}
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
  )
}