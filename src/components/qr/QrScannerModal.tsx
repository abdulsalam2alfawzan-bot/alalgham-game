"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

type QrScannerModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onScan: (value: string) => void;
};

function scannerErrorMessage(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);

  if (/notallowed|permission|denied/i.test(text)) {
    return "لم يتم السماح باستخدام الكاميرا";
  }

  if (/notfound|devicesnotfound|overconstrained|no camera/i.test(text)) {
    return "لم يتم العثور على كاميرا";
  }

  return "تعذر قراءة الرمز، حاول مرة أخرى";
}

export function QrScannerModal({ open, title, onClose, onScan }: QrScannerModalProps) {
  const reactId = useId();
  const scannerElementId = useMemo(
    () => `qr-scanner-${reactId.replace(/[^A-Za-z0-9_-]/g, "")}`,
    [reactId],
  );
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  const [status, setStatus] = useState("اضغط السماح للكاميرا عند ظهور الطلب.");
  const [error, setError] = useState("");

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // The stream may already be closed by the browser.
    } finally {
      scannerRef.current = null;
      setStatus("تم إيقاف الكاميرا.");
    }
  }, []);

  const closeScanner = useCallback(() => {
    void stopCamera().finally(onClose);
  }, [onClose, stopCamera]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    scannedRef.current = false;

    const timer = window.setTimeout(() => {
      async function startScanner() {
        setError("");
        setStatus("جاري تشغيل الكاميرا...");

        if (!navigator.mediaDevices?.getUserMedia) {
          setError("يمكنك استخدام كاميرا الجوال لمسح الرمز أو إدخال الرمز يدويًا.");
          setStatus("");
          return;
        }

        try {
          const { Html5Qrcode } = await import("html5-qrcode");
          const cameras = await Html5Qrcode.getCameras();
          if (cancelled) {
            return;
          }

          if (!cameras.length) {
            setError("لم يتم العثور على كاميرا");
            setStatus("");
            return;
          }

          const scanner = new Html5Qrcode(scannerElementId, false);
          scannerRef.current = scanner;

          const backCamera =
            cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ?? cameras[0];

          await scanner.start(
            backCamera.id,
            { fps: 10, qrbox: { width: 240, height: 240 } },
            (decodedText) => {
              if (scannedRef.current) {
                return;
              }

              scannedRef.current = true;
              void stopCamera().finally(() => {
                onScan(decodedText);
                onClose();
              });
            },
            () => undefined,
          );

          if (!cancelled) {
            setStatus("وجّه الكاميرا نحو رمز QR.");
          }
        } catch (caughtError) {
          if (!cancelled) {
            setError(scannerErrorMessage(caughtError));
            setStatus("");
          }
        }
      }

      void startScanner();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      void stopCamera();
    };
  }, [onClose, onScan, open, scannerElementId, stopCamera]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="grid max-h-full w-full max-w-md gap-4 overflow-auto rounded-3xl bg-white p-4 text-slate-950 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">{title}</h2>
          <button
            type="button"
            onClick={closeScanner}
            className="min-h-10 rounded-2xl border border-slate-200 px-4 text-sm font-black"
          >
            إغلاق
          </button>
        </div>

        <div
          id={scannerElementId}
          className="min-h-72 overflow-hidden rounded-3xl bg-slate-950 [&_video]:rounded-3xl"
        />

        {status ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-600">
            {status}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-800 ring-1 ring-rose-100">
            {error}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={stopCamera}
            className="min-h-12 rounded-2xl bg-slate-950 px-4 text-base font-black text-white"
          >
            إيقاف الكاميرا
          </button>
          <button
            type="button"
            onClick={closeScanner}
            className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base font-black text-slate-700"
          >
            إغلاق
          </button>
        </div>
      </section>
    </div>
  );
}
