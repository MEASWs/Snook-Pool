"use client";
export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ---------- ENV BASE ----------
const API = process.env.NEXT_PUBLIC_API_DOMAIN as string;

// ---------- Types ----------
type TableType = "SNOOKER" | "POOL";
type ReservationStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
type PaymentMethod = "CASH" | "WALLET_BALANCE" | "BANK_TRANSFER" | "QR_PAYMENT";
type PaymentStatus = "PENDING" | "PAID" | "CANCELLED";

type Table = { id: string; number: number; type: TableType; hourlyRate: number; };
type Payment = { id: string; amount: number; method: PaymentMethod; status: PaymentStatus; paidAt: string | null; };
type Reservation = {
    id: string;
    status: ReservationStatus;
    startTime: string | null;
    endTime: string | null;
    duration: number | null;
    totalPrice: number | null;
    table: Table | null;
    lastPayment: Payment | null;
};

// ---------- Constant maps ----------
const STATUS_TEXT: Record<ReservationStatus, string> = {
    PENDING: "รอดำเนินการ",
    CONFIRMED: "ยืนยันแล้ว",
    COMPLETED: "เสร็จสิ้น",
    CANCELLED: "ยกเลิก",
};
const STATUS_COLOR: Record<ReservationStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
};
const METHOD_TEXT: Record<PaymentMethod, string> = {
    CASH: "เงินสด",
    WALLET_BALANCE: "กระเป๋าเงิน",
    BANK_TRANSFER: "โอนเงิน",
    QR_PAYMENT: "QR Code",
};

// ---------- Helpers ----------
function makeLocalNoShift(iso?: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
}
function formatThaiTime(iso?: string | null) {
    if (!iso) return "-";
    const fixedDate = makeLocalNoShift(iso);
    if (!fixedDate) return "-";
    return new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
    }).format(fixedDate);
}
function getTableTypeIcon(t?: TableType | null) {
    return t === "POOL" ? "🎯" : "🎱";
}

// ---------------------
// ชั้นใน: ใช้ hooks ได้
// ---------------------
function MyReservationsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const focusId = searchParams.get("focus");

    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [cancelError, setCancelError] = useState<string | null>(null);

    // โหลดข้อมูล
    useEffect(() => {
        (async () => {
            try {
                const token = localStorage.getItem("token") || "";
                const res = await fetch(`${API}/api/v1/reservation/authorized/reservations`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json?.message || "โหลดข้อมูลล้มเหลว");

                const list: Reservation[] = Array.isArray(json?.data) ? json.data : [];
                list.forEach((r) => {
                    if (r.lastPayment?.status === "PAID")
                        localStorage.removeItem(`cashpay:${r.id}`);
                });
                list.sort((a, b) => {
                    const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
                    const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
                    return tb - ta;
                });
                setReservations(list);
            } catch (e: any) {
                setError(e?.message || "โหลดข้อมูลล้มเหลว");
            } finally {
                // หน่วงนิดหน่อยเพื่อโชว์ loading animation ดูเนียน
                setTimeout(() => {
                    setLoading(false);
                }, 1000);
            }
        })();
    }, []);

    // auto scroll
    useEffect(() => {
        if (!focusId) return;
        const t = setTimeout(() => {
            document.getElementById(`res-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
        return () => clearTimeout(t);
    }, [focusId, reservations.length]);

    async function handleCancelReservation(id: string) {
        setCancelError(null);
        setCancellingId(id);
        try {
            const token = localStorage.getItem("token") || "";
            if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อนยกเลิก");

            const res = await fetch(`${API}/api/v1/reservation/authorized/reservations/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.message || "ยกเลิกไม่สำเร็จ");

            const serverData = json?.data;
            setReservations((prev) =>
                prev.map((r) =>
                    r.id !== id
                        ? r
                        : {
                            ...r,
                            status: serverData?.status ?? "CANCELLED",
                            lastPayment: r.lastPayment
                                ? { ...r.lastPayment, status: "CANCELLED" }
                                : r.lastPayment,
                        }
                )
            );
            localStorage.removeItem(`cashpay:${id}`);
        } catch (err: any) {
            setCancelError(err?.message || "เกิดข้อผิดพลาดในการยกเลิก");
        } finally {
            setCancellingId(null);
        }
    }

    // ---------- Loading State (semantic-friendly) ----------
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div
                    className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
                    aria-label="กำลังโหลดข้อมูลการจอง"
                ></div>
            </div>
        );
    }

    // ---------- Main Render ----------
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <header className="max-w-7xl mx-auto mb-6">
                <nav
                    aria-label="การนำทางหลัก"
                    className="flex justify-between"
                >
                    <button
                        onClick={() => router.push("/")}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:translate-x-[-10px] transition-all duration-200"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        <span className="font-medium">กลับไปหน้าแรก</span>
                    </button>
                </nav>
            </header>

            <main role="main" className="max-w-7xl mx-auto">
                {/* ส่วนหัวของหน้า */}
                <section
                    aria-labelledby="reservations-page-title"
                    className="text-center mb-8"
                >
                    <div className="flex justify-center mb-4" aria-hidden="true">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center transition-all duration-300">
                            <span className="text-3xl">📋</span>
                        </div>
                    </div>

                    <h1
                        id="reservations-page-title"
                        className="text-3xl font-bold text-gray-900 mb-2"
                    >
                        รายการจองของฉัน
                    </h1>

                    <p className="text-gray-500 text-sm">
                        ตรวจสอบและจัดการการจองของคุณ
                    </p>
                </section>

                {/* แสดง Error */}
                {(error || cancelError) && (
                    <div
                        role="alert"
                        className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-6 max-w-2xl mx-auto"
                    >
                        {error || cancelError}
                    </div>
                )}

                {/* สถิติรวม */}
                <section
                    aria-label="สถานะภาพรวมของการจอง"
                    className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto"
                >
                    <article className="bg-white rounded-xl p-4 shadow-sm transition-all duration-300">
                        <div className="text-2xl font-bold text-gray-900">
                            {reservations.length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            การจองทั้งหมด
                        </div>
                    </article>

                    <article className="bg-white rounded-xl p-4 shadow-sm transition-all duration-300">
                        <div className="text-2xl font-bold text-green-600">
                            {reservations.filter((r) => r.lastPayment?.status === "PAID").length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            ชำระแล้ว
                        </div>
                    </article>

                    <article className="bg-white rounded-xl p-4 shadow-sm transition-all duration-300">
                        <div className="text-2xl font-bold text-yellow-600">
                            {reservations.filter((r) => r.lastPayment?.status === "PENDING").length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            รอชำระเงิน
                        </div>
                    </article>
                </section>

                {/* ไม่มีรายการ */}
                {reservations.length === 0 ? (
                    <section
                        role="status"
                        aria-live="polite"
                        className="text-center py-12"
                    >
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-transform duration-300">
                            <svg
                                className="w-8 h-8 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>

                        <h2 className="text-lg font-semibold text-gray-900 mb-2">
                            ยังไม่มีการจอง
                        </h2>

                        <p className="text-gray-500 text-sm mb-6">
                            เริ่มต้นจองโต๊ะเพื่อเล่นเกมของคุณ
                        </p>

                        <button
                            onClick={() => router.push("/pool")}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-105"
                        >
                            เริ่มจองเลย
                        </button>
                    </section>
                ) : (
                    <section
                        aria-labelledby="reservation-list-title"
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        <h2 id="reservation-list-title" className="sr-only">
                            รายการจองทั้งหมด
                        </h2>

                        {reservations.map((r) => {
                            const hasPaid = r.lastPayment?.status === "PAID";
                            const canCancel = !hasPaid && r.status !== "CANCELLED";

                            return (
                                <article
                                    key={r.id}
                                    id={`res-${r.id}`}
                                    className="bg-white rounded-2xl shadow-sm transition-all duration-300 overflow-hidden group"
                                    aria-labelledby={`reservation-${r.id}-title`}
                                >
                                    {/* หัวการ์ด */}
                                    <header
                                        className={`px-6 py-4 ${
                                            hasPaid
                                                ? "bg-green-50"
                                                : r.status === "CANCELLED"
                                                ? "bg-red-50"
                                                : "bg-blue-50"
                                        } transition-colors duration-300`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <h3
                                                    id={`reservation-${r.id}-title`}
                                                    className="text-xl font-bold text-gray-900 transition-transform duration-300"
                                                >
                                                    {getTableTypeIcon(r.table?.type)} โต๊ะที่ {r.table?.number ?? "-"}
                                                </h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {r.table?.hourlyRate ?? 0} ฿/ช.ม.
                                                </p>
                                            </div>

                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-transform duration-300 ${STATUS_COLOR[r.status]}`}
                                            >
                                                {STATUS_TEXT[r.status]}
                                            </span>
                                        </div>
                                    </header>

                                    {/* เนื้อหาการ์ด */}
                                    <section className="px-6 py-5">
                                        {/* รายละเอียดเวลา */}
                                        <div className="bg-gray-50 rounded-xl p-4 mb-4 transition-colors duration-300">
                                            <div className="space-y-2 text-sm">
                                                {/* เวลาเริ่ม - จบ */}
                                                <div className="flex items-start transition-transform duration-200">
                                                    <svg
                                                        className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                        aria-hidden="true"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>

                                                    <div className="text-gray-700 text-xs">
                                                        <div>
                                                            Start: {formatThaiTime(r.startTime)}
                                                        </div>
                                                        <div className="mt-1">
                                                            End: {formatThaiTime(r.endTime)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ระยะเวลาและราคา */}
                                                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                                    <span className="text-gray-600">
                                                        ระยะเวลา: {r.duration ?? 0} ชม.
                                                    </span>
                                                    <span className="text-blue-600 font-semibold">
                                                        {r.totalPrice ?? 0} ฿
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* สถานะการชำระเงิน */}
                                        {r.lastPayment && (
                                            <div className="mb-4 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-600">การชำระเงิน:</span>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            r.lastPayment.status === "PAID"
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-yellow-100 text-yellow-700"
                                                        }`}
                                                    >
                                                        {r.lastPayment.status === "PAID" ? "✓ ชำระแล้ว" : "รอชำระ"}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* ปุ่มดำเนินการ */}
                                        <footer className="space-y-2">
                                            <button
                                                onClick={() => router.push(`/selectpayment?reservationId=${r.id}`)}
                                                disabled={hasPaid}
                                                className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-300 ${
                                                    hasPaid
                                                        ? "bg-green-100 text-green-600 cursor-not-allowed"
                                                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-lg hover:scale-105"
                                                }`}
                                                aria-label={hasPaid ? "ชำระเงินเรียบร้อยแล้ว" : "ไปชำระเงิน"}
                                            >
                                                {hasPaid ? "✅ ชำระเงินแล้ว" : "💸 ชำระเงิน"}
                                            </button>

                                            {canCancel ? (
                                                <button
                                                    onClick={() => handleCancelReservation(r.id)}
                                                    disabled={cancellingId === r.id}
                                                    className={`w-full py-3.5 rounded-xl font-semibold border transition-all duration-300 ${
                                                        cancellingId === r.id
                                                            ? "bg-gray-100 text-gray-400"
                                                            : "bg-white text-red-600 border-red-300 hover:bg-red-50"
                                                    }`}
                                                    aria-label={cancellingId === r.id ? "กำลังยกเลิกการจอง" : "ยกเลิกการจอง"}
                                                >
                                                    {cancellingId === r.id ? "กำลังยกเลิก..." : "ยกเลิกการจอง"}
                                                </button>
                                            ) : (
                                                <button
                                                    disabled
                                                    className="w-full py-3.5 rounded-xl font-semibold bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
                                                    aria-label="ไม่สามารถยกเลิกได้"
                                                >
                                                    ยกเลิกไม่ได้
                                                </button>
                                            )}
                                        </footer>
                                    </section>
                                </article>
                            );
                        })}
                    </section>
                )}
            </main>
        </div>
    );
}

// ---------------------
// ชั้นนอก: Suspense Wrapper
// ---------------------
export default function MyReservationsPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            }
        >
            <MyReservationsContent />
        </Suspense>
    );
}