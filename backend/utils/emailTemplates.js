const getCheckoutEmailTemplate = (order, user) => {
  const voucherDetails = `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${order.voucher_title}</strong>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
        ${order.quantity}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        ${order.points_deducted} points
      </td>
    </tr>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0 0 0;
            opacity: 0.9;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h2 {
            color: #667eea;
            font-size: 18px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: 600;
            color: #555;
          }
          .info-value {
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          table th {
            background-color: #f5f5f5;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #ddd;
          }
          .summary-box {
            background-color: #f0f7ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 16px;
          }
          .summary-row strong {
            color: #667eea;
            font-size: 18px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 15px;
            font-weight: 600;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #eee;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Voucher Redeemed!</h1>
            <p>Your order has been confirmed</p>
          </div>

          <div class="content">
            <!-- Greeting -->
            <div class="section">
              <p>Hi <strong>${user.username}</strong>,</p>
              <p>Your voucher redemption has been successfully processed. Below are your order details.</p>
            </div>

            <!-- Order Information -->
            <div class="section">
              <h2>Order Details</h2>
              <div class="info-row">
                <span class="info-label">Order ID:</span>
                <span class="info-value">${order._id}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Order Date:</span>
                <span class="info-value">${new Date(order.order_date).toLocaleString()}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value">✅ Confirmed</span>
              </div>
            </div>

            <!-- Voucher Details -->
            <div class="section">
              <h2>Voucher Redeemed</h2>
              <table>
                <thead>
                  <tr>
                    <th>Voucher Name</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Points</th>
                  </tr>
                </thead>
                <tbody>
                  ${voucherDetails}
                </tbody>
              </table>
            </div>

            <!-- Summary -->
            <div class="section">
              <div class="summary-box">
                <div class="summary-row">
                  <span>Points Redeemed:</span>
                  <strong>${order.points_deducted}</strong>
                </div>
              </div>
            </div>

            <!-- Next Steps -->
            <div class="section">
              <h2>What's Next?</h2>
              <p>Your receipt has been attached to this email in PDF format. Please keep it for your records.</p>
              <p>You can view your order history anytime by logging into your account.</p>
              <a href="http://localhost:3000/orders" class="button">View All Orders</a>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p>Thank you for using Carter Loyalty System!</p>
              <p>© 2026 Carter Financial Institute. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

module.exports = { getCheckoutEmailTemplate };