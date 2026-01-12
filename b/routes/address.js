// ===================================================================
// Address Routes - API สำหรับข้อมูลที่อยู่ (จังหวัด, อำเภอ, ตำบล)
// ===================================================================

import { Elysia } from 'elysia'
import prisma from '../lib/prisma.js'

export const addressRoutes = new Elysia({ prefix: '/address' })
    // ===================================================================
    // GET /api/address/provinces - ดึงรายการจังหวัดทั้งหมด
    // ===================================================================
    .get('/provinces', async ({ set }) => {
        try {
            const provinces = await prisma.province.findMany({
                select: {
                    province_id: true,
                    province_name: true,
                },
                orderBy: {
                    province_name: 'asc',
                },
            })

            return {
                success: true,
                data: provinces,
                count: provinces.length,
            }
        } catch (error) {
            console.error('Error fetching provinces:', error)
            set.status = 500
            return {
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลจังหวัด',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            }
        }
    })

    // ===================================================================
    // GET /api/address/districts/:provinceId - ดึงรายการอำเภอในจังหวัดที่ระบุ
    // ===================================================================
    .get('/districts/:provinceId', async ({ params, set }) => {
        try {
            const { provinceId } = params

            // ตรวจสอบว่าจังหวัดมีอยู่จริง
            const province = await prisma.province.findUnique({
                where: { province_id: parseInt(provinceId) },
                select: { province_id: true, province_name: true },
            })

            if (!province) {
                set.status = 404
                return {
                    success: false,
                    message: 'ไม่พบจังหวัดที่ระบุ',
                }
            }

            const districts = await prisma.district.findMany({
                where: {
                    province_id: parseInt(provinceId),
                },
                select: {
                    district_id: true,
                    district_name: true,
                },
                orderBy: {
                    district_name: 'asc',
                },
            })

            return {
                success: true,
                data: districts,
                count: districts.length,
                province: province,
            }
        } catch (error) {
            console.error('Error fetching districts:', error)
            set.status = 500
            return {
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลอำเภอ',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            }
        }
    })

    // ===================================================================
    // GET /api/address/subdistricts/:districtId - ดึงรายการตำบลในอำเภอที่ระบุ
    // ===================================================================
    .get('/subdistricts/:districtId', async ({ params, set }) => {
        try {
            const { districtId } = params

            // ตรวจสอบว่าอำเภอมีอยู่จริง
            const district = await prisma.district.findUnique({
                where: { district_id: parseInt(districtId) },
                select: {
                    district_id: true,
                    district_name: true,
                    province: {
                        select: { province_id: true, province_name: true }
                    }
                },
            })

            if (!district) {
                set.status = 404
                return {
                    success: false,
                    message: 'ไม่พบอำเภอที่ระบุ',
                }
            }

            const subdistricts = await prisma.subdistrict.findMany({
                where: {
                    district_id: parseInt(districtId),
                },
                select: {
                    subdistrict_id: true,
                    subdistrict_name: true,
                    zip_code: true,
                },
                orderBy: {
                    subdistrict_name: 'asc',
                },
            })

            return {
                success: true,
                data: subdistricts,
                count: subdistricts.length,
                district: district,
            }
        } catch (error) {
            console.error('Error fetching subdistricts:', error)
            set.status = 500
            return {
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตำบล',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            }
        }
    })

    // ===================================================================
    // GET /api/address/search - ค้นหาที่อยู่
    // Query parameters: q (คำค้นหา), type (province|district|subdistrict)
    // ===================================================================
    .get('/search', async ({ query, set }) => {
        try {
            const { q, type } = query

            if (!q || q.trim().length < 2) {
                set.status = 400
                return {
                    success: false,
                    message: 'กรุณาระบุคำค้นหาอย่างน้อย 2 ตัวอักษร',
                }
            }

            const searchTerm = q.trim()
            const results = {}

            // ค้นหาจังหวัด
            if (!type || type === 'province') {
                const provinces = await prisma.province.findMany({
                    where: {
                        province_name: {
                            contains: searchTerm,
                            mode: 'insensitive',
                        },
                    },
                    select: {
                        province_id: true,
                        province_name: true,
                    },
                    take: 10,
                })
                results.provinces = provinces
            }

            // ค้นหาอำเภอ
            if (!type || type === 'district') {
                const districts = await prisma.district.findMany({
                    where: {
                        district_name: {
                            contains: searchTerm,
                            mode: 'insensitive',
                        },
                    },
                    select: {
                        district_id: true,
                        district_name: true,
                        province: {
                            select: {
                                province_id: true,
                                province_name: true,
                            },
                        },
                    },
                    take: 10,
                })
                results.districts = districts
            }

            // ค้นหาตำบล
            if (!type || type === 'subdistrict') {
                const subdistricts = await prisma.subdistrict.findMany({
                    where: {
                        subdistrict_name: {
                            contains: searchTerm,
                            mode: 'insensitive',
                        },
                    },
                    select: {
                        subdistrict_id: true,
                        subdistrict_name: true,
                        zip_code: true,
                        district: {
                            select: {
                                district_id: true,
                                district_name: true,
                                province: {
                                    select: {
                                        province_id: true,
                                        province_name: true,
                                    },
                                },
                            },
                        },
                    },
                    take: 10,
                })
                results.subdistricts = subdistricts
            }

            return {
                success: true,
                data: results,
                searchTerm: searchTerm,
            }
        } catch (error) {
            console.error('Error searching address:', error)
            set.status = 500
            return {
                success: false,
                message: 'เกิดข้อผิดพลาดในการค้นหาข้อมูลที่อยู่',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            }
        }
    })

    // ===================================================================
    // GET /api/address/full/:subdistrictId - ดึงข้อมูลที่อยู่แบบเต็ม
    // ===================================================================
    .get('/full/:subdistrictId', async ({ params, set }) => {
        try {
            const { subdistrictId } = params

            const fullAddress = await prisma.subdistrict.findUnique({
                where: { subdistrict_id: parseInt(subdistrictId) },
                select: {
                    subdistrict_id: true,
                    subdistrict_name: true,
                    zip_code: true,
                    district: {
                        select: {
                            district_id: true,
                            district_name: true,
                            province: {
                                select: {
                                    province_id: true,
                                    province_name: true,
                                },
                            },
                        },
                    },
                },
            })

            if (!fullAddress) {
                set.status = 404
                return {
                    success: false,
                    message: 'ไม่พบข้อมูลตำบลที่ระบุ',
                }
            }

            // จัดรูปแบบข้อมูลให้อ่านง่าย
            const formatted = {
                subdistrict: {
                    id: fullAddress.subdistrict_id,
                    name: fullAddress.subdistrict_name,
                },
                district: {
                    id: fullAddress.district.district_id,
                    name: fullAddress.district.district_name,
                },
                province: {
                    id: fullAddress.district.province.province_id,
                    name: fullAddress.district.province.province_name,
                },
                zip_code: fullAddress.zip_code,
                full_text: `ตำบล${fullAddress.subdistrict_name} อำเภอ${fullAddress.district.district_name} จังหวัด${fullAddress.district.province.province_name}${fullAddress.zip_code ? ` ${fullAddress.zip_code}` : ''}`,
            }

            return {
                success: true,
                data: formatted,
            }
        } catch (error) {
            console.error('Error fetching full address:', error)
            set.status = 500
            return {
                success: false,
                message: 'เกิดข้อผิดพลาดในการดึงข้อมูลที่อยู่',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            }
        }
    })