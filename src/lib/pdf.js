// ─── PDF generation helper ───
// Uses html2canvas to snapshot the rendered DOM (preserves Khmer fonts)
// then embeds the image into a jsPDF A4 page for download.

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Capture a DOM element and download as PDF.
 * @param {HTMLElement} el - element to capture
 * @param {string} filename - "INV-2406-073.pdf"
 */
export async function downloadElementAsPdf(el, filename) {
  if (!el) throw new Error('No element to capture');

  // Snapshot at 2× scale for sharper text on the PDF
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');

  // A4 portrait: 210 × 297 mm
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();   // 210
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297
  const margin = 10;
  const usableW = pageWidth - margin * 2;

  // Scale image to fit width, preserve aspect ratio
  const imgW = usableW;
  const imgH = (canvas.height * imgW) / canvas.width;

  // If image taller than one page, slice across multiple pages
  if (imgH <= pageHeight - margin * 2) {
    pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH);
  } else {
    // Multi-page: paint full image, advance by page height
    let positionY = margin;
    let remaining = imgH;
    while (remaining > 0) {
      pdf.addImage(imgData, 'PNG', margin, positionY, imgW, imgH);
      remaining -= pageHeight - margin;
      positionY -= pageHeight - margin;
      if (remaining > 0) pdf.addPage();
    }
  }

  pdf.save(filename);
}
