import { jsPDF } from "jspdf";

// ASCII-safe PDF receipt for a paid Base44 Payments purchase, generated
// client-side from the user's billing history in Settings.
export function exportReceiptPdf(purchase, user) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const amount = purchase.amount ? `${purchase.amount} ${purchase.currency || "USD"}` : "—";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("CaseCue", 56, 80);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Payment Receipt", 56, 102);

  let y = 150;
  const rows = [
    ["Product", purchase.productName || purchase.productId || "CaseCue subscription"],
    ["Amount paid", amount],
    ["Paid on", purchase.paidAt ? new Date(purchase.paidAt).toLocaleString() : "—"],
    ["Order ID", purchase.orderId || "—"],
    ["Subscription ID", purchase.subscriptionId || "—"],
    ["Billed to", user?.email || purchase.buyerEmail || "—"],
  ];
  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(label, 56, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 190, y);
    y += 24;
  });

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Thank you for supporting CaseCue. Generated from your billing history in Settings.", 56, y + 16);
  doc.setTextColor(0);

  doc.save(`CaseCue-receipt-${(purchase.paidAt || new Date().toISOString()).slice(0, 10)}.pdf`);
}