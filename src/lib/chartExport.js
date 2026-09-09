import html2canvas from "html2canvas";

// Captures a live DOM element (e.g. a rendered progress chart) as a PNG data
// URL so it can be embedded in Print, PDF, and DOCX exports.
export async function captureElement(el) {
  if (!el) return null;
  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    return { dataUrl: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height };
  } catch {
    return null;
  }
}