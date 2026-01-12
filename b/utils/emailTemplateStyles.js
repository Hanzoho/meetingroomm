// ===================================================================
// Email Template Styles - รวมสไตล์สำหรับ Email Templates
// ===================================================================

// Base styles for email containers
export const emailStyles = {
  // Container styles
  container: `
    font-family: Arial, sans-serif; 
    max-width: 600px; 
    margin: 0 auto; 
    padding: 20px; 
    background-color: #f8f9fa;
  `,
  
  card: `
    background: white; 
    padding: 30px; 
    border-radius: 8px; 
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  `,

  // Header styles
  header: `
    text-align: center; 
    margin-bottom: 20px;
  `,
  
  title: `
    margin: 0; 
    font-size: 20px;
  `,
  
  subtitle: `
    color: black; 
    margin: 3px 0 0 0; 
    font-size: 14px;
  `,

  // Alert boxes
  alertSuccess: `
    background: #d1fae5; 
    border-left: 4px solid #10b981; 
    padding: 15px; 
    margin: 15px 0; 
    border-radius: 4px;
  `,
  
  alertWarning: `
    background: #fef3c7; 
    border-left: 4px solid #f59e0b; 
    padding: 15px; 
    margin: 15px 0; 
    border-radius: 4px;
  `,
  
  alertError: `
    background: #fee2e2; 
    border-left: 4px solid #dc2626; 
    padding: 15px; 
    margin: 15px 0; 
    border-radius: 4px;
  `,
  
  alertInfo: `
    background: #e0f2fe; 
    padding: 15px; 
    border-radius: 6px; 
    margin: 20px 0;
  `,

  // Content sections
  detailsBox: `
    background: #f3f4f6; 
    padding: 20px; 
    border-radius: 6px; 
    margin: 15px 0;
  `,
  
  detailsTitle: `
    color: black; 
    margin-top: 0; 
    margin-bottom: 15px; 
    font-size: 16px;
  `,
  
  detailsGrid: `
    display: flex; 
    flex-wrap: wrap; 
    gap: 15px;
  `,
  
  detailsColumn: `
    flex: 1; 
    min-width: 200px;
  `,
  
  detailsItem: `
    margin: 8px 0; 
    color: black; 
    font-size: 14px;
  `,

  // Buttons
  buttonPrimary: `
    background: #2563eb; 
    color: white; 
    padding: 12px 24px; 
    text-decoration: none; 
    border-radius: 6px; 
    font-weight: bold; 
    margin: 0 10px; 
    display: inline-block;
  `,
  
  buttonSuccess: `
    background: #10b981; 
    color: white; 
    padding: 12px 24px; 
    text-decoration: none; 
    border-radius: 6px; 
    font-weight: bold; 
    margin: 0 10px; 
    display: inline-block;
  `,
  
  buttonSecondary: `
    background: #6b7280; 
    color: white; 
    padding: 12px 24px; 
    text-decoration: none; 
    border-radius: 6px; 
    font-weight: bold; 
    margin: 0 10px; 
    display: inline-block;
  `,

  // Footer
  footer: `
    text-align: center; 
    margin-top: 30px; 
    padding-top: 20px; 
    border-top: 2px solid #e5e7eb;
  `,
  
  footerText: `
    color: #6b7280; 
    font-size: 12px; 
    margin: 0; 
    line-height: 1.4;
  `
}

// Color themes
export const emailColors = {
  success: '#10b981',
  warning: '#f59e0b', 
  error: '#dc2626',
  info: '#2563eb',
  text: '#000000',
  textLight: '#6b7280'
}

// Template helpers
export const createEmailTemplate = (content, title, titleColor = emailColors.info) => {
  return `
    <div style="${emailStyles.container}">
      <div style="${emailStyles.card}">
        
        <div style="${emailStyles.header}">
          <h1 style="${emailStyles.title} color: ${titleColor};">${title}</h1>
          <p style="${emailStyles.subtitle}">มหาวิทยาลัยราชภัฏมหาสารคาม</p>
        </div>

        ${content}

        <div style="${emailStyles.footer}">
          <p style="${emailStyles.footerText}">
            <strong>ระบบจองห้องประชุม มหาวิทยาลัยราชภัฏมหาสารคาม</strong><br>
            © 2025 Rajabhat Maha Sarakham University. All rights reserved.<br>
            อีเมลนี้ส่งโดยอัตโนมัติจากระบบ - กรุณาอย่าตอบกลับ<br>
            หากมีปัญหาการใช้งาน กรุณาติดต่อแผนกเทคโนโลยีสารสนเทศ
          </p>
        </div>

      </div>
    </div>
  `
}

export const createAlertBox = (message, type = 'info') => {
  const styleMap = {
    success: emailStyles.alertSuccess,
    warning: emailStyles.alertWarning,
    error: emailStyles.alertError,
    info: emailStyles.alertInfo
  }
  
  return `
    <div style="${styleMap[type]}">
      <p style="margin: 0; color: black; font-weight: bold;">${message}</p>
    </div>
  `
}

export const createDetailsBox = (title, items) => {
  const itemsArray = Object.entries(items)
  const half = Math.ceil(itemsArray.length / 2)
  
  const leftColumn = itemsArray.slice(0, half).map(([key, value]) => 
    `<p style="${emailStyles.detailsItem}"><strong>${key}:</strong> ${value}</p>`
  ).join('')
  
  const rightColumn = itemsArray.slice(half).map(([key, value]) => 
    `<p style="${emailStyles.detailsItem}"><strong>${key}:</strong> ${value}</p>`
  ).join('')

  return `
    <div style="${emailStyles.detailsBox}">
      <h3 style="${emailStyles.detailsTitle}">${title}</h3>
      <div style="${emailStyles.detailsGrid}">
        <div style="${emailStyles.detailsColumn}">
          ${leftColumn}
        </div>
        <div style="${emailStyles.detailsColumn}">
          ${rightColumn}
        </div>
      </div>
    </div>
  `
}

export const createButtonGroup = (buttons) => {
  const buttonHTML = buttons.map(btn => 
    `<a href="${btn.url}" style="${btn.style || emailStyles.buttonPrimary}">${btn.text}</a>`
  ).join('')

  return `
    <div style="text-align: center; margin: 20px 0;">
      ${buttonHTML}
    </div>
  `
}