"use client";

import { Download } from "lucide-react";

// Grey page around an A4 quotation / invoice with a "Download PDF" button (the browser's Save as PDF).
export default function PrintShell({ children, fileName, extra }: { children: React.ReactNode; fileName: string; extra?: React.ReactNode }) {
  const download = () => {
    // The browser uses the page title as the PDF file name.
    const before = document.title;
    document.title = fileName;
    window.print();
    setTimeout(() => (document.title = before), 1000);
  };
  return (
    <div className="min-h-screen bg-mist px-3 py-6 sm:py-10 print:bg-white print:p-0">
      <style>{`
        @page { size: A4; margin: 12mm; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print { html, body { background: #fff !important; } }
      `}</style>
      <div className="mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">{extra}</div>
        <button onClick={download} className="btn-dark px-5 py-2.5 text-sm"><Download size={16} /> Download PDF</button>
      </div>
      <div className="overflow-x-auto print:overflow-visible">
        <div className="min-w-[700px] print:min-w-0">{children}</div>
      </div>
      <p className="mx-auto mt-4 max-w-[210mm] text-center text-xs text-muted print:hidden">In the print window choose <b>Save as PDF</b> as the printer.</p>
    </div>
  );
}
