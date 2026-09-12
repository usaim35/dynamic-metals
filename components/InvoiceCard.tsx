"use client";

import { InvoiceData, InvoiceLineItem, computeTotals, lineTotal } from "@/lib/types";
import { CheckCircle, AlertCircle, Loader, Trash2, FileSpreadsheet, Plus, X } from "lucide-react";

interface Props {
  invoice: InvoiceData;
  onChange: (updated: InvoiceData) => void;
  onDownload: (invoice: InvoiceData) => void;
  onRemove: (id: string) => void;
}

export default function InvoiceCard({ invoice, onChange, onDownload, onRemove }: Props) {
  const update = (patch: Partial<InvoiceData>) => onChange({ ...invoice, ...patch });
  const updateItem = (idx: number, patch: Partial<InvoiceLineItem>) => {
    const items = invoice.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange({ ...invoice, items });
  };

  const addItem = () => {
    onChange({
      ...invoice,
      items: [
        ...invoice.items,
        { description: "", unit: "PCS", quantity: 0, unitPrice: 0, weightKg: 0, priceKg: 0 }
      ]
    });
  };

  const removeItem = (idx: number) => {
    onChange({ ...invoice, items: invoice.items.filter((_, i) => i !== idx) });
  };

  const { subtotal, tax, total } = computeTotals(invoice.items, invoice.taxRatePercent);

  const statusConfig = {
    extracting: {
      icon: Loader,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      label: "Reading image with AI..."
    },
    ready: {
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950/30",
      label: "Ready"
    },
    error: {
      icon: AlertCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
      label: "Error"
    }
  };

  const config = statusConfig[invoice.status];
  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div
        className={`${config.bg} border-b border-gray-200 dark:border-gray-800 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4`}
      >
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {invoice.sourceImageDataUrl && (
            <img
              src={invoice.sourceImageDataUrl}
              alt={invoice.sourceImageName}
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl shadow-sm flex-shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">{invoice.sourceImageName}</h3>
            <div className={`flex items-center gap-1.5 mt-1.5 ${config.color}`}>
              <Icon className={`w-4 h-4 ${invoice.status === "extracting" ? "animate-spin" : ""}`} />
              <span className="text-sm font-medium">
                {config.label}
                {invoice.status === "error" && invoice.error && `: ${invoice.error}`}
              </span>
            </div>
            {invoice.status === "ready" && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Invoice #{invoice.invoiceNumber} · {invoice.items.length} item{invoice.items.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onDownload(invoice)}
            disabled={invoice.status !== "ready"}
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2 font-medium text-sm shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => onRemove(invoice.id)}
            className="p-2.5 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {invoice.status === "ready" && (
        <div className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
                Buyer Information
              </h4>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Name</label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent mt-1"
                  value={invoice.buyerName}
                  onChange={(e) => update({ buyerName: e.target.value })}
                  placeholder="Buyer name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Address</label>
                <textarea
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent mt-1"
                  rows={2}
                  value={invoice.buyerAddress}
                  onChange={(e) => update({ buyerAddress: e.target.value })}
                  placeholder="Buyer address"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">NTN</label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent mt-1"
                    value={invoice.buyerNtn}
                    onChange={(e) => update({ buyerNtn: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">PO #</label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent mt-1"
                    value={invoice.buyerPo}
                    onChange={(e) => update({ buyerPo: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
                Invoice Details
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Invoice #
                  </label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent mt-1"
                    value={invoice.invoiceNumber}
                    onChange={(e) => update({ invoiceNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">HS Code</label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent mt-1"
                    value={invoice.hsCode}
                    onChange={(e) => update({ hsCode: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent mt-1"
                    value={invoice.invoiceDate}
                    onChange={(e) => update({ invoiceDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent mt-1"
                    value={invoice.dueDate}
                    onChange={(e) => update({ dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent mt-1"
                  value={invoice.taxRatePercent}
                  onChange={(e) => update({ taxRatePercent: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
              Line Items
            </h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-primary/5 dark:bg-primary/10 border-b border-gray-200 dark:border-gray-700">
                    <th className="p-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">#</th>
                    <th className="p-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">Description</th>
                    <th className="p-2.5 text-center font-semibold text-gray-600 dark:text-gray-300">Unit</th>
                    <th className="p-2.5 text-right font-semibold text-gray-600 dark:text-gray-300">Qty</th>
                    <th className="p-2.5 text-right font-semibold text-gray-600 dark:text-gray-300">Price</th>
                    <th className="p-2.5 text-right font-semibold text-gray-600 dark:text-gray-300">Wt(kg)</th>
                    <th className="p-2.5 text-right font-semibold text-gray-600 dark:text-gray-300">Pr/Kg</th>
                    <th className="p-2.5 text-right font-semibold text-gray-600 dark:text-gray-300">Total</th>
                    <th className="p-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="p-2 font-semibold text-gray-400 dark:text-gray-500">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          className="w-full min-w-[150px] px-2 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-xs"
                          value={item.description}
                          onChange={(e) => updateItem(idx, { description: e.target.value })}
                          placeholder="Description"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="w-16 px-2 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-xs text-center"
                          value={item.unit}
                          onChange={(e) => updateItem(idx, { unit: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className="w-16 px-2 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-xs text-right"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className="w-16 px-2 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-xs text-right"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className="w-16 px-2 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-xs text-right"
                          value={item.weightKg}
                          onChange={(e) => updateItem(idx, { weightKg: Number(e.target.value) })}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className="w-16 px-2 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-xs text-right"
                          value={item.priceKg}
                          onChange={(e) => updateItem(idx, { priceKg: Number(e.target.value) })}
                        />
                      </td>
                      <td className="p-2 text-right font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {lineTotal(item).toLocaleString()}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 p-1 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={addItem}
              className="text-sm text-primary hover:text-primary/80 font-semibold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Line Item
            </button>
          </div>

          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tax ({invoice.taxRatePercent}%)</span>
                <span className="font-semibold text-accent">
                  {tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-t border-gray-300 dark:border-gray-700 pt-2 flex justify-between font-bold text-base">
                <span className="text-gray-800 dark:text-gray-100">Total</span>
                <span className="text-primary">{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
