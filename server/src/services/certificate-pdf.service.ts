import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface CertificateData {
  studentName: string;
  certificateName: string;
  schoolYear: string;
  points: number;
  rank: number;
  gradeLevel?: string;
  sectionName?: string;
  lrn?: string;
  dateAwarded: string;
  termName?: string;
  serial?: string;
  isRanked?: boolean;
}

function resolveFontsDir(): string {
  try {
    const fromModule = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/fonts');
    if (fs.existsSync(fromModule)) return fromModule;
  } catch {
    // Ignore and fallback
  }

  const cwdOption = path.resolve(process.cwd(), 'assets', 'fonts');
  if (fs.existsSync(cwdOption)) return cwdOption;

  const serverOption = path.resolve(process.cwd(), 'server', 'assets', 'fonts');
  if (fs.existsSync(serverOption)) return serverOption;

  return cwdOption;
}

function formatRecipientName(rawName: string): string {
  if (!rawName) return '';

  let orderedName = '';
  // Check if formatted with commas (e.g. "Last, First, Middle" from EnrollPro or "Last, First Middle")
  if (rawName.includes(',')) {
    const rawParts = rawName.split(',').map(s => s.trim()).filter(Boolean);

    // Check if the last part is a suffix (e.g. Jr., Sr., III)
    let suffix = '';
    if (rawParts.length > 2 && /^(jr\.?|sr\.?|ii|iii|iv|v|vi)$/i.test(rawParts[rawParts.length - 1])) {
      suffix = rawParts.pop()!;
    }

    if (rawParts.length === 3) {
      // Last, First, Middle -> First Middle Last
      const [last, first, middle] = rawParts;
      orderedName = `${first} ${middle} ${last}${suffix ? ' ' + suffix : ''}`;
    } else if (rawParts.length === 2) {
      // Last, First Middle -> First Middle Last
      const [last, firstMiddle] = rawParts;
      orderedName = `${firstMiddle} ${last}${suffix ? ' ' + suffix : ''}`;
    } else {
      orderedName = rawParts.join(' ');
    }
  } else {
    orderedName = rawName.trim();
  }

  return orderedName
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      if (/^(ii|iii|iv|v|vi)$/i.test(word)) return word.toUpperCase();
      if (/^(jr\.?|sr\.?)$/i.test(word)) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Font Registration ──────────────────────────────────────────────
    const fontsDir = resolveFontsDir();
    const hasCinzelBold = fs.existsSync(path.join(fontsDir, 'Cinzel-Bold.ttf'));
    const hasCinzelSemi = fs.existsSync(path.join(fontsDir, 'Cinzel-SemiBold.ttf'));
    const hasAlexBrush = fs.existsSync(path.join(fontsDir, 'AlexBrush-Regular.ttf'));
    const hasPlayfairItalic = fs.existsSync(path.join(fontsDir, 'PlayfairDisplay-Italic.ttf'));

    if (hasCinzelBold) doc.registerFont('Cinzel-Bold', path.join(fontsDir, 'Cinzel-Bold.ttf'));
    if (hasCinzelSemi) doc.registerFont('Cinzel-SemiBold', path.join(fontsDir, 'Cinzel-SemiBold.ttf'));
    if (hasAlexBrush) doc.registerFont('AlexBrush', path.join(fontsDir, 'AlexBrush-Regular.ttf'));
    if (hasPlayfairItalic) doc.registerFont('Playfair-Italic', path.join(fontsDir, 'PlayfairDisplay-Italic.ttf'));

    const fontSchool = hasCinzelSemi ? 'Cinzel-SemiBold' : 'Times-Bold';
    const fontTitle = hasCinzelBold ? 'Cinzel-Bold' : 'Times-Bold';
    const fontPresentation = hasPlayfairItalic ? 'Playfair-Italic' : 'Times-Italic';
    const fontName = hasAlexBrush ? 'AlexBrush' : 'Times-BoldItalic';
    const fontDate = hasPlayfairItalic ? 'Playfair-Italic' : 'Times-Italic';

    const width = 841.89;
    const height = 595.28;
    const centerX = width / 2;

    // Helper: Draw a precise 5-point vector star
    const drawStar = (cx: number, cy: number, rOuter: number, rInner: number, fillColor: string, strokeColor?: string) => {
      const starPts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? rOuter : rInner;
        starPts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
      }
      if (strokeColor) {
        doc.polygon(...starPts).fillAndStroke(fillColor, strokeColor);
      } else {
        doc.polygon(...starPts).fill(fillColor);
      }
    };

    // Helper: Draw a precise vector diamond
    const drawDiamond = (cx: number, cy: number, size: number, fill: string, stroke?: string) => {
      if (stroke) {
        doc.polygon([cx, cy - size], [cx + size, cy], [cx, cy + size], [cx - size, cy]).fillAndStroke(fill, stroke);
      } else {
        doc.polygon([cx, cy - size], [cx + size, cy], [cx, cy + size], [cx - size, cy]).fill(fill);
      }
    };

    // ── 1. Warm Ivory Parchment Base ───────────────────────────────────
    doc.rect(0, 0, width, height).fill('#FAF8F5');
    doc.rect(10, 10, width - 20, height - 20).fill('#FCFBF9');

    // ── 2. Multi-tier Ceremonial Diploma Frames ────────────────────────
    doc.rect(16, 16, width - 32, height - 32).lineWidth(2.5).stroke('#00271D');
    doc.rect(20.5, 20.5, width - 41, height - 41).lineWidth(0.75).stroke('#00A77C');

    const m = 26;
    const notch = 14;
    const right = width - m;
    const bottom = height - m;

    doc.moveTo(m + notch, m)
      .lineTo(right - notch, m)
      .lineTo(right, m + notch)
      .lineTo(right, bottom - notch)
      .lineTo(right - notch, bottom)
      .lineTo(m + notch, bottom)
      .lineTo(m, bottom - notch)
      .lineTo(m, m + notch)
      .closePath()
      .lineWidth(1.8)
      .stroke('#C69B26');

    const im = 31;
    const inotch = 10;
    const iright = width - im;
    const ibottom = height - im;

    doc.moveTo(im + inotch, im)
      .lineTo(iright - inotch, im)
      .lineTo(iright, im + inotch)
      .lineTo(iright, ibottom - inotch)
      .lineTo(iright - inotch, ibottom)
      .lineTo(im + inotch, ibottom)
      .lineTo(im, ibottom - inotch)
      .lineTo(im, im + inotch)
      .closePath()
      .lineWidth(0.6)
      .stroke('#C69B26');

    // ── 3. Corner Ornaments (Gold Diamonds & Flourish Wings) ──────────
    const drawCornerOrnament = (cx: number, cy: number, signX: number, signY: number) => {
      const dSize = 3.5;
      doc.polygon(
        [cx, cy - dSize],
        [cx + dSize, cy],
        [cx, cy + dSize],
        [cx - dSize, cy]
      ).fillAndStroke('#C69B26', '#8C6D14');

      doc.moveTo(cx + signX * 7, cy).lineTo(cx + signX * 22, cy).lineWidth(0.8).stroke('#C69B26');
      doc.moveTo(cx, cy + signY * 7).lineTo(cx, cy + signY * 22).lineWidth(0.8).stroke('#C69B26');
    };

    drawCornerOrnament(m + notch, m + notch, 1, 1);
    drawCornerOrnament(right - notch, m + notch, -1, 1);
    drawCornerOrnament(m + notch, bottom - notch, 1, -1);
    drawCornerOrnament(right - notch, bottom - notch, -1, -1);

    // ── 4. Header: Republic, Department & School Branding ─────────────
    let curY = 40;

    doc.fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor('#00271D')
      .text('REPUBLIC OF THE PHILIPPINES   \u2022   DEPARTMENT OF EDUCATION   \u2022   REGION VI', 0, curY, {
        align: 'center',
        characterSpacing: 1.8,
      });

    curY = 56;
    doc.fontSize(16.5)
      .font(fontSchool)
      .fillColor('#00271D')
      .text('HINIGARAN NATIONAL HIGH SCHOOL', 0, curY, {
        align: 'center',
        characterSpacing: 2.2,
      });

    curY = 78;
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#00A77C')
      .text('CAMPUS MATERIAL RECOVERY FACILITY   \u2022   ECOLOGICAL RECOVERY PROGRAM', 0, curY, {
        align: 'center',
        characterSpacing: 2,
      });

    // ── Upper Architectural Vignette (Distinct from Name Pedestal) ───
    curY = 96;
    const headerLineSpan = 380;
    const hLeft = centerX - headerLineSpan / 2;
    const hRight = centerX + headerLineSpan / 2;

    // Outer tapered hairlines
    doc.moveTo(hLeft, curY).lineTo(centerX - 36, curY).lineWidth(0.75).stroke('#C69B26');
    doc.moveTo(centerX + 36, curY).lineTo(hRight, curY).lineWidth(0.75).stroke('#C69B26');

    // Flanking accent beads
    doc.circle(centerX - 24, curY, 1.2).fill('#C69B26');
    doc.circle(centerX + 24, curY, 1.2).fill('#C69B26');

    // Flanking graduated diamonds
    drawDiamond(centerX - 13, curY, 2.2, '#C69B26');
    drawDiamond(centerX + 13, curY, 2.2, '#C69B26');

    // Centerpiece: Regal 5-point vector star
    drawStar(centerX, curY, 4.5, 2.2, '#C69B26', '#8C6D14');

    // ── 5. Main Certificate Title (Inscriptional Roman) ───────────────
    curY = 114;
    doc.fontSize(30)
      .font(fontTitle)
      .fillColor('#00271D')
      .text('CERTIFICATE OF RECOGNITION', 0, curY, {
        align: 'center',
        characterSpacing: 3.2,
      });

    curY = 158;
    doc.fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor('#C69B26')
      .text(
        `SMART OPERATIONAL RECOVERY & TRACKING SYSTEM   \u2022   ${data.certificateName.toUpperCase()}`,
        0,
        curY,
        {
          align: 'center',
          characterSpacing: 2.2,
        }
      );

    // ── 6. Presentation Line ──────────────────────────────────────────
    curY = 188;
    doc.fontSize(12)
      .font(fontPresentation)
      .fillColor('#4A5568')
      .text('This Certificate of Commendation is proudly conferred upon', 0, curY, {
        align: 'center',
        characterSpacing: 0.5,
      });

    // ── 7. Recipient Name (Pretty & Readable Calligraphy Script) ─────
    curY = 212;
    const displayName = formatRecipientName(data.studentName);

    let nameFontSize = hasAlexBrush ? 40 : 30;
    doc.font(fontName).fontSize(nameFontSize);

    // Auto-scale font size if recipient has a very long name
    while (doc.widthOfString(displayName) > 560 && nameFontSize > 22) {
      nameFontSize -= 2;
      doc.fontSize(nameFontSize);
    }

    doc.fillColor('#00271D')
      .text(displayName, 0, curY, {
        align: 'center',
      });

    // ── Ceremonial Double-Rule Pedestal Underline (Distinct from Vignette) ──
    curY = 258;
    const measuredWidth = doc.font(fontName).fontSize(nameFontSize).widthOfString(displayName);
    const pedSpan = Math.min(Math.max(measuredWidth + 60, 260), 520);
    const pedLeft = centerX - pedSpan / 2;
    const pedRight = centerX + pedSpan / 2;

    // Primary baseline rule
    doc.moveTo(pedLeft, curY).lineTo(centerX - 16, curY).lineWidth(1.2).stroke('#C69B26');
    doc.moveTo(centerX + 16, curY).lineTo(pedRight, curY).lineWidth(1.2).stroke('#C69B26');

    // Subtle parallel accent hairline (2.5pt below, shorter span)
    const subSpan = pedSpan - 50;
    doc.moveTo(centerX - subSpan / 2, curY + 2.5).lineTo(centerX - 12, curY + 2.5).lineWidth(0.5).stroke('#D4AF37');
    doc.moveTo(centerX + 12, curY + 2.5).lineTo(centerX + subSpan / 2, curY + 2.5).lineWidth(0.5).stroke('#D4AF37');

    // Center Diamond
    drawDiamond(centerX, curY, 3.5, '#C69B26', '#8C6D14');

    // Optional Grade/Section/LRN Subline
    const subInfoParts: string[] = [];
    if (data.gradeLevel) {
      const cleanG = data.gradeLevel.toLowerCase().startsWith('grade')
        ? data.gradeLevel
        : `Grade ${data.gradeLevel}`;
      subInfoParts.push(`${cleanG}${data.sectionName ? ' - ' + data.sectionName : ''}`);
    }
    if (data.lrn) subInfoParts.push(`LRN: ${data.lrn}`);

    if (subInfoParts.length > 0) {
      curY = 274;
      doc.fontSize(9.5)
        .font('Helvetica-Bold')
        .fillColor('#00A77C')
        .text(subInfoParts.join('     \u2022     '), 0, curY, {
          align: 'center',
          characterSpacing: 0.8,
        });
    }

    // ── 8. Commendation Citation Text ─────────────────────────────────
    curY = subInfoParts.length > 0 ? 295 : 282;
    const termPhrase = data.termName ? ` (${data.termName})` : '';
    const citation = `for exemplary dedication, active civic participation, and commendable leadership in campus waste recovery, segregation, and sustainable ecological stewardship under the S.O.R.T. Program for School Year ${data.schoolYear}${termPhrase}.`;

    doc.fontSize(10.5)
      .font('Times-Roman')
      .fillColor('#2D3748')
      .text(citation, centerX - 320, curY, {
        width: 640,
        align: 'center',
        lineGap: 4.5,
      });

    // ── 9. Milestone Credentials Plaque ───────────────────────────────
    curY = 345;
    const boxW = 520;
    const boxH = 62;
    const boxX = centerX - boxW / 2;

    // Plaque background & border
    doc.roundedRect(boxX, curY, boxW, boxH, 8).fillAndStroke('#F6F2EB', '#C69B26');
    doc.roundedRect(boxX + 2.5, curY + 2.5, boxW - 5, boxH - 5, 6).lineWidth(0.5).stroke('#E2D7C3');

    const colW = boxW / 3;
    const isRanked = data.isRanked !== false;
    const cleanCertName = data.certificateName.toUpperCase().replace(/\s*CERTIFICATE\s*$/i, '');
    const col2Label = isRanked ? 'INSTITUTIONAL RANK' : 'AWARD TYPE';
    const col2Value = isRanked ? `RANK #${data.rank}` : 'MILESTONE';
    const col3Label = isRanked ? 'HONOR TIER' : 'SCHOOL YEAR';
    const col3Value = isRanked ? cleanCertName || 'ECO-CHAMPION' : data.schoolYear;

    // Column 1: Accumulated Points
    const c1X = boxX;
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#64748B')
      .text('ACCUMULATED ECO-POINTS', c1X, curY + 12, { width: colW, align: 'center', characterSpacing: 0.8 });
    doc.fontSize(15.5)
      .font('Helvetica-Bold')
      .fillColor('#00A77C')
      .text(`${data.points} PTS`, c1X, curY + 31, { width: colW, align: 'center' });

    // Vertical Divider 1
    doc.moveTo(boxX + colW, curY + 10).lineTo(boxX + colW, curY + boxH - 10).lineWidth(0.75).stroke('#D9CDBC');

    // Column 2: Campus Standing
    const c2X = boxX + colW;
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#64748B')
      .text(col2Label, c2X, curY + 12, { width: colW, align: 'center', characterSpacing: 0.8 });
    doc.fontSize(15.5)
      .font('Helvetica-Bold')
      .fillColor('#C69B26')
      .text(col2Value, c2X, curY + 31, { width: colW, align: 'center' });

    // Vertical Divider 2
    doc.moveTo(boxX + colW * 2, curY + 10).lineTo(boxX + colW * 2, curY + boxH - 10).lineWidth(0.75).stroke('#D9CDBC');

    // Column 3: Award Category
    const c3X = boxX + colW * 2;
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#64748B')
      .text(col3Label, c3X, curY + 12, { width: colW, align: 'center', characterSpacing: 0.8 });
    doc.fontSize(13.5)
      .font('Helvetica-Bold')
      .fillColor('#00271D')
      .text(col3Value, c3X, curY + 32, { width: colW, align: 'center' });

    // ── 10. Conferred Date Line ───────────────────────────────────────
    curY = 430;
    doc.fontSize(10)
      .font(fontDate)
      .fillColor('#4A5568')
      .text(`Conferred on ${data.dateAwarded} at Hinigaran National High School, Hinigaran, Negros Occidental.`, 0, curY, {
        align: 'center',
      });

    // ── 11. Signatures & Symmetrical Center Seal Row ──────────────────
    const sigY = 482;
    const sigW = 190;
    const sig1X = centerX - 205;
    const sig2X = centerX + 205;

    // Left Signature: MRF Coordinator
    doc.moveTo(sig1X - sigW / 2, sigY).lineTo(sig1X + sigW / 2, sigY).lineWidth(1).stroke('#00271D');
    doc.polygon([sig1X, sigY - 2.5], [sig1X + 3, sigY], [sig1X, sigY + 2.5], [sig1X - 3, sigY]).fill('#C69B26');

    doc.fontSize(9.5)
      .font('Helvetica-Bold')
      .fillColor('#00271D')
      .text('MRF FACILITY COORDINATOR', sig1X - sigW / 2, sigY + 7, { width: sigW, align: 'center' });
    doc.fontSize(8)
      .font('Times-Italic')
      .fillColor('#64748B')
      .text('Materials Recovery & Eco-Station', sig1X - sigW / 2, sigY + 20, { width: sigW, align: 'center' });

    // Right Signature: School Administrator / Principal
    doc.moveTo(sig2X - sigW / 2, sigY).lineTo(sig2X + sigW / 2, sigY).lineWidth(1).stroke('#00271D');
    doc.polygon([sig2X, sigY - 2.5], [sig2X + 3, sigY], [sig2X, sigY + 2.5], [sig2X - 3, sigY]).fill('#C69B26');

    doc.fontSize(9.5)
      .font('Helvetica-Bold')
      .fillColor('#00271D')
      .text('SCHOOL PRINCIPAL / ADMINISTRATOR', sig2X - sigW / 2, sigY + 7, { width: sigW, align: 'center' });
    doc.fontSize(8)
      .font('Times-Italic')
      .fillColor('#64748B')
      .text('Office of the School Head', sig2X - sigW / 2, sigY + 20, { width: sigW, align: 'center' });

    // Center Gold Rosette Medallion
    const sealX = centerX;
    const sealY = sigY + 4;
    const sealRadius = 28;

    // Ribbons draping down
    const ribW = 13;
    const ribL = 36;
    doc.save();
    doc.translate(sealX - 7, sealY + 10);
    doc.rotate(14);
    doc.moveTo(-ribW / 2, 0)
      .lineTo(ribW / 2, 0)
      .lineTo(ribW / 2, ribL)
      .lineTo(0, ribL - 6)
      .lineTo(-ribW / 2, ribL)
      .closePath()
      .fill('#00A77C');
    doc.restore();

    doc.save();
    doc.translate(sealX + 7, sealY + 10);
    doc.rotate(-14);
    doc.moveTo(-ribW / 2, 0)
      .lineTo(ribW / 2, 0)
      .lineTo(ribW / 2, ribL)
      .lineTo(0, ribL - 6)
      .lineTo(-ribW / 2, ribL)
      .closePath()
      .fill('#C69B26');
    doc.restore();

    // Starburst Outer Ring (24 points)
    const pts = 24;
    const rOuter = sealRadius;
    const rInner = sealRadius - 3.5;
    const starCoords: [number, number][] = [];
    for (let i = 0; i < pts * 2; i++) {
      const angle = (Math.PI / pts) * i;
      const r = i % 2 === 0 ? rOuter : rInner;
      starCoords.push([sealX + r * Math.cos(angle), sealY + r * Math.sin(angle)]);
    }
    doc.polygon(...starCoords).fillAndStroke('#D4AF37', '#997300');

    // Concentric Gold Ring & Evergreen Core
    doc.circle(sealX, sealY, sealRadius - 4).lineWidth(1.2).stroke('#FAF8F5');
    doc.circle(sealX, sealY, sealRadius - 5.5).fill('#00271D');
    doc.circle(sealX, sealY, sealRadius - 7).lineWidth(0.6).stroke('#C69B26');

    drawStar(sealX, sealY - 14, 2.5, 1.2, '#D4AF37');

    doc.fontSize(5.5)
      .font('Helvetica-Bold')
      .fillColor('#D4AF37')
      .text('S.O.R.T.', sealX - 22, sealY - 10, { width: 44, align: 'center', characterSpacing: 0.5 });

    doc.fontSize(5.5)
      .font('Helvetica-Bold')
      .fillColor('#FFFFFF')
      .text('OFFICIAL', sealX - 22, sealY - 4, { width: 44, align: 'center' });

    doc.fontSize(5.5)
      .font('Helvetica-Bold')
      .fillColor('#FFFFFF')
      .text('SEAL OF', sealX - 22, sealY + 2, { width: 44, align: 'center' });

    doc.fontSize(5)
      .font('Helvetica-Bold')
      .fillColor('#D4AF37')
      .text('EXCELLENCE', sealX - 22, sealY + 8, { width: 44, align: 'center', characterSpacing: 0.5 });

    // ── 12. Security & Accreditation Verification Footer ──────────────
    const footY = height - 42;
    const cleanYear = data.schoolYear.split('-')[0] || '2026';
    const certSerial = data.serial || `SORT-HNHS-${cleanYear}-R${data.rank}-P${data.points}`;

    doc.fontSize(7)
      .font('Helvetica')
      .fillColor('#64748B')
      .text(`Certificate ID: ${certSerial}`, 65, footY);

    doc.fontSize(7)
      .font('Helvetica')
      .fillColor('#64748B')
      .text('S.O.R.T. — Smart Operational Recovery and Tracking System for School-Based Material Recovery Facility', 0, footY, {
        align: 'center',
      });

    doc.fontSize(7)
      .font('Helvetica-Bold')
      .fillColor('#00A77C')
      .text('AUTHENTICATED CREDENTIAL', width - 65 - 140, footY, { width: 140, align: 'right' });

    doc.end();
  });
}
