#!/bin/bash

# ==========================================
# Database Backup Script ก่อน Migration
# ==========================================
# ใช้สคริปต์นี้ก่อนรัน prisma migrate deploy ทุกครั้ง

# ตั้งค่า
BACKUP_DIR="./db-backups"
DATE=$(date +"%Y%m%d_%H%M%S")
DB_NAME="meeting_db"

# สร้างโฟลเดอร์ backup ถ้ายังไม่มี
mkdir -p $BACKUP_DIR

echo "🔄 สำรองข้อมูล database ก่อน migration..."

# สำรองข้อมูล (PostgreSQL)
pg_dump $DATABASE_URL > "$BACKUP_DIR/backup_${DATE}.sql"

if [ $? -eq 0 ]; then
    echo "✅ สำรองข้อมูลเสร็จแล้ว: $BACKUP_DIR/backup_${DATE}.sql"
    
    # รัน migration
    echo "🚀 รัน Prisma migration..."
    npx prisma migrate deploy
    
    if [ $? -eq 0 ]; then
        echo "✅ Migration สำเร็จ!"
    else
        echo "❌ Migration ล้มเหลว! กำลังกู้คืนข้อมูล..."
        psql $DATABASE_URL < "$BACKUP_DIR/backup_${DATE}.sql"
        echo "🔄 กู้คืนข้อมูลเสร็จแล้ว"
    fi
else
    echo "❌ การสำรองข้อมูลล้มเหลว! ยกเลิก migration"
fi