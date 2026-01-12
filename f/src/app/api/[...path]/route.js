// ===================================================================
// Next.js API Proxy - ซ่อน Backend URL จาก Client
// ===================================================================
// ไฟล์นี้ทำหน้าที่เป็น proxy layer ระหว่าง client และ backend
// - Client เรียก: /api/auth/login
// - Proxy forward ไป: http://localhost:8000/api/auth/login
// - Client ไม่รู้ backend URL จริง
// ===================================================================

import { NextResponse } from 'next/server'

// Backend URL (ซ่อนไว้ใน server-side only)
const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:5580'

export async function GET(request, { params }) {
  const resolvedParams = await params
  return proxyRequest(request, resolvedParams, 'GET')
}

export async function POST(request, { params }) {
  const resolvedParams = await params
  return proxyRequest(request, resolvedParams, 'POST')
}

export async function PUT(request, { params }) {
  const resolvedParams = await params
  return proxyRequest(request, resolvedParams, 'PUT')
}

export async function DELETE(request, { params }) {
  const resolvedParams = await params
  return proxyRequest(request, resolvedParams, 'DELETE')
}

export async function PATCH(request, { params }) {
  const resolvedParams = await params
  return proxyRequest(request, resolvedParams, 'PATCH')
}

async function proxyRequest(request, params, method) {
  try {
    // สร้าง URL สำหรับ backend
    const path = params.path.join('/')
    const searchParams = new URL(request.url).searchParams.toString()
    const backendUrl = `${BACKEND_URL}/api/${path}${searchParams ? `?${searchParams}` : ''}`

    // เตรียม headers
    const headers = new Headers()
    
    // Copy headers ที่จำเป็น
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      headers.set('Authorization', authHeader)
    }

    const contentType = request.headers.get('content-type')
    if (contentType) {
      headers.set('Content-Type', contentType)
    }

    // สำหรับ multipart/form-data ไม่ต้องตั้ง Content-Type (browser จะจัดการเอง)
    if (contentType && contentType.includes('multipart/form-data')) {
      headers.delete('Content-Type')
    }

    // เตรียม request options
    const requestOptions = {
      method,
      headers,
    }

    // เพิ่ม body สำหรับ POST, PUT, PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const contentType = request.headers.get('content-type')
      
      if (contentType && contentType.includes('multipart/form-data')) {
        // สำหรับ file upload
        requestOptions.body = await request.formData()
      } else if (contentType && contentType.includes('application/json')) {
        // สำหรับ JSON
        requestOptions.body = await request.text()
      } else {
        // Default
        requestOptions.body = await request.text()
      }
    }

    // Log request (เฉพาะ development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [API Proxy] ${method} ${path}`)
    }

    // ส่ง request ไปยัง backend
    const response = await fetch(backendUrl, requestOptions)

    // รับ response data
    const contentTypeResponse = response.headers.get('content-type')
    let data

    if (contentTypeResponse && contentTypeResponse.includes('application/json')) {
      data = await response.json()
    } else if (contentTypeResponse && contentTypeResponse.includes('image/')) {
      // สำหรับรูปภาพ
      data = await response.blob()
      return new NextResponse(data, {
        status: response.status,
        headers: {
          'Content-Type': contentTypeResponse,
        },
      })
    } else {
      data = await response.text()
    }

    // Log response (เฉพาะ development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [API Proxy] ${method} ${path} - Status: ${response.status}`)
    }

    // Return response พร้อม status code จาก backend
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      }
    })

  } catch (error) {
    console.error('❌ [API Proxy Error]:', error.message)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
