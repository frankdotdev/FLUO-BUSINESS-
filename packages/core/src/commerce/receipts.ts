// Branded Receipts Generator for Fluo Merchants
// Ensures every customer and POS receipt prominently features the business's identity and "Powered by Fluo".

import { fmtMoney, fmtLocal } from "../notifications/notify.ts";

export interface ReceiptLineItem {
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceMinor: bigint;
  readonly lineTotalMinor: bigint;
}

export interface ReceiptData {
  readonly receiptNumber: string;
  readonly businessName: string;
  readonly businessSlug: string;
  readonly timezone: string;
  readonly currency: string;
  readonly issuedAtMs: number;
  readonly customerName: string;
  readonly customerContact?: string;
  readonly items: readonly ReceiptLineItem[];
  readonly subtotalMinor: bigint;
  readonly deliveryFeeMinor?: bigint;
  readonly totalMinor: bigint;
  readonly paymentMethod: "provider" | "bank_transfer" | "cash" | "qr_pay";
  readonly paymentReference: string;
  readonly escrowStatus?: "held" | "released";
}

/**
 * Renders an ESC/POS 58mm/80mm plain text thermal receipt suitable for Bluetooth/USB printers.
 */
export function renderThermalReceipt(data: ReceiptData, widthCols = 32): string {
  const line = "-".repeat(widthCols);
  const center = (s: string) => {
    const pad = Math.max(0, Math.floor((widthCols - s.length) / 2));
    return " ".repeat(pad) + s;
  };

  const rows: string[] = [];
  rows.push(center(data.businessName.toUpperCase()));
  rows.push(center(`fluo.ng/b/${data.businessSlug}`));
  rows.push(center(fmtLocal(data.issuedAtMs, data.timezone)));
  rows.push(center(`Receipt: ${data.receiptNumber}`));
  rows.push(line);

  rows.push(`Customer: ${data.customerName}`);
  rows.push(line);

  for (const it of data.items) {
    const qtyLine = `${it.quantity}x ${it.name}`;
    const priceStr = fmtMoney(it.lineTotalMinor, data.currency);
    const space = Math.max(1, widthCols - qtyLine.length - priceStr.length);
    rows.push(qtyLine + " ".repeat(space) + priceStr);
  }

  rows.push(line);
  const totalStr = fmtMoney(data.totalMinor, data.currency);
  const label = "TOTAL PAID:";
  const totalSpace = Math.max(1, widthCols - label.length - totalStr.length);
  rows.push(label + " ".repeat(totalSpace) + totalStr);

  rows.push(`Method: ${data.paymentMethod.toUpperCase()}`);
  rows.push(`Ref: ${data.paymentReference}`);

  if (data.escrowStatus === "held") {
    rows.push(line);
    rows.push(center("* HELD IN FLUO ESCROW *"));
  }

  rows.push(line);
  rows.push(center("Thank you for your patronage!"));
  rows.push(center("Powered by Fluo"));
  rows.push("\n\n");

  return rows.join("\n");
}

/**
 * Renders a responsive, clean HTML receipt suitable for email, customer portal, and web printing.
 */
export function renderHtmlReceipt(data: ReceiptData): string {
  const totalFormatted = fmtMoney(data.totalMinor, data.currency);
  const dateFormatted = fmtLocal(data.issuedAtMs, data.timezone);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${data.receiptNumber} - ${data.businessName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8f9fa; color: #111; margin: 0; padding: 20px; }
    .receipt-card { max-width: 440px; margin: 0 auto; background: #fff; padding: 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #eaeaea; }
    .header { text-align: center; border-bottom: 2px dashed #e0e0e0; padding-bottom: 20px; margin-bottom: 20px; }
    .biz-name { font-size: 22px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.3px; }
    .meta { font-size: 13px; color: #666; margin: 2px 0; }
    .item-row { display: flex; justify-content: space-between; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; padding: 16px 0 8px; border-top: 2px solid #111; margin-top: 12px; }
    .badge { display: inline-block; padding: 4px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; background: #eef2ff; color: #3730a3; }
    .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eaeaea; font-size: 12px; color: #777; }
    .powered { font-weight: 600; color: #111; display: inline-flex; align-items: center; gap: 4px; }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <h1 class="biz-name">${data.businessName}</h1>
      <p class="meta">Receipt #${data.receiptNumber}</p>
      <p class="meta">${dateFormatted}</p>
    </div>
    
    <div style="margin-bottom: 16px;">
      <p class="meta"><strong>Billed to:</strong> ${data.customerName}</p>
      ${data.escrowStatus === "held" ? `<span class="badge">Protected by Fluo Escrow</span>` : ""}
    </div>

    <div class="items">
      ${data.items.map((it) => `
        <div class="item-row">
          <span>${it.quantity}x ${it.name}</span>
          <span><strong>${fmtMoney(it.lineTotalMinor, data.currency)}</strong></span>
        </div>
      `).join("")}
    </div>

    <div class="total-row">
      <span>Total Paid</span>
      <span>${totalFormatted}</span>
    </div>

    <p class="meta" style="margin-top: 12px;">Method: ${data.paymentMethod.toUpperCase()} | Ref: ${data.paymentReference}</p>

    <div class="footer">
      <p>Thank you for your business!</p>
      <p class="powered">Powered by Fluo</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
