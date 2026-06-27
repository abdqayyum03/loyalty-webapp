const PDFDocument = require('pdfkit');

// Brand palette — mirrors the app's design tokens so the receipt feels on-brand.
const COLOR = {
  primary:   '#0052ff',
  ink:       '#0b1c30',
  muted:     '#545f73',
  faint:     '#8a93a6',
  line:      '#d3dbea',
  band:      '#e5eeff',
  success:   '#0a7d52',
  successBg: '#e2f3ea',
  white:     '#ffffff',
  onPrimary: '#dfe3ff',
};

const generateOrderPDF = (order, user) =>
  new Promise((resolve, reject) => {
    try {
      // margin: 0 — we position everything by absolute coordinates for a precise,
      // invoice-style layout (coloured bands run edge to edge).
      const doc = new PDFDocument({ size: 'A4', margin: 0 });

      // Collect the PDF in memory instead of writing to disk — serverless
      // platforms (Vercel) have a read-only filesystem, so we resolve with a
      // Buffer the caller can attach to an email or stream in a response.
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;   // 595.28
      const H = doc.page.height;  // 841.89
      const M = 50;               // outer content margin
      const RIGHT = W - M;
      const INNER = W - M * 2;     // usable content width

      // Derived values shown on the receipt.
      // Prefer the persisted order_number so the receipt matches the admin
      // console exactly; fall back to the same _id-derived value for any legacy
      // record created before that field existed.
      const orderNo =
        order.order_number || `ORD-${String(order._id).slice(-8).toUpperCase()}`;
      const points = Number(order.points_deducted) || 0;
      const qty = Number(order.quantity) || 1;
      const perUnit = Math.ceil(points / qty);
      const when = new Date(order.order_date);

      // ── tiny drawing helpers ──────────────────────────────────────────────
      const rule = (yy, color = COLOR.line) =>
        doc.moveTo(M, yy).lineTo(RIGHT, yy).lineWidth(1).strokeColor(color).stroke();

      const label = (text, x, yy, w, align = 'left') =>
        doc
          .font('Helvetica-Bold').fontSize(8).fillColor(COLOR.faint)
          .text(text.toUpperCase(), x, yy, { width: w, align, characterSpacing: 1 });

      /* ─── Header band ─────────────────────────────────────────────────── */
      doc.rect(0, 0, W, 128).fill(COLOR.primary);

      // Brand chip ("logo")
      doc.roundedRect(M, 41, 46, 46, 11).fill(COLOR.white);
      doc
        .font('Helvetica-Bold').fontSize(24).fillColor(COLOR.primary)
        .text('C', M, 51, { width: 46, align: 'center' });

      // Brand text
      doc
        .font('Helvetica-Bold').fontSize(20).fillColor(COLOR.white)
        .text('CARTER', M + 62, 48);
      doc
        .font('Helvetica').fontSize(8.5).fillColor(COLOR.onPrimary)
        .text('LOYALTY REWARDS PROGRAM', M + 62, 74, { characterSpacing: 1.5 });

      // Receipt heading (right-aligned)
      doc
        .font('Helvetica-Bold').fontSize(24).fillColor(COLOR.white)
        .text('RECEIPT', M, 46, { width: INNER, align: 'right' });
      doc
        .font('Helvetica').fontSize(10).fillColor(COLOR.onPrimary)
        .text(`No. ${orderNo}`, M, 78, { width: INNER, align: 'right' });

      /* ─── Parties: Billed To / Receipt Details ───────────────────────── */
      const y0 = 162;
      const colRX = M + INNER / 2 + 10;
      const colRW = INNER / 2 - 10;

      // Left: customer
      label('Billed To', M, y0, INNER / 2);
      doc
        .font('Helvetica-Bold').fontSize(13).fillColor(COLOR.ink)
        .text(user.username || 'Member', M, y0 + 16, { width: INNER / 2 - 10 });
      doc
        .font('Helvetica').fontSize(10).fillColor(COLOR.muted)
        .text(user.email || '—', M, y0 + 35, { width: INNER / 2 - 10 });

      // Status pill
      const pillY = y0 + 58;
      doc.roundedRect(M, pillY, 94, 22, 11).fill(COLOR.successBg);
      doc.circle(M + 16, pillY + 11, 3).fill(COLOR.success);
      doc
        .font('Helvetica-Bold').fontSize(9).fillColor(COLOR.success)
        .text('REDEEMED', M + 25, pillY + 7, { characterSpacing: 0.5 });

      // Right: receipt details (key/value rows)
      label('Receipt Details', colRX, y0, colRW);
      const drow = (k, v, ry) => {
        doc
          .font('Helvetica').fontSize(10).fillColor(COLOR.muted)
          .text(k, colRX, ry, { width: 70 });
        doc
          .font('Helvetica-Bold').fontSize(10).fillColor(COLOR.ink)
          .text(v, colRX + 72, ry, { width: colRW - 72, align: 'right' });
      };
      drow('Date', when.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), y0 + 16);
      drow('Time', when.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), y0 + 32);
      drow('Order ID', orderNo, y0 + 48);

      /* ─── Items table ─────────────────────────────────────────────────── */
      let ty = y0 + 108;
      const cDesc = M + 16;
      const cQty = M + INNER - 200;
      const cQtyW = 70;
      const cPtsW = 90;
      const cPtsX = RIGHT - 16 - cPtsW;

      // Header row
      doc.rect(M, ty, INNER, 26).fill(COLOR.band);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.muted);
      doc.text('DESCRIPTION', cDesc, ty + 9, { characterSpacing: 1 });
      doc.text('QTY', cQty, ty + 9, { width: cQtyW, align: 'center', characterSpacing: 1 });
      doc.text('POINTS', cPtsX, ty + 9, { width: cPtsW, align: 'right', characterSpacing: 1 });
      ty += 26;

      // Voucher row
      const rowY = ty + 14;
      doc
        .font('Helvetica-Bold').fontSize(12).fillColor(COLOR.ink)
        .text(order.voucher_title, cDesc, rowY, { width: cQty - cDesc - 10 });
      doc
        .font('Helvetica').fontSize(9).fillColor(COLOR.muted)
        .text(`${perUnit.toLocaleString()} points per unit`, cDesc, rowY + 18, { width: cQty - cDesc - 10 });
      doc
        .font('Helvetica').fontSize(12).fillColor(COLOR.ink)
        .text(String(qty), cQty, rowY + 4, { width: cQtyW, align: 'center' });
      doc
        .font('Helvetica-Bold').fontSize(12).fillColor(COLOR.ink)
        .text(points.toLocaleString(), cPtsX, rowY + 4, { width: cPtsW, align: 'right' });

      ty = rowY + 48;
      rule(ty);

      /* ─── Totals ──────────────────────────────────────────────────────── */
      ty += 18;
      const totX = M + INNER - 230;
      const totW = 230;
      const totRow = (k, v, ry) => {
        doc
          .font('Helvetica').fontSize(10).fillColor(COLOR.muted)
          .text(k, totX, ry, { width: 120 });
        doc
          .font('Helvetica').fontSize(10).fillColor(COLOR.ink)
          .text(v, totX + totW - 130, ry, { width: 130, align: 'right' });
      };
      totRow('Subtotal', `${points.toLocaleString()} pts`, ty);
      totRow('Processing Fee', '0 pts', ty + 18);

      ty += 44;
      doc.roundedRect(totX, ty, totW, 48, 8).fill(COLOR.primary);
      doc
        .font('Helvetica').fontSize(8.5).fillColor(COLOR.onPrimary)
        .text('TOTAL POINTS REDEEMED', totX + 16, ty + 18, { width: 130, characterSpacing: 1 });
      doc
        .font('Helvetica-Bold').fontSize(19).fillColor(COLOR.white)
        .text(points.toLocaleString(), totX + 14, ty + 14, { width: totW - 30, align: 'right' });

      /* ─── Footer ──────────────────────────────────────────────────────── */
      const fy = H - 96;
      rule(fy);
      doc
        .font('Helvetica-Bold').fontSize(11).fillColor(COLOR.ink)
        .text('Thank you for being a Carter member!', M, fy + 18, { width: INNER, align: 'center' });
      doc
        .font('Helvetica').fontSize(9).fillColor(COLOR.muted)
        .text('This receipt confirms your voucher redemption. Please keep it for your records.', M, fy + 36, { width: INNER, align: 'center' });
      doc
        .font('Helvetica').fontSize(8).fillColor(COLOR.faint)
        .text(`Generated on ${new Date().toLocaleString()}  ·  CartRedeem System`, M, fy + 54, { width: INNER, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

module.exports = { generateOrderPDF };
