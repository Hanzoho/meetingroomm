'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authUtils } from '@/lib/fetchData'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ContentLoadingSpinner from '@/components/loading/ContentLoadingSpinner'
import EditUserModal from '@/components/EditUserModal'

// Admin Components
import UserStats from '@/components/admin/UserStats'
import UserFilters from '@/components/admin/UserFilters'
import UserList from '@/components/admin/UserList'
import AddUserModal from '@/components/admin/AddUserModal'
import PendingUsersTab from '@/components/admin/PendingUsersTab'

// Custom Alert Functions
const showConfirmDialog = (title, message) => {
    return new Promise((resolve) => {
        const dialog = document.createElement('div')
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
        dialog.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
                <p class="text-gray-600 mb-6">${message}</p>
                <div class="flex justify-end space-x-3">
                    <button id="cancel-btn" class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        ยกเลิก
                    </button>
                    <button id="confirm-btn" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        ยืนยัน
                    </button>
                </div>
            </div>
        `
        document.body.appendChild(dialog)
        
        dialog.querySelector('#cancel-btn').onclick = () => {
            document.body.removeChild(dialog)
            resolve(false)
        }
        
        dialog.querySelector('#confirm-btn').onclick = () => {
            document.body.removeChild(dialog)
            resolve(true)
        }
    })
}

const showSuccessAlert = (message) => {
    const alert = document.createElement('div')
    alert.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-0 transition-all duration-300'
    alert.textContent = message
    document.body.appendChild(alert)
    
    setTimeout(() => {
        alert.classList.add('translate-x-full', 'opacity-0')
        setTimeout(() => document.body.removeChild(alert), 300)
    }, 3000)
}

const showErrorAlert = (message) => {
    const alert = document.createElement('div')
    alert.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-0 transition-all duration-300'
    alert.textContent = message
    document.body.appendChild(alert)
    
    setTimeout(() => {
        alert.classList.add('translate-x-full', 'opacity-0')
        setTimeout(() => document.body.removeChild(alert), 300)
    }, 3000)
}

export default function UserManagement() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // Stats และข้อมูลผู้ใช้
    const [stats, setStats] = useState({
        totalUsers: 0,
        regularUsers: 0,
        officers: 0,
        executives: 0,
        admins: 0
    })
    const [statsLoading, setStatsLoading] = useState(false)

    // User lists และ tab management
    const [users, setUsers] = useState([])
    const [filteredUsers, setFilteredUsers] = useState([])
    const [usersLoading, setUsersLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('all')

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const [usersPerPage] = useState(10) // คงที่ 10 คนต่อหน้า

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)

    useEffect(() => {
        // ตรวจสอบการ login - ต้องรอให้ client-side render เสร็จก่อน
        if (typeof window === 'undefined') return

        const initializeAuth = async () => {
            const [userData, token] = await Promise.all([
                Promise.resolve(authUtils.getUserWithRole()),
                Promise.resolve(authUtils.getToken()),
                new Promise(resolve => setTimeout(resolve, 5))
            ])

            console.log('UserManagement - user data:', userData)

            if (!token || !userData) {
                router.push('/login')
                return
            }

            // ตรวจสอบ role - ต้องเป็น admin เท่านั้น
            if (userData.role !== 'admin') {
                router.push('/dashboard/' + userData.role)
                return
            }

            setUser(userData)
            setLoading(false)
        }

        initializeAuth()
    }, [router])

    // ฟังก์ชันสำหรับโหลด statistics
    const loadStats = async () => {
        console.log('🚀 [loadStats] เริ่มโหลดข้อมูล admin stats')
        setStatsLoading(true)

        try {
            const token = authUtils.getToken()
            if (!token) return

            const url = `${process.env.NEXT_PUBLIC_API_URL}/api/protected/admin/stats`
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                if (data.success && data.stats) {
                    setStats({
                        totalUsers: data.stats.total || 0,
                        regularUsers: data.stats.users || 0,
                        officers: data.stats.officers || 0,
                        executives: data.stats.executives || 0,
                        admins: data.stats.admins || 0
                    })
                }
            }
        } catch (error) {
            console.error('💥 [loadStats] Error loading admin stats:', error)
        } finally {
            setStatsLoading(false)
        }
    }

    // ฟังก์ชันสำหรับโหลดรายการผู้ใช้ทั้งหมด
    const loadUsers = async () => {
        console.log('👥 [loadUsers] เริ่มโหลดรายการผู้ใช้ทั้งหมด')
        setUsersLoading(true)

        try {
            const token = authUtils.getToken()
            if (!token) return

            const url = `${process.env.NEXT_PUBLIC_API_URL}/api/protected/admin/users`
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            console.log('📡 [loadUsers] Response status:', response.status)
            console.log('📡 [loadUsers] Response ok:', response.ok)

            if (response.ok) {
                const data = await response.json()
                console.log('✅ [loadUsers] API Response data:', data)

                if (data.success && data.data) {
                    console.log('📊 [loadUsers] Setting users:', data.data.length, 'users')
                    // Debug: ดูข้อมูล profile_image และ IDs
                    data.data.forEach((user, index) => {
                        const userId = user.user_id || user.officer_id || user.executive_id || user.admin_id
                        const hasProfileImage = user.profile_image ? 'มี' : 'ไม่มี'
                        const profileURL = user.profile_image ? `${process.env.NEXT_PUBLIC_API_URL}/api/upload/profile-image/${userId}/${user.role}` : 'ไม่มี'
                        console.log(`🖼️ [loadUsers] User ${index + 1}: ${user.first_name} ${user.last_name} - ID: ${userId}, Role: ${user.role}, Profile: ${hasProfileImage}, URL: ${profileURL}`)
                    })
                    setUsers(data.data)
                    filterUsers('all', data.data)
                } else {
                    console.log('⚠️ [loadUsers] API success false หรือไม่มี data:', data)
                }
            } else {
                const errorText = await response.text()
                console.log('❌ [loadUsers] Response not ok:', response.status, errorText)
            }
        } catch (error) {
            console.error('💥 [loadUsers] Error loading users:', error)
        } finally {
            setUsersLoading(false)
        }
    }

    // ฟังก์ชันกรองผู้ใช้ตาม dropdown filter
    const filterUsers = (tab, userList = users) => {
        console.log(`🔍 [filterUsers] กรองผู้ใช้ด้วย filter: ${tab}`)
        console.log(`📊 [filterUsers] จำนวนผู้ใช้ทั้งหมด: ${userList.length}`)
        
        let filtered = []

        switch (tab) {
            case 'all':
                filtered = userList
                break
            case 'user':
                filtered = userList.filter(u => u.role === 'user')
                break
            case 'officer':
                filtered = userList.filter(u => u.role === 'officer')
                break
            case 'executive':
                filtered = userList.filter(u => u.role === 'executive')
                break
            case 'admin':
                filtered = userList.filter(u => u.role === 'admin')
                break
            default:
                filtered = userList
        }

        console.log(`✅ [filterUsers] ผลลัพธ์การกรอง: ${filtered.length} คน`)
        setFilteredUsers(filtered)
        setActiveTab(tab)
    }

    // โหลดข้อมูลเมื่อ user ถูกตั้งค่าแล้ว
    useEffect(() => {
        if (user && user.role === 'admin') {
            loadStats()
            loadUsers()
        }
    }, [user])

    // Handle tab change
    const handleTabChange = (tab) => {
        filterUsers(tab)
        setCurrentPage(1) // รีเซ็ตไปหน้า 1 เมื่อเปลี่ยน tab
    }

    // Pagination functions
    const getCurrentPageUsers = () => {
        const indexOfLastUser = currentPage * usersPerPage
        const indexOfFirstUser = indexOfLastUser - usersPerPage
        return filteredUsers.slice(indexOfFirstUser, indexOfLastUser)
    }

    const getTotalPages = () => {
        return Math.ceil(filteredUsers.length / usersPerPage)
    }

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber)
    }

    // Handle edit user
    const handleEditUser = (userData) => {
        console.log('✏️ [handleEditUser] Clicked edit for user:', userData)
        console.log('✏️ [handleEditUser] User data keys:', Object.keys(userData))
        console.log('✏️ [handleEditUser] User data values:', {
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            position: userData.position,
            department: userData.department,
            role: userData.role
        })

        setEditingUser(userData)
        setShowEditModal(true)
    }

    // Handle delete user - แสดง confirmation modal สวยๆ
    const handleDeleteUser = async (userId, userRole, userData) => {
        // Custom confirm dialog
        const result = await showConfirmDialog(
            'คุณแน่ใจหรือที่จะลบผู้ใช้',
            `ข้อมูลของ ${userData.first_name} ${userData.last_name} จะถูกลบถาวร`
        )
        
        if (!result) return

        try {
            const token = authUtils.getToken()
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: userRole })
            })

            if (response.ok) {
                showSuccessAlert('ลบผู้ใช้สำเร็จ')
                
                // ตรวจสอบว่าหลังจากลบแล้ว หน้าปัจจุบันจะไม่มีข้อมูลหรือไม่
                const remainingUsersCount = filteredUsers.length - 1
                const totalPagesAfterDelete = Math.ceil(remainingUsersCount / usersPerPage)
                
                // ถ้าหน้าปัจจุบันมากกว่าจำนวนหน้าทั้งหมดหลังจากลบ ให้กลับไปหน้า 1
                if (currentPage > totalPagesAfterDelete && totalPagesAfterDelete > 0) {
                    setCurrentPage(totalPagesAfterDelete)
                } else if (remainingUsersCount === 0) {
                    // ถ้าไม่มีข้อมูลเหลือเลย ให้กลับไปหน้า 1
                    setCurrentPage(1)
                }
                
                // Reload data
                loadStats()
                loadUsers()
            } else {
                const errorData = await response.json()
                // แสดง error message ที่เฉพาะเจาะจง
                if (errorData.error === 'CANNOT_DELETE_LAST_ADMIN') {
                    showErrorAlert(errorData.message || 'ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายได้')
                } else {
                    showErrorAlert(errorData.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้')
                }
            }
        } catch (error) {
            console.error('Error deleting user:', error)
            showErrorAlert('เกิดข้อผิดพลาดในการลบผู้ใช้')
        }
    }

    console.log('🎨 [UserManagement] Render - loading:', loading, 'user:', !!user)

    if (loading) {
        return (
            <DashboardLayout user={user}>
                <ContentLoadingSpinner message="กำลังโหลดข้อมูลระบบจัดการผู้ใช้..." />
            </DashboardLayout>
        )
    }

    if (!user) {
        return null // จะ redirect ไป login แล้ว
    }

    return (
        <DashboardLayout user={user}>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
                    <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                        👥 จัดการผู้ใช้งาน
                    </h1>
                    <p className="text-indigo-100 text-sm lg:text-lg">
                        ระบบจัดการผู้ใช้งานและสิทธิ์การเข้าถึง - มหาวิทยาลัยราชภัฏมหาสารคาม
                    </p>
                </div>

                {/* User Statistics */}
                <UserStats stats={stats} loading={statsLoading} />

                {/* User Filters */}
                <UserFilters
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    onAddUser={() => {
                        console.log('🎯 [UserManagement] Opening Add User Modal!')
                        setShowAddModal(true)
                    }}
                />

                {/* Content based on active tab */}
                {activeTab === 'pending' ? (
                    <PendingUsersTab 
                        onSuccess={() => {
                            console.log('🔄 [UserManagement] PendingUsersTab success callback - refreshing data...')
                            loadStats()
                            loadUsers()
                        }}
                    />
                ) : (
                    <UserList
                        users={filteredUsers}
                        loading={usersLoading}
                        currentPage={currentPage}
                        usersPerPage={usersPerPage}
                        onEdit={handleEditUser}
                        onDelete={handleDeleteUser}
                        onPageChange={handlePageChange}
                    />
                )}

                {/* Add User Modal */}
                {showAddModal && (
                    <AddUserModal
                        isOpen={showAddModal}
                        onClose={() => setShowAddModal(false)}
                        onSuccess={() => {
                            loadStats()
                            loadUsers()
                        }}
                    />
                )}

                {/* Edit User Modal */}
                {showEditModal && editingUser && (
                    <>
                        {console.log('🚀 [Page] Rendering EditUserModal with data:', editingUser)}
                        <EditUserModal
                            isOpen={showEditModal}
                            onClose={() => {
                                setShowEditModal(false)
                                setEditingUser(null)
                            }}
                            userData={editingUser}
                            onSuccess={() => {
                                loadStats()
                                loadUsers()
                            }}
                        />
                    </>
                )}
            </div>
        </DashboardLayout>
    )
}