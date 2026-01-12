-- สร้างตาราง email_log สำหรับเก็บประวัติการส่งอีเมลและจำกัดโควต้า
CREATE TABLE email_log (
    id SERIAL PRIMARY KEY,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    email_type VARCHAR(50) NOT NULL, -- 'new_reservation', 'reservation_approved', 'reservation_rejected'
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง index สำหรับการค้นหาตามวันที่ (สำหรับตรวจสอบโควต้า)
CREATE INDEX idx_email_log_sent_date ON email_log(sent_date);
CREATE INDEX idx_email_log_type ON email_log(email_type);