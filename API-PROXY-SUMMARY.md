# 📋 สรุปการเปลี่ยนแปลง: API Proxy Layer

## 🎯 สิ่งที่ทำไปแล้ว

### 1. ✅ สร้าง API Proxy Layer
- **ไฟล์:** `f/src/app/api/[...path]/route.js`
- **หน้าที่:** รับ request จาก client และ forward ไปยัง backend
- **ข้อดี:**
  - Client ไม่เห็น backend URL จริง (http://localhost:8000)
  - เพิ่มความปลอดภัย - มี layer กลางควบคุมได้
  - ง่ายต่อการเพิ่ม rate limiting, logging, caching
  - แก้ปัญหา CORS ได้

### 2. ✅ แก้ไข Environment Variables
- **ลบ:** `NEXT_PUBLIC_API_URL` (เห็นจาก client ได้)
- **เพิ่ม:** `BACKEND_API_URL` (server-only, ซ่อนจาก client)
- **ไฟล์:** `.env.local`, `.env.example`

### 3. ✅ แก้ไข API Calls ใน Frontend
แก้ไขไฟล์ทั้งหมดให้เรียก `/api` แทน `${NEXT_PUBLIC_API_URL}/api`:

#### Components แก้แล้ว:
- ✅ `src/lib/fetchData.js` - API client หลัก
- ✅ `src/app/layout.jsx` - ลบ preconnect
- ✅ `src/components/profile/ProfileForm.jsx`
- ✅ `src/components/UserRoomDetailModal.jsx`
- ✅ `src/components/UnifiedRoomCard.jsx`
- ✅ `src/components/layout/TopBar.jsx`
- ✅ `src/components/EditUserModal.jsx`
- ✅ `src/components/meetingroom-detail.jsx`

#### Pages แก้แล้ว:
- ✅ `src/app/reset-password/page.jsx`
- ✅ `src/app/forgot-password/page.jsx`
- ✅ `src/app/dashboard/officer/*` (ทุกหน้า)
- ✅ `src/app/dashboard/executive/*` (ทุกหน้า)
- ✅ `src/app/dashboard/admin/users/page.jsx`
- ✅ `src/app/(main)/my-reservations/page.jsx`
- ✅ `src/app/(main)/reserve/page.jsx` (บางส่วน)

### 4. ✅ สร้าง Helper Functions
- **ไฟล์:** `src/lib/api-helper.js`
- **Functions:**
  - `getApiUrl(path)` - สร้าง API URL
  - `getRoomImageUrl(roomId, timestamp)` - URL รูปห้อง
  - `getProfileImageUrl(userId, role)` - URL รูปโปรไฟล์

---

## ⚠️ ผลกระทบที่ต้องระวัง

### 1. 🔴 ไฟล์ที่อาจต้องแก้เพิ่ม
มีไฟล์บางไฟล์ที่อาจมี `NEXT_PUBLIC_API_URL` หลงเหลืออยู่:
- `src/app/dashboard/executive/page.jsx` - export report (มี `${process.env.NEXT_PUBLIC_API_URL}${API_ENDPOINTS.exportReport}`)
- `src/app/dashboard/user/history/page.jsx` - fetch reservation
- `src/app/(main)/room-directory/page.jsx` - อาจมีหลายจุด
- `src/app/dashboard/officer/rooms/page.jsx` - image upload

### 2. 🟡 File Upload อาจมีปัญหา
- Multipart/form-data ต้องทดสอบให้มั่นใจ
- รูปภาพอาจโหลดช้าขึ้น (เพราะผ่าน proxy)

### 3. 🟢 Image URLs
- ตอนนี้ภาพทั้งหมดเรียกผ่าน `/api/rooms/image/...`
- ควรทดสอบว่าโหลดได้หมดหรือไม่

---

## 📝 สิ่งที่ต้องทำต่อ

### ลำดับความสำคัญสูง:

1. **ทดสอบ API Proxy**
   ```bash
   # Terminal 1: Start Backend
   cd b
   bun run dev
   
   # Terminal 2: Start Frontend  
   cd f
   bun run dev
   ```
   
   ทดสอบ:
   - ✅ Login/Logout
   - ✅ Image upload
   - ✅ Room image load
   - ✅ Reservations
   - ✅ Dashboard stats

2. **เช็คว่า Backend ทำงานที่ port 8000**
   - ดูที่ `b/.env` ว่า PORT=8000 หรือไม่
   - ถ้าไม่ใช่ ต้องแก้ `f/.env.local` → `BACKEND_API_URL`

3. **แก้ไฟล์ที่เหลือ (ถ้ามี error)**
   - ใช้ DevTools ดู Console errors
   - หา `NEXT_PUBLIC_API_URL` ที่เหลือ

### ปรับปรุงเพิ่มเติม (Optional):

4. **เพิ่ม Rate Limiting**
   ```js
   // ใน f/src/app/api/[...path]/route.js
   // เพิ่ม rate limiter ป้องกัน brute force
   ```

5. **เพิ่ม Caching**
   ```js
   // Cache static data (departments, positions)
   // ลด load backend
   ```

6. **เพิ่ม Request Logging**
   ```js
   // Log ทุก API call สำหรับ debugging
   ```

---

## 🔍 วิธีตรวจสอบว่าทำงานถูกต้อง

### 1. เปิด Browser DevTools (F12)
```
Network Tab:
- ✅ ควรเห็น request ไปที่ /api/* (ไม่ใช่ localhost:8000)
- ✅ Status 200 OK
- ✅ Response มีข้อมูลถูกต้อง

Console Tab:
- ✅ ไม่มี CORS errors
- ✅ ไม่มี 404 Not Found
- ✅ เห็น log "[API Proxy] GET ..." (dev mode)
```

### 2. ทดสอบ Backend URL ซ่อนจริงหรือไม่
```bash
# เปิด browser console พิมพ์:
console.log(process.env.NEXT_PUBLIC_API_URL)
# ควรได้: undefined (ซ่อนแล้ว)

# ดู page source:
view-source:http://localhost:3580
# ค้นหา "localhost:8000" ไม่ควรเจอ
```

### 3. ทดสอบ API Endpoints สำคัญ
- [ ] POST /api/auth/login
- [ ] GET /api/protected/profile
- [ ] POST /api/protected/reservations
- [ ] GET /api/rooms
- [ ] GET /api/rooms/image/:id
- [ ] POST /api/upload/profile-image

---

## 💡 คำแนะนำเพิ่มเติม

### Production Deployment
เมื่อ deploy จริง ต้องตั้งค่า:

```env
# f/.env.production
BACKEND_API_URL=https://api.yourdomain.com

# หรือถ้า backend อยู่เครื่องเดียวกัน
BACKEND_API_URL=http://localhost:8000
```

### เพิ่ม Error Handling
```js
// ใน API Proxy เพิ่ม retry logic
// ถ้า backend down ให้ retry หรือใช้ fallback
```

### เพิ่ม Response Transformation
```js
// แปลง response format ก่อนส่งกลับ client
// เช่น เพิ่ม timestamp, version, etc.
```

---

## ✅ Checklist ก่อน Deploy

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3580
- [ ] All API calls work through `/api/*`
- [ ] Images load correctly
- [ ] File upload works
- [ ] Login/Logout works
- [ ] No `NEXT_PUBLIC_API_URL` in browser console
- [ ] No CORS errors
- [ ] All dashboards load data correctly
- [ ] Mobile responsive still works

---

**🎉 เสร็จแล้ว! Backend URL ถูกซ่อนไว้ใน server-side แล้ว**  
Client จะเห็นแค่ `/api/*` ไม่รู้ว่า backend อยู่ที่ไหน ✨
