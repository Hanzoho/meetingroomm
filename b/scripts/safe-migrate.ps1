# ==========================================
# Database Backup Script ก่อน Migration (Windows PowerShell)
# ==========================================
# วิธีใช้: .\safe-migrate.ps1

$BackupDir = ".\db-backups"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\backup_$Date.sql"

# สร้างโฟลเดอร์ backup ถ้ายังไม่มี
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force
}

Write-Host "🔄 สำรองข้อมูล database ก่อน migration..." -ForegroundColor Yellow

try {
    # อ่าน DATABASE_URL จาก .env
    $envContent = Get-Content ".env" | Where-Object { $_ -match "^DATABASE_URL=" }
    $databaseUrl = $envContent -replace "^DATABASE_URL=", ""
    
    # สำรองข้อมูล
    Write-Host "📋 กำลังสำรองข้อมูล..." -ForegroundColor Blue
    & pg_dump $databaseUrl | Out-File -FilePath $BackupFile -Encoding UTF8
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ สำรองข้อมูลเสร็จแล้ว: $BackupFile" -ForegroundColor Green
        
        # รัน migration
        Write-Host "🚀 รัน Prisma migration..." -ForegroundColor Blue
        & npx prisma migrate deploy
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migration สำเร็จ!" -ForegroundColor Green
            
            # Generate Prisma client
            Write-Host "🔄 Generate Prisma client..." -ForegroundColor Blue
            & npx prisma generate
            
            Write-Host "🎉 ทุกอย่างเสร็จสิ้น!" -ForegroundColor Green
        } else {
            Write-Host "❌ Migration ล้มเหลว! กำลังกู้คืนข้อมูล..." -ForegroundColor Red
            & psql $databaseUrl -f $BackupFile
            Write-Host "🔄 กู้คืนข้อมูลเสร็จแล้ว" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ การสำรองข้อมูลล้มเหลว! ยกเลิก migration" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ เกิดข้อผิดพลาด: $_" -ForegroundColor Red
}

# แสดงรายการไฟล์ backup
Write-Host "`n📁 รายการไฟล์ Backup:" -ForegroundColor Cyan
Get-ChildItem $BackupDir | Sort-Object LastWriteTime -Descending | Select-Object Name, LastWriteTime, @{Name="Size";Expression={[math]::Round($_.Length/1MB,2)}} | Format-Table