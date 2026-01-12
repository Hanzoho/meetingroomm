'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { AddressSelector } from './AddressSelector'
import { authUtils } from '@/lib/fetchData'

export default function EditUserModal({ isOpen, onClose, onSuccess, userData }) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        zip_code: '',
        position: '',
        department: '',
        role: 'user',
        // Address fields
        address: {
            province: null,
            district: null,
            subdistrict: null,
        }
    })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    // ข้อมูลตำแหน่งทั้งหมด - เหมือน AddUserModal
    const positions = {
        general: {
            label: '👤 บุคลากรทั่วไป',
            options: ['บุคลากร/อาจารย์ มหาวิทยาลัยราชภัฏมหาสารคาม']
        },
        executives: {
            label: '👨‍💼 ผู้บริหาร',
            options: [
                'ผู้บริหาร'
            ]
        },
        officers: {
            label: '👨‍💻 เจ้าหน้าที่ดูแลห้องประชุม',
            options: [
                'เจ้าหน้าที่ดูแลห้องประชุม'
            ]
        }
    }

    // ข้อมูลหน่วยงานทั้งหมด - เหมือน AddUserModal
    const departments = {
        faculties: {
            label: '🎓 คณะต่างๆ',
            options: [
                'คณะวิทยาศาสตร์ฯ',
                'คณะครุศาสตร์',
                'คณะวิทยาการจัดการ',
                'คณะมนุษยศาสตร์ฯ',
                'คณะเทคโนโลยีการเกษตร',
                'คณะรัฐศาสตร์ฯ',
                'คณะนิติศาสตร์',
                'คณะวิศวกรรมศาสตร์'
            ]
        },
        divisions: {
            label: '🏢 กองและศูนย์ต่างๆ',
            options: [
                'สำนักงานอธิการบดี',
                'กองกลาง',
                'กองคลัง',
                'กองนโยบายและแผน',
                'กองบริหารงานบุคคล',
                'กองพัฒนานักศึกษา',
                'ศูนย์สหกิจศึกษาและพัฒนอาชีพ',
                'ศูนย์เทคโนโลยีดิจิทัลและนวัตกรรม'
            ]
        },
        offices: {
            label: '📚 สำนักต่างๆ',
            options: [
                'สถาบันวิจัยและพัฒนา',
                'สำนักวิทยบริการและเทคโนโลยีสารสนเทศ',
                'สำนักศิลปะและวัฒนธรรม',
                'สำนักส่งเสริมวิชาการและงานทะเบียน'
            ]
        },
        others: {
            label: '🏛️ หน่วยงานอื่นๆ',
            options: [
                'งานประชาสัมพันธ์มหาวิทยาลัยราชภัฏมหาสารคาม',
                'สภาวิชาการ',
                'สภามหาวิทยาลัยราชภัฏมหาสารคาม',
                'หน่วยตรวจสอบภายใน'
            ]
        }
    }

    // โหลดข้อมูลผู้ใช้แบบเต็มเมื่อเปิด modal
    useEffect(() => {
        const loadFullUserData = async () => {
            if (!userData || !isOpen) return

            console.log('🔍 [EditUserModal] Loading full user data for:', userData)

            try {
                const token = localStorage.getItem('token')
                const userId = userData.user_id || userData.officer_id || userData.admin_id || userData.executive_id
                const role = userData.role

                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/admin/users/${userId}/${role}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })

                const result = await response.json()

                if (response.ok && result.success) {
                    console.log('✅ [EditUserModal] Full user data loaded:', result.data)
                    const fullUserData = result.data

                    setFormData({
                        first_name: fullUserData.first_name || '',
                        last_name: fullUserData.last_name || '',
                        email: fullUserData.email || '',
                        zip_code: fullUserData.zip_code?.toString() || '',
                        position: fullUserData.position || '',
                        department: fullUserData.department || '',
                        role: fullUserData.role || 'user',
                        province_id: fullUserData.province_id || null,
                        district_id: fullUserData.district_id || null,
                        subdistrict_id: fullUserData.subdistrict_id || null,
                        address: {
                            province: fullUserData.province_id && fullUserData.province_name ? {
                                province_id: fullUserData.province_id,
                                province_name: fullUserData.province_name
                            } : null,
                            district: fullUserData.district_id && fullUserData.district_name ? {
                                district_id: fullUserData.district_id,
                                district_name: fullUserData.district_name
                            } : null,
                            subdistrict: fullUserData.subdistrict_id && fullUserData.subdistrict_name ? {
                                subdistrict_id: fullUserData.subdistrict_id,
                                subdistrict_name: fullUserData.subdistrict_name
                            } : null,
                        }
                    })
                    setErrors({})
                } else {
                    console.error('❌ [EditUserModal] Failed to load full user data:', result.message)
                }
            } catch (error) {
                console.error('❌ [EditUserModal] Error loading full user data:', error)
            }
        }

        loadFullUserData()
    }, [userData, isOpen])

    // Legacy fallback - รีเซ็ตฟอร์มเมื่อ userData เปลี่ยน
    useEffect(() => {
        console.log('🔍 [EditUserModal] userData changed (fallback):', userData)
        if (userData && !isOpen) {
            // เช็คว่าข้อมูลไหนหายไป
            const missingFields = []
            if (!userData.zip_code) missingFields.push('zip_code')
            if (!userData.province_id) missingFields.push('province_id')
            if (!userData.district_id) missingFields.push('district_id')
            if (!userData.subdistrict_id) missingFields.push('subdistrict_id')
            if (missingFields.length > 0) {
                console.log('⚠️ [EditUserModal] Missing fields from API:', missingFields)
            }

            console.log('📍 [EditUserModal] Address fields from userData:', {
                province_id: userData.province_id,
                district_id: userData.district_id,
                subdistrict_id: userData.subdistrict_id,
                zip_code: userData.zip_code
            })

            console.log('📝 [EditUserModal] Setting form data:', {
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                email: userData.email || '',
                zip_code: userData.zip_code?.toString() || '',
                position: userData.position || '',
                department: userData.department || '',
                role: userData.role || 'user',
                province_id: userData.province_id || '',
                district_id: userData.district_id || '',
                subdistrict_id: userData.subdistrict_id || ''
            })

            setFormData({
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                email: userData.email || '',
                zip_code: userData.zip_code?.toString() || '',
                position: userData.position || '',
                department: userData.department || '',
                role: userData.role || 'user',
                province_id: userData.province_id || '',
                district_id: userData.district_id || '',
                subdistrict_id: userData.subdistrict_id || '',
                address: {
                    province: userData.province_id ? {
                        province_id: userData.province_id,
                        province_name: `จังหวัด ID ${userData.province_id}`
                    } : null,
                    district: userData.district_id ? {
                        district_id: userData.district_id,
                        district_name: `อำเภอ ID ${userData.district_id}`
                    } : null,
                    subdistrict: userData.subdistrict_id ? {
                        subdistrict_id: userData.subdistrict_id,
                        subdistrict_name: `ตำบล ID ${userData.subdistrict_id}`
                    } : null,
                }
            })
            setErrors({})
        }
    }, [userData])

    // ฟังก์ชันสำหรับจัดการ Address Selector - ใช้ useCallback เพื่อป้องกัน re-render
    const handleAddressChange = useCallback((addressData) => {
        console.log('📍 [EditUserModal] Address changed:', addressData)

        setFormData(prev => ({
            ...prev,
            province_id: addressData?.province?.province_id || null,
            district_id: addressData?.district?.district_id || null,
            subdistrict_id: addressData?.subdistrict?.subdistrict_id || null,
            address: addressData
        }))
    }, [])

    const handleSelectChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))

        // ล้าง error เมื่อเลือกแล้ว
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }))
        }
    }, [errors])

    // Memoized address value เพื่อป้องกัน re-render
    const addressValue = useMemo(() => {
        return formData.address
    }, [formData.address])

    // Memoized zip code change handler
    const handleZipCodeChange = useCallback((zipCode) => {
        setFormData(prev => ({ ...prev, zip_code: zipCode || '' }))
    }, [])

    // Handle overlay click to close modal
    const handleOverlayClick = useCallback((e) => {
        // ปิด modal เมื่อกดที่ overlay (ไม่ใช่ modal content)
        if (e.target === e.currentTarget) {
            onClose()
        }
    }, [onClose])

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEscKey = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscKey)
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey)
        }
    }, [isOpen, onClose])



    const handleChange = (e) => {
        const { id, value } = e.target
        setFormData(prev => ({
            ...prev,
            [id]: value
        }))

        // ล้าง error เมื่อพิมพ์
        if (errors[id]) {
            setErrors(prev => ({
                ...prev,
                [id]: ''
            }))
        }
    }

    // ตรวจสอบอีเมลซ้ำ
    const checkDuplicateData = async () => {
        try {
            const token = authUtils.getToken()
            const currentUserId = userData.user_id || userData.officer_id || userData.executive_id || userData.admin_id

            // เช็คอีเมลซ้ำ
            const emailCheckResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/admin/check-email`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: formData.email,
                    userId: currentUserId,
                    role: userData.role
                })
            })

            const emailCheck = await emailCheckResponse.json()

            const newErrors = {}

            if (!emailCheck.available) {
                newErrors.email = 'อีเมลนี้ถูกใช้แล้ว'
            }

            return newErrors
        } catch (error) {
            console.error('❌ Error checking duplicate data:', error)
            return {}
        }
    }

    // ตรวจสอบข้อมูล
    const validateForm = async () => {
        const newErrors = {}

        if (!formData.first_name.trim()) {
            newErrors.first_name = 'กรุณากรอกชื่อ'
        }

        if (!formData.last_name.trim()) {
            newErrors.last_name = 'กรุณากรอกนามสกุล'
        }

        if (!formData.email.trim()) {
            newErrors.email = 'กรุณากรอกอีเมล'
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง'
        }

        if (!formData.position.trim()) {
            newErrors.position = 'กรุณาเลือกตำแหน่ง'
        }

        if (!formData.department.trim()) {
            newErrors.department = 'กรุณาเลือกหน่วยงาน'
        }

        // ถ้า basic validation ผ่าน ให้เช็คข้อมูลซ้ำ
        if (Object.keys(newErrors).length === 0) {
            const duplicateErrors = await checkDuplicateData()
            Object.assign(newErrors, duplicateErrors)
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!(await validateForm())) {
            return
        }

        setLoading(true)
        setErrors({})

        try {
            const token = authUtils.getToken()
            const userId = userData.user_id || userData.officer_id || userData.executive_id || userData.admin_id

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/protected/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    email: formData.email,
                    department: formData.department,
                    originalRole: userData.role,
                    zip_code: formData.zip_code ? parseInt(formData.zip_code, 10) : null,
                    province_id: formData.address?.province?.province_id || null,
                    district_id: formData.address?.district?.district_id || null,
                    subdistrict_id: formData.address?.subdistrict?.subdistrict_id || null
                })
            })

            const data = await response.json()

            if (response.ok && data.success) {
                // แสดง Success Modal
                showEditSuccessModal()
                onSuccess()
                onClose()
            } else {
                if (data.error && data.error.includes('email')) {
                    setErrors({
                        email: 'อีเมลนี้มีผู้ใช้อื่นใช้แล้ว'
                    })
                } else {
                    showErrorModal('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถแก้ไขข้อมูลได้')
                }
            }
        } catch (error) {
            console.error('Error updating user:', error)
            showErrorModal('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์')
        } finally {
            setLoading(false)
        }
    }

    // จัดการ body scroll lock เมื่อ modal เปิด/ปิด
    useEffect(() => {
        if (isOpen) {
            // เก็บ scroll position ปัจจุบัน
            const scrollY = window.scrollY
            
            document.body.classList.add('modal-open')
            document.body.style.top = `-${scrollY}px`
            
            // ป้องกัน wheel event จาก propagation - ให้ scroll ได้เฉพาะใน modal
            const preventDefault = (e) => {
                if (!e.target.closest('.edit-modal-content')) {
                    e.preventDefault()
                }
            }
            
            document.addEventListener('wheel', preventDefault, { passive: false })
            document.addEventListener('touchmove', preventDefault, { passive: false })
            
            return () => {
                document.body.classList.remove('modal-open')
                document.body.style.top = ''
                window.scrollTo(0, scrollY)
                document.removeEventListener('wheel', preventDefault)
                document.removeEventListener('touchmove', preventDefault)
            }
        } else {
            document.body.classList.remove('modal-open')
        }

        return () => {
            document.body.classList.remove('modal-open')
        }
    }, [isOpen])

    // เพิ่ม CSS animation styles และแก้ปัญหา z-index
    if (typeof document !== 'undefined' && !document.querySelector('#edit-modal-styles')) {
        const style = document.createElement('style')
        style.id = 'edit-modal-styles'
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { 
                    opacity: 0;
                    transform: translateY(20px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes successBounce {
                0%, 20%, 53%, 100% {
                    animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
                    transform: translate3d(0, 0, 0) scale(1);
                }
                40%, 43% {
                    animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
                    transform: translate3d(0, -8px, 0) scale(1.02);
                }
                70% {
                    animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
                    transform: translate3d(0, -4px, 0) scale(1.01);
                }
                80% {
                    transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
                    transform: translate3d(0, 0, 0) scale(1);
                }
                90% {
                    transform: translate3d(0, -1px, 0) scale(1);
                }
            }
            
            .animate-fade-in {
                animation: fadeIn 0.3s ease-out;
            }
            
            .animate-slide-up {
                animation: slideUp 0.4s ease-out;
            }
            
            .animate-success-bounce {
                animation: successBounce 0.8s ease-in-out;
            }
            
            /* แก้ปัญหา dropdown ใน Modal - ลบ scrollbar ที่ซ้ำ */
            .edit-modal-content {
                contain: layout style paint;
                overflow: hidden;
            }
            
            /* ทำให้ select dropdown อยู่ในขอบเขตที่ถูกต้อง */
            .edit-modal-content select {
                position: relative;
                z-index: 100;
                background: white;
                border: 1px solid #d1d5db;
                border-radius: 0.5rem;
            }
            
            .edit-modal-content select:focus {
                outline: none;
                border-color: #6366f1;
                ring: 2px;
                ring-color: rgba(99, 102, 241, 0.2);
            }
            
            /* แก้ไขให้ modal scroll ได้แม้เปิด dropdown */
            .edit-modal-overlay {
                touch-action: manipulation;
                overscroll-behavior: contain;
                overflow-y: auto;
            }
            
            /* ป้องกัน body scroll เมื่อ modal เปิด */
            body.modal-open {
                overflow: hidden !important;
                position: fixed !important;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            /* Modal overlay - ป้องกัน scroll propagation */
            .edit-modal-overlay {
                overflow-y: auto !important;
                pointer-events: auto !important;
                cursor: pointer !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                margin: 0 !important;
                padding: 1rem !important;
                overscroll-behavior: contain !important;
            }
            
            /* Modal content - จัดการ scroll อย่างถูกต้อง */
            .edit-modal-content {
                pointer-events: auto !important;
                max-height: calc(100vh - 4rem) !important;
                cursor: default !important;
                position: relative !important;
                overscroll-behavior: contain !important;
                margin: 2rem auto !important;
                width: calc(100% - 2rem) !important;
                max-width: 42rem !important;
            }
            
            /* ทำให้ dropdown ใน modal ทำงานได้ปกติ แต่ไม่ block scroll */
            .edit-modal-content [role="listbox"],
            .edit-modal-content [data-state="open"],
            .edit-modal-content select,
            .edit-modal-content [role="combobox"] {
                z-index: 9999;
                position: relative;
                pointer-events: auto;
            }
            
            /* ให้ dropdown content ไม่ block modal scroll */
            .edit-modal-content [data-radix-popper-content-wrapper] {
                pointer-events: none !important;
            }
            
            .edit-modal-content [data-radix-popper-content-wrapper] > * {
                pointer-events: auto !important;
            }
            
            /* AddressSelector dropdown support ใน modal */
            .edit-modal-content .address-selector-dropdown {
                position: fixed !important;
                z-index: 99999 !important;
                max-height: 300px !important;
                overflow-y: auto !important;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
            }
            
            /* Form scrolling - ให้ modal scroll ได้เสมอ */
            .edit-modal-content form {
                display: flex !important;
                flex-direction: column !important;
                flex: 1 !important;
                overflow: hidden !important;
            }
            
            .edit-modal-content form > div:first-child {
                flex: 1 !important;
                overflow-y: auto !important;
                overscroll-behavior: contain !important;
                scroll-behavior: smooth !important;
            }
            
            /* เมื่อ dropdown เปิด ให้ modal ยังคง scroll ได้ */
            .edit-modal-content:has(.address-selector-dropdown) form > div:first-child {
                overflow-y: auto !important;
                pointer-events: auto !important;
            }
            
            /* AddressSelector dropdown - ให้แสดงได้ปกติ */
            .edit-modal-content .address-selector-dropdown {
                position: absolute !important;
                z-index: 9999 !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            /* ลบ scrollbar ซ้ำใน dropdown */
            .edit-modal-content .address-selector-dropdown .max-h-60 {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }
            
            .edit-modal-content .address-selector-dropdown .max-h-60::-webkit-scrollbar {
                display: none !important;
            }
            
            /* ให้ dropdown container แสดง dropdown ได้ */
            .edit-modal-content .relative {
                position: relative !important;
                overflow: visible !important;
            }
            

            

            

            
            /* Smooth transitions สำหรับ AddressSelector */
            .edit-modal-content [role="combobox"],
            .edit-modal-content select {
                transition: all 0.2s ease-in-out !important;
            }
            
            /* ป้องกัน flash/flicker ของ dropdown */
            .edit-modal-content [data-radix-select-content],
            .edit-modal-content [role="listbox"] {
                animation: none !important;
                transition: opacity 0.15s ease-in-out !important;
            }
            
            /* ทำให้ form fields มี transition นิ่ง */
            .edit-modal-content input,
            .edit-modal-content select,
            .edit-modal-content [role="combobox"] {
                transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out !important;
            }
        `
        document.head.appendChild(style)
    }



    console.log('🎨 [EditUserModal] Render - isOpen:', isOpen, 'userData:', !!userData, 'formData:', formData)

    if (!isOpen) return null

    return (
        <div
            className="fixed top-0 left-0 right-0 bottom-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in edit-modal-overlay"
            onWheel={(e) => {
                // ให้ scroll ได้เฉพาะใน modal content
                if (!e.target.closest('.edit-modal-content')) {
                    e.preventDefault()
                    e.stopPropagation()
                }
            }}
        >
            <div 
                className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col animate-slide-up edit-modal-content relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
            >
                {/* Header - เปลี่ยนสีเป็น Orange เหมือน Edit */}
                <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-t-3xl px-8 py-6 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center">
                                <span className="bg-white/20 rounded-xl w-12 h-12 flex items-center justify-center mr-4 shadow-lg">
                                    ✏️
                                </span>
                                แก้ไขข้อมูลผู้ใช้
                            </h2>

                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl w-10 h-10 flex items-center justify-center transition-all duration-200"
                        >
                            <span className="text-2xl">✕</span>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-8 space-y-8 overflow-y-auto flex-1">
                        {/* ข้อมูลส่วนตัว */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                            <h4 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
                                <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl w-10 h-10 flex items-center justify-center mr-3 shadow-lg">👤</span>
                                ข้อมูลส่วนตัว
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label htmlFor="first_name" className="text-gray-700 font-semibold text-base">
                                        ชื่อจริง <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="first_name"
                                        type="text"
                                        placeholder="กรอกชื่อจริง"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className={`w-full border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium placeholder:text-gray-500 focus:ring-2 transition-all duration-200 bg-white ${errors.first_name
                                                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                                                : 'border-gray-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-indigo-200'
                                            }`}
                                    />
                                    {errors.first_name && (
                                        <p className="text-red-500 text-sm mt-1 flex items-center">
                                            <span className="mr-1">⚠️</span>
                                            {errors.first_name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label htmlFor="last_name" className="text-gray-700 font-semibold text-base">
                                        นามสกุล <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="last_name"
                                        type="text"
                                        placeholder="กรอกนามสกุล"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className={`w-full border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium placeholder:text-gray-500 focus:ring-2 transition-all duration-200 bg-white ${errors.last_name
                                                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                                                : 'border-gray-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-indigo-200'
                                            }`}
                                    />
                                    {errors.last_name && (
                                        <p className="text-red-500 text-sm mt-1 flex items-center">
                                            <span className="mr-1">⚠️</span>
                                            {errors.last_name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <label htmlFor="email" className="text-gray-700 font-semibold text-base">
                                        อีเมล <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="example@email.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className={`w-full border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium placeholder:text-gray-500 focus:ring-2 transition-all duration-200 bg-white ${errors.email
                                                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                                                : 'border-gray-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-indigo-200'
                                            }`}
                                    />
                                    {errors.email && (
                                        <p className="text-red-500 text-sm mt-1 flex items-center">
                                            <span className="mr-1">⚠️</span>
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                            </div>
                        </div>
                                    {/* ตำแหน่งและหน่วยงาน */}
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                            <h4 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
                                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl w-10 h-10 flex items-center justify-center mr-3 shadow-lg">🏢</span>
                                ตำแหน่งและหน่วยงาน
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-gray-700 font-semibold text-base">
                                        ตำแหน่ง
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.position}
                                        disabled={true}
                                        className="w-full border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium bg-gray-100 border-gray-300 cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-gray-700 font-semibold text-base">
                                        หน่วยงานที่สังกัด <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.department}
                                        onChange={(e) => handleSelectChange('department', e.target.value)}
                                        disabled={loading}
                                        className={`w-full border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium bg-white focus:ring-2 transition-all duration-200 ${errors.department
                                                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                                                : 'border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-purple-200'
                                            }`}
                                    >
                                        <option value="">-- เลือกหน่วยงานที่สังกัด --</option>
                                        {Object.entries(departments).map(([key, group]) => (
                                            <optgroup key={key} label={group.label}>
                                                {group.options.map((dept, index) => (
                                                    <option key={`${key}-${index}`} value={dept}>
                                                        {dept}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    {errors.department && (
                                        <p className="text-red-500 text-sm mt-1 flex items-center">
                                            <span className="mr-1">⚠️</span>
                                            {errors.department}
                                        </p>
                                    )}
                                </div>
                            </div>


                        </div>

                        {/* ที่อยู่ */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                            <h4 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
                                <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl w-10 h-10 flex items-center justify-center mr-3 shadow-lg">📍</span>
                                ที่อยู่
                            </h4>

                            <div className="grid grid-cols-1 gap-6">
                                <AddressSelector
                                    onChange={handleAddressChange}
                                    value={addressValue}
                                    onZipCodeChange={handleZipCodeChange}
                                    disabled={loading}
                                />

                                <div className="space-y-3">
                                    <label htmlFor="zip_code" className="text-gray-700 font-semibold text-base">
                                        รหัสไปรษณีย์
                                    </label>
                                    <input
                                        id="zip_code"
                                        type="text"
                                        placeholder="จะถูกเติมอัตโนมัติเมื่อเลือกตำบล"
                                        pattern="[0-9]{5}"
                                        maxLength="5"
                                        value={formData.zip_code}
                                        onChange={handleChange}
                                        disabled={loading}
                                        readOnly
                                        className="w-full border rounded-lg px-4 py-2.5 text-sm text-gray-900 font-medium placeholder:text-gray-500 focus:ring-2 transition-all duration-200 bg-gray-50 border-gray-300 hover:border-green-400 focus:border-green-500 focus:ring-green-200"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="bg-gray-50 border-t border-gray-200 px-8 py-6 mt-auto rounded-b-3xl flex-shrink-0">
                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                )}
                                {loading ? (
                                    'กำลังบันทึก...'
                                ) : (
                                    <>
                                        <span>💾</span>
                                        บันทึกการแก้ไข
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

// Success Modal สำหรับการแก้ไขสำเร็จ
const showEditSuccessModal = () => {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in'
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-96 mx-4 animate-success-bounce">
            <div class="px-8 py-8 text-center">
                <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-800 mb-6">แก้ไขข้อมูลสำเร็จ</h3>
                <button onclick="this.closest('.fixed').remove()" class="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 transform">
                    <span class="flex items-center justify-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        เรียบร้อย!
                    </span>
                </button>
            </div>
        </div>
    `
    document.body.appendChild(modal)

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (modal && modal.parentNode) {
            modal.remove()
        }
    }, 3000)
}

// Error Modal
const showErrorModal = (title, message) => {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in'
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-md mx-4">
            <div class="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-4 rounded-t-2xl">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold">${title}</h3>
                    </div>
                </div>
            </div>
            <div class="px-6 py-6">
                <p class="text-gray-700 text-base leading-relaxed mb-4">${message}</p>
                <div class="flex justify-center">
                    <button onclick="this.closest('.fixed').remove()" class="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md">
                        ตกลง
                    </button>
                </div>
            </div>
        </div>
    `
    document.body.appendChild(modal)

    // Auto remove after 4 seconds
    setTimeout(() => {
        if (modal && modal.parentNode) {
            modal.remove()
        }
    }, 4000)
}