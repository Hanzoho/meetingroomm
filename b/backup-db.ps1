# Quick Backup Script for Windows
# วิธีใช้: .\backup-db.ps1

Write-Host "🔄 กำลัง Backup Database..." -ForegroundColor Yellow

try {
    # อ่าน DATABASE_URL จาก .env
    $envPath = ".\.env"
    if (Test-Path $envPath) {
        $databaseUrl = (Get-Content $envPath | Where-Object { $_ -match "^DATABASE_URL=" }) -replace "^DATABASE_URL=", ""
        
        # สร้างชื่อไฟล์ backup
        $backupName = "backup_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".sql"
        
        Write-Host "📁 กำลังสร้างไฟล์: $backupName" -ForegroundColor Blue
        
        # รัน pg_dump
        & pg_dump $databaseUrl | Out-File -FilePath $backupName -Encoding UTF8
        
        if ($LASTEXITCODE -eq 0) {
            $fileSize = [math]::Round((Get-Item $backupName).Length / 1MB, 2)
            Write-Host "✅ Backup สำเร็จ! ไฟล์: $backupName ($fileSize MB)" -ForegroundColor Green
        } else {
            Write-Host "❌ Backup ล้มเหลว!" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ ไม่พบไฟล์ .env" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ เกิดข้อผิดพลาด: $_" -ForegroundColor Red
}

Write-Host "`n💡 คำแนะนำ:" -ForegroundColor Cyan
Write-Host "- กู้คืนด้วย: psql `$env:DATABASE_URL -f backup_xxxxxx.sql" -ForegroundColor White
Write-Host "- ลบไฟล์เก่า: Remove-Item backup_*.sql" -ForegroundColor White