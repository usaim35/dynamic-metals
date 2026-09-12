"use client";

import { useRef, useState, useEffect } from "react";
import { InvoiceData } from "@/lib/types";
import { buildInvoiceExcel } from "@/lib/invoiceExcel";
import { STARTING_INVOICE_NUMBER, DEFAULT_TAX_RATE } from "@/lib/companyInfo";
import { getSession, clearSession } from "@/lib/auth";
import { useTheme } from "next-themes";
import LoginPage from "@/components/LoginPage";
import InvoiceCard from "@/components/InvoiceCard";
import { LogOut, Upload, Download, Moon, Sun, FileSpreadsheet, Sparkles } from "lucide-react";
import Image from "next/image";

let logoIconCache: string | null = null;
let logoWordmarkCache: string | null = null;

function fetchAsBase64(url: string): Promise<string> {
  return fetch(url)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );
}

async function getLogos(): Promise<{ icon: string | null; wordmark: string | null }> {
  try {
    if (!logoIconCache) logoIconCache = await fetchAsBase64('/logo-icon.png');
    if (!logoWordmarkCache) logoWordmarkCache = await fetchAsBase64('/logo-wordmark.png');
    return { icon: logoIconCache, wordmark: logoWordmarkCache };
  } catch {
    return { icon: null, wordmark: null };
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function downloadBlob(buffer: Buffer, filename: string) {
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(STARTING_INVOICE_NUMBER);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const session = getSession();
    if (session) setAuthenticated(true);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage onLoginSuccess={() => setAuthenticated(true)} />;
  }

  const handleLogout = () => {
    clearSession();
    setAuthenticated(false);
    setInvoices([]);
  };

  const updateInvoice = (updated: InvoiceData) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
  };

  const removeInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  const downloadOne = async (invoice: InvoiceData) => {
    const { icon, wordmark } = await getLogos();
    const buffer = await buildInvoiceExcel(invoice, icon, wordmark);
    downloadBlob(buffer, `Invoice-${invoice.invoiceNumber}.xlsx`);
  };

  const downloadAll = async () => {
    const ready = invoices.filter((i) => i.status === "ready");
    if (ready.length === 0) return;
    for (const inv of ready) {
      await downloadOne(inv);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).slice(0, 10);
    const startNumber = nextInvoiceNumber;

    const drafts: InvoiceData[] = await Promise.all(
      fileArray.map(async (file, idx) => {
        const dataUrl = await fileToDataUrl(file);
        return {
          id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2)}`,
          sourceImageName: file.name,
          sourceImageDataUrl: dataUrl,
          buyerName: "",
          buyerAddress: "",
          buyerNtn: "",
          buyerPo: "",
          invoiceNumber: String(startNumber + idx),
          invoiceDate: todayIso(),
          dueDate: "",
          hsCode: "",
          taxRatePercent: DEFAULT_TAX_RATE,
          items: [],
          status: "extracting" as const
        };
      })
    );

    setInvoices((prev) => [...drafts, ...prev]);
    setNextInvoiceNumber(startNumber + fileArray.length);

    drafts.forEach((draft, idx) => {
      extractInvoice(draft, fileArray[idx]);
    });
  };

  const extractInvoice = async (draft: InvoiceData, file: File) => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/extract-invoice", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === draft.id ? { ...inv, status: "error", error: json.error || "Extraction failed" } : inv
          )
        );
        return;
      }

      const d = json.data;
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === draft.id
            ? {
                ...inv,
                status: "ready",
                buyerName: d.buyerName && d.buyerName !== "-" ? d.buyerName : "",
                buyerAddress: d.buyerAddress && d.buyerAddress !== "-" ? d.buyerAddress : "",
                buyerNtn: d.buyerNtn && d.buyerNtn !== "-" ? d.buyerNtn : "",
                buyerPo: d.buyerPo && d.buyerPo !== "-" ? d.buyerPo : "",
                invoiceDate: d.invoiceDate && d.invoiceDate !== "-" ? d.invoiceDate : inv.invoiceDate,
                hsCode: d.hsCode && d.hsCode !== "-" ? d.hsCode : "",
                items:
                  Array.isArray(d.items) && d.items.length > 0
                    ? d.items.map((it: any) => ({
                        description: it.description || "",
                        unit: it.unit || "PCS",
                        quantity: Number(it.quantity) || 0,
                        unitPrice: Number(it.unitPrice) || 0,
                        weightKg: Number(it.weightKg) || 0,
                        priceKg: Number(it.priceKg) || 0
                      }))
                    : [{ description: "", unit: "PCS", quantity: 0, unitPrice: 0, weightKg: 0, priceKg: 0 }]
              }
            : inv
        )
      );
    } catch (err: any) {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === draft.id ? { ...inv, status: "error", error: err?.message || "Network error" } : inv
        )
      );
    }
  };

  const readyCount = invoices.filter((i) => i.status === "ready").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 flex-shrink-0">
              <Image src="/logo.png" alt="DynamicMetal" fill className="object-contain" priority />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                DynamicMetal
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium hidden sm:block">
                Professional Invoice Generator
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 sm:px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:text-white hover:bg-red-600 rounded-xl transition-all flex items-center gap-2 font-semibold text-sm border border-gray-200 dark:border-gray-700 hover:border-red-600"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-10 sm:px-6 lg:px-8">
        {/* Upload Section */}
        <div
          className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-xl border-2 border-dashed border-primary/20 dark:border-primary/30 p-8 sm:p-16 text-center hover:border-primary hover:shadow-2xl transition-all duration-300 cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-all duration-300 shadow-lg">
              <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">Upload Order Photos</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-2 text-base sm:text-lg">
            Drag & drop your order images here, or{" "}
            <span className="text-primary font-semibold">click to browse</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 pt-2">
            <span className="flex items-center gap-1">✓ Max 10 images</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="flex items-center gap-1">✓ No size limit</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AI-powered
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Stats & Actions */}
        {invoices.length > 0 && (
          <div className="mt-8 sm:mt-10 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 w-full sm:w-auto">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Progress</p>
              <div className="flex items-center gap-6 justify-center sm:justify-start">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-3xl font-bold text-primary">{invoices.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Images Uploaded</p>
                </div>
                <div className="h-12 w-px bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-700 to-transparent"></div>
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-3xl font-bold text-accent">{readyCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ready to Download</p>
                </div>
              </div>
            </div>
            <button
              onClick={downloadAll}
              disabled={readyCount === 0}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent text-white rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>Download All Excel ({readyCount})</span>
            </button>
          </div>
        )}

        {/* Invoices Grid */}
        <div className="mt-10 sm:mt-12 space-y-6">
          {invoices.length === 0 ? (
            <div className="text-center py-20 sm:py-24 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="inline-block p-4 bg-primary/10 dark:bg-primary/20 rounded-full mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <p className="text-gray-700 dark:text-gray-200 text-lg sm:text-xl font-semibold mb-2">
                Ready to create invoices?
              </p>
              <p className="text-gray-500 dark:text-gray-400">Upload your first order photo above to get started</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onChange={updateInvoice}
                onDownload={downloadOne}
                onRemove={removeInvoice}
              />
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 border-t border-gray-200 dark:border-gray-800 mt-16 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10 text-center space-y-2">
          <p className="font-bold text-gray-800 dark:text-gray-200">© 2026 DynamicMetal Solutions</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Powered by <span className="font-semibold text-primary">Usaim AI</span> | All rights reserved
          </p>
        </div>
      </footer>

      {/* Theme Toggle - fixed bottom left */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="fixed bottom-6 left-6 p-3.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all z-50"
        aria-label="Toggle theme"
      >
        {mounted && (theme === "dark" ? (
          <Sun className="w-5 h-5 text-amber-500" />
        ) : (
          <Moon className="w-5 h-5 text-gray-600" />
        ))}
      </button>
    </div>
  );
}
