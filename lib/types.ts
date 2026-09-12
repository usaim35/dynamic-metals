export interface InvoiceLineItem {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  weightKg: number;
  priceKg: number;
}

export interface InvoiceData {
  id: string;
  sourceImageName: string;
  sourceImageDataUrl: string;
  buyerName: string;
  buyerAddress: string;
  buyerNtn: string;
  buyerPo: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  hsCode: string;
  taxRatePercent: number;
  items: InvoiceLineItem[];
  status: "extracting" | "ready" | "error";
  error?: string;
}

export function computeTotals(items: InvoiceLineItem[], taxRatePercent: number) {
  const subtotal = items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unitPrice + item.weightKg * item.priceKg;
    return sum + lineTotal;
  }, 0);
  const tax = subtotal * (taxRatePercent / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

export function lineTotal(item: InvoiceLineItem): number {
  return item.quantity * item.unitPrice + item.weightKg * item.priceKg;
}
