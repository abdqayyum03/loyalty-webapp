const transporter = require('../config/email');
const { getCheckoutEmailTemplate } = require('./emailTemplates');
const { generateOrderPDF } = require('./generatePDF');
const fs = require('fs');
const path = require('path');

// @desc Send checkout confirmation email
const sendCheckoutEmail = async (order, user) => {
  try {
    console.log(`📧 Sending checkout email to ${user.email}...`);

    // Generate PDF
    const pdfFilename = await generateOrderPDF(order, user);
    const pdfPath = path.join(__dirname, '../pdfs', pdfFilename);

    // Get email template
    const htmlContent = getCheckoutEmailTemplate(order, user);

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: `🎟️ Order Confirmation - Carter Loyalty System (Order #${order._id})`,
      html: htmlContent,
      attachments: [
        {
          filename: `Order-${order._id}.pdf`,
          path: pdfPath,
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Checkout email sent successfully to ${user.email}`);
    console.log(`   Message ID: ${info.messageId}`);

    return true;
  } catch (error) {
    console.error(`❌ Error sending checkout email to ${user.email}:`, error);
    throw error;
  }
};

// @desc Send OTP email
const sendOTPEmail = async (email, otp, username) => {
  try {
    console.log(`📧 Sending OTP email to ${email}...`);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              background: #f5f5f5;
              padding: 20px;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #667eea;
              margin: 0;
              font-size: 28px;
            }
            .content {
              text-align: center;
            }
            .content p {
              color: #666;
              font-size: 15px;
              line-height: 1.6;
            }
            .otp-box {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 12px;
              margin: 30px 0;
            }
            .otp-code {
              font-size: 48px;
              font-weight: 700;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
            }
            .otp-label {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
              opacity: 0.9;
              margin-bottom: 10px;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              border-radius: 4px;
              margin: 20px 0;
              font-size: 13px;
              color: #856404;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #999;
              font-size: 12px;
              border-top: 1px solid #e0e0e0;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 Email Verification</h1>
            </div>

            <div class="content">
              <p>Hi <strong>${username}</strong>,</p>
              <p>Thank you for registering with Carter Loyalty System!</p>
              <p>To complete your registration, please enter the OTP below:</p>

              <div class="otp-box">
                <div class="otp-label">Your OTP Code</div>
                <div class="otp-code">${otp}</div>
              </div>

              <div class="warning">
                <strong>⏰ This OTP is valid for 10 minutes only.</strong><br>
                Do not share this code with anyone. We will never ask you for this code.
              </div>

              <p>If you didn't request this code, please ignore this email or contact support.</p>
            </div>

            <div class="footer">
              <p>© 2026 Carter Financial Institute. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `🔐 Your OTP Code - Carter Loyalty System`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
    console.log(`   Message ID: ${info.messageId}`);

    return true;
  } catch (error) {
    console.error(`❌ Error sending OTP email to ${email}:`, error);
    throw error;
  }
};

// Export both functions
module.exports = {
  sendCheckoutEmail,
  sendOTPEmail,
};