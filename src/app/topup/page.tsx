"use client";

import React, { useMemo, useRef, useState } from "react";

// ----------------- Types -----------------
type ApiSuccess = {
    message: string;
    data: { topupId: string; amount: number; balance: number };
};

// ----------------- ENV + Endpoint -----------------
const API = process.env.NEXT_PUBLIC_API_DOMAIN as string;
const ENDPOINT = `${API}/api/v1/topup/authorized/topups/qr`;

export default function TopupPage() {
    const [amount, setAmount] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [success, setSuccess] = useState<ApiSuccess | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // form ready?
    const canSubmit = useMemo(() => {
        const n = Number(amount);
        return !!file && Number.isFinite(n) && n > 0 && !submitting;
    }, [file, amount, submitting]);

    // เปิด file picker
    const openPicker = () => fileInputRef.current?.click();

    // ตรวจไฟล์ slip
    const acceptFile = (f: File | null) => {
        if (!f) return;
        if (!/^image\//i.test(f.type)) {
            setErrorMsg("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น");
            return;
        }
        if (f.size > 10 * 1024 * 1024) {
            setErrorMsg("ไฟล์ใหญ่เกิน 10MB");
            return;
        }
        setErrorMsg("");
        setFile(f);
        const url = URL.createObjectURL(f);
        setPreviewUrl((old) => {
            if (old) URL.revokeObjectURL(old);
            return url;
        });
    };

    // drag & drop
    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        acceptFile(e.dataTransfer.files?.[0] ?? null);
    };

    // submit เติมเงิน
    const handleSubmit = async () => {
        setErrorMsg("");
        setSuccess(null);
        if (!canSubmit) return;

        const token = localStorage.getItem("token");
        if (!token) {
            setErrorMsg("ไม่พบโทเคน กรุณาเข้าสู่ระบบก่อน");
            return;
        }

        try {
            setSubmitting(true);
            const fd = new FormData();
            fd.append("amount", String(Number(amount)));
            if (file) fd.append("slip", file);

            const res = await fetch(ENDPOINT, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                setErrorMsg(
                    (data && (data.message || data.error)) ||
                        `เกิดข้อผิดพลาด (${res.status})`
                );
                return;
            }

            setSuccess(data as ApiSuccess);

            // reset form
            setAmount("");
            setFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        } catch (err: any) {
            setErrorMsg(err?.message ?? "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 py-6 sm:py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Back / Top header */}
                <header className="mb-8">
                    <nav className="mb-6">
                        <button
                            onClick={() => (window.location.href = "/")}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:translate-x-[-10px] transition-all duration-200"
                            aria-label="กลับไปหน้าแรก"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                            <span className="font-medium text-sm sm:text-base">
                                กลับไปหน้าแรก
                            </span>
                        </button>
                    </nav>

                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-3xl sm:text-4xl">
                                    💰
                                </span>
                            </div>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                            เติมเงินเข้าระบบ
                        </h1>
                        <p className="text-gray-600 text-sm sm:text-base">
                            อัปโหลดสลิปโอนเงินเพื่อเติมเงินเข้าบัญชีของคุณ
                        </p>
                    </div>
                </header>

                {/* Success message */}
                {success && (
                    <section
                        className="max-w-3xl mx-auto mb-6"
                        aria-live="polite"
                        aria-label="ผลการเติมเงิน"
                    >
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 sm:p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg
                                        className="w-4 h-4 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>

                                <div className="flex-1">
                                    <h2 className="font-semibold text-green-900 mb-1">
                                        เติมเงินสำเร็จ! 🎉
                                    </h2>
                                    <p className="text-sm text-green-800 mb-2">
                                        {success.message}
                                    </p>

                                    <div className="space-y-1 text-sm text-green-700">
                                        <p>
                                            💵 จำนวนเงินที่เติม:{" "}
                                            <span className="font-semibold">
                                                {success.data.amount.toLocaleString()}{" "}
                                                บาท
                                            </span>
                                        </p>
                                        <p>
                                            💳 ยอดคงเหลือใหม่:{" "}
                                            <span className="font-semibold">
                                                {success.data.balance.toLocaleString()}{" "}
                                                บาท
                                            </span>
                                        </p>
                                        <p className="text-xs text-green-600">
                                            รหัสอ้างอิง:{" "}
                                            {success.data.topupId}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Error message */}
                {errorMsg && (
                    <section
                        className="max-w-3xl mx-auto mb-6"
                        role="alert"
                        aria-live="assertive"
                    >
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                            <div className="flex items-center gap-2">
                                <svg
                                    className="w-5 h-5 text-red-500 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <p className="text-red-800 text-sm font-medium">
                                    {errorMsg}
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Main 2-column content */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
                    {/* -------- Upload slip card -------- */}
                    <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <header className="bg-gray-50 border-b border-gray-200 px-5 py-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <span className="text-xl">📤</span>
                                อัปโหลดสลิปโอนเงิน
                            </h2>
                        </header>

                        <div className="p-5">
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={openPicker}
                                onKeyDown={(e) => {
                                    if (
                                        e.key === "Enter" ||
                                        e.key === " "
                                    ) {
                                        openPicker();
                                    }
                                }}
                                onDrop={onDrop}
                                onDragOver={(e) => e.preventDefault()}
                                className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 px-4 py-12 text-center transition-all hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                aria-label="อัปโหลดหรือวางสลิปโอนเงิน"
                            >
                                {!previewUrl ? (
                                    <div>
                                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                            <svg
                                                className="w-8 h-8 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                                />
                                            </svg>
                                        </div>

                                        <p className="text-base font-semibold text-gray-700 mb-2">
                                            ลากรูปมาวางที่นี่
                                        </p>
                                        <p className="text-sm text-gray-500 mb-1">
                                            หรือคลิกเพื่อเลือกไฟล์
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            รองรับไฟล์ภาพ
                                            (ขนาดไม่เกิน 10MB)
                                        </p>
                                    </div>
                                ) : (
                                    <div className="w-full">
                                        <img
                                            src={previewUrl}
                                            alt="ตัวอย่างสลิปที่อัปโหลด"
                                            className="mx-auto max-h-[420px] rounded-lg object-contain border border-gray-200 shadow-sm"
                                        />

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (previewUrl)
                                                    URL.revokeObjectURL(
                                                        previewUrl
                                                    );
                                                setPreviewUrl(null);
                                                setFile(null);
                                            }}
                                            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                            ลบรูป / เลือกใหม่
                                        </button>
                                    </div>
                                )}

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                        acceptFile(
                                            e.target.files?.[0] ?? null
                                        )
                                    }
                                />
                            </div>

                            <div className="mt-4 bg-blue-50 rounded-lg p-3">
                                <p className="text-xs text-blue-800 flex items-start gap-2">
                                    <svg
                                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span>
                                        ระบบจะตรวจสอบสลิปอัตโนมัติ
                                        กรุณาอัปโหลดสลิปที่ชัดเจน
                                    </span>
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* -------- Form / summary card -------- */}
                    <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <header className="bg-gray-50 border-b border-gray-200 px-5 py-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <span className="text-xl">📝</span>
                                รายละเอียดการเติมเงิน
                            </h2>
                        </header>

                        <div className="p-5">
                            <div className="space-y-5">
                                {/* amount input */}
                                <div>
                                    <label
                                        htmlFor="amount"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        💵 จำนวนเงิน (บาท)
                                    </label>
                                    <input
                                        id="amount"
                                        type="number"
                                        min={1}
                                        step={1}
                                        inputMode="numeric"
                                        placeholder="เช่น 100"
                                        value={amount}
                                        onChange={(e) =>
                                            setAmount(e.target.value)
                                        }
                                        className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                    />
                                </div>

                                {/* summary box */}
                                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                        📋 สรุปการเติมเงิน
                                    </h3>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">
                                            สลิป
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            {file
                                                ? "✅ อัปโหลดแล้ว"
                                                : "❌ ยังไม่ได้อัปโหลด"}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">
                                            จำนวนเงิน
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            {amount
                                                ? `${Number(
                                                      amount
                                                  ).toLocaleString()} บาท`
                                                : "ยังไม่ได้ระบุ"}
                                        </span>
                                    </div>

                                    <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between items-center">
                                        <span className="font-semibold text-gray-900">
                                            สถานะ
                                        </span>
                                        <span
                                            className={`text-sm font-semibold ${
                                                canSubmit
                                                    ? "text-green-600"
                                                    : "text-gray-400"
                                            }`}
                                        >
                                            {canSubmit
                                                ? "✅ พร้อมยืนยัน"
                                                : "⚠️ กรุณากรอกข้อมูลให้ครบ"}
                                        </span>
                                    </div>
                                </div>

                                {/* submit button */}
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={!canSubmit}
                                    className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-semibold text-white transition-all ${
                                        canSubmit
                                            ? "bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-[0.99]"
                                            : "bg-gray-300 cursor-not-allowed"
                                    }`}
                                >
                                    {submitting ? (
                                        <>
                                            <svg
                                                className="animate-spin h-5 w-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            กำลังตรวจสอบสลิป...
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                            ยืนยันการเติมเงิน
                                        </>
                                    )}
                                </button>

                                {/* tech info / debug info */}
                                <div className="bg-blue-50 rounded-lg p-3">
                                    <p className="text-xs text-blue-800">
                                        <strong>
                                            ข้อมูลทางเทคนิค:
                                        </strong>{" "}
                                        ส่ง Authorization Bearer Token +
                                        FormData (amount, slip) ไปที่{" "}
                                        <span className="font-mono break-all">
                                            {ENDPOINT}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </section>
            </div>
        </main>
    );
}
