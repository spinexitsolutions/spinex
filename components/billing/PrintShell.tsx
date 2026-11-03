"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";

// Grey page around an A4 quotation / invoice with a "Download PDF" button (the browser's Save as PDF).
// `fit`: on small screens the A4 pages shrink to the screen width (like a PDF viewer) instead of scrolling sideways.
export default function PrintShell({ children, fileName, extra, fit }: { children: React.ReactNode; fileName: string; extra?: React.ReactNode; fit?: boolean }) {
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
      {fit ? (
        <FitWidth>{children}</FitWidth>
      ) : (
        <div className="overflow-x-auto print:overflow-visible">
          <div className="min-w-[700px] print:min-w-0">{children}</div>
        </div>
      )}
      <p className="mx-auto mt-4 max-w-[210mm] text-center text-xs text-muted print:hidden">In the print window choose <b>Save as PDF</b> as the printer.</p>
    </div>
  );
}

// Shrinks A4 content (210mm wide) to fit the screen. Full size when it fits, and always when printing.
function FitWidth({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ scale: number; height?: number }>({ scale: 1 });
  useEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const scale = Math.min(1, o.clientWidth / i.offsetWidth);
      setBox({ scale, height: scale < 1 ? i.offsetHeight * scale : undefined });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="mx-auto max-w-[210mm] overflow-hidden print:!h-auto print:max-w-none print:overflow-visible" style={{ height: box.height }} data-fit-scale={box.scale}>
      <div ref={inner} className="w-[210mm] origin-top-left print:w-auto print:!transform-none" style={box.scale < 1 ? { transform: `scale(${box.scale})` } : undefined}>
        {children}
      </div>
    </div>
  );
}
