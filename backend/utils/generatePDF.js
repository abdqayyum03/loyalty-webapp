const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateOrderPDF = async (order, user) => {
  return new Promise((resolve, reject) => {
    try {
      // Create PDFs directory if it doesn't exist
      const pdfDir = path.join(__dirname, '../pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      // Generate filename
      const filename = `order-${order._id}-${Date.now()}.pdf`;
      const filepath = path.join(pdfDir, filename);

      // Create write stream
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Header
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('🎟️ CARTER LOYALTY SYSTEM', { align: 'center' })
        .fontSize(12)
        .font('Helvetica')
        .text('Order Receipt', { align: 'center' })
        .moveDown(1);

      // Separator line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Order Information
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('ORDER DETAILS', { underline: true })
        .moveDown(0.5);

      doc.font('Helvetica');
      doc.text(`Order ID: ${order._id}`, { width: 250 });
      doc.text(`Date: ${new Date(order.order_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`, { width: 250 });
      doc.moveDown(0.5);

      // Customer Information
      doc
        .font('Helvetica-Bold')
        .text('CUSTOMER INFORMATION', { underline: true })
        .moveDown(0.5);

      doc.font('Helvetica');
      doc.text(`Name: ${user.username}`, { width: 250 });
      doc.text(`Email: ${user.email}`, { width: 250 });
      doc.moveDown(1);

      // Separator line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Voucher Details
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('VOUCHER REDEEMED', { underline: true })
        .moveDown(0.5);

      doc.font('Helvetica');
      doc.text(`Voucher: ${order.voucher_title}`, { width: 300 });
      doc.text(`Quantity: ${order.quantity}`, { width: 300 });
      doc.text(`Points Per Unit: ${Math.ceil(order.points_deducted / order.quantity)}`, { width: 300 });
      doc.text(`Total Points Deducted: ${order.points_deducted}`, { width: 300 });
      doc.moveDown(1);

      // Separator line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Summary Box
      const boxX = 50;
      const boxY = doc.y;
      const boxWidth = 500;
      const boxHeight = 60;

      doc.rect(boxX, boxY, boxWidth, boxHeight).stroke();

      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('POINTS SUMMARY', boxX + 10, boxY + 10);

      doc.fontSize(10).font('Helvetica');
      doc.text(`Points Redeemed: ${order.points_deducted}`, boxX + 10, boxY + 30);

      doc.moveDown(3);

      // Footer
      doc
        .fontSize(9)
        .font('Helvetica')
        .text('Thank you for using Carter Loyalty System!', { align: 'center' })
        .text('This receipt confirms your voucher redemption.', { align: 'center' })
        .text(`Generated on ${new Date().toLocaleString()}`, { align: 'center', color: '#999' });

      // End document
      doc.end();

      // Resolve when stream finishes
      stream.on('finish', () => {
        resolve(filename);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateOrderPDF };