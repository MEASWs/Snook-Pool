"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ---------- Types ----------
type TableType = "SNOOKER" | "POOL";
type ReservationStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
type PaymentMethod = "CASH" | "WALLET_BALANCE" | "BANK_TRANSFER" | "QR_PAYMENT";
type PaymentStatus = "PENDING" | "PAID" | "CANCELLED";

type Table = {
    id: string;
    number: number;
    type: TableType;
    hourlyRate: number;
};

type Payment = {
    id: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    paidAt: string | null;
};

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

// ---------- Constant maps (type-safe) ----------
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

const PAY_STATUS_TEXT: Record<PaymentStatus, string> = {
    PENDING: "รอชำระ",
    PAID: "ชำระแล้ว",
    CANCELLED: "ยกเลิก",
};

const PAY_STATUS_COLOR: Record<PaymentStatus, string> = {
    PENDING: "bg-orange-100 text-orange-700",
    PAID: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
};

const METHOD_TEXT: Record<PaymentMethod, string> = {
    CASH: "เงินสด",
    WALLET_BALANCE: "กระเป๋าเงิน",
    BANK_TRANSFER: "โอนเงิน",
    QR_PAYMENT: "QR Code",
};

// ---------- Helpers ----------
const formatThaiTime = (iso?: string | null) => {
    if (!iso) return "-";
    return new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
    }).format(new Date(iso));
};

const getTableTypeIcon = (t?: TableType | null) => (t === "POOL" ? "🎯" : "🎱");

// =========================================

export default function MyReservationsPage() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const focusId = searchParams.get("focus");

    // Load reservations
    useEffect(() => {
        (async () => {
            try {
                const token = localStorage.getItem("token") || "";
                const res = await fetch(
                    "http://localhost:3001/api/v1/reservation/authorized/reservations",
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                );
                const json = await res.json();

                if (!res.ok) throw new Error(json?.message || "Failed to fetch");

                const list: Reservation[] = Array.isArray(json?.data) ? json.data : [];
                // sort latest first
                list.sort((a, b) => {
                    const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
                    const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
                    return tb - ta;
                });

                setReservations(list);
            } catch (e: any) {
                setError(e?.message || "โหลดข้อมูลล้มเหลว");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Auto scroll to focused card (?focus=ID)
    useEffect(() => {
        if (!focusId) return;
        const t = setTimeout(() => {
            const el = document.getElementById(`res-${focusId}`);
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
        return () => clearTimeout(t);
    }, [focusId, reservations.length]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-7xl mx-auto mb-8">
                {/* Back Button */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push("/")}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:-translate-x-2 transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="font-medium">กลับไปหน้าแรก</span>
                    </button>
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">รายการจองของฉัน</h1>
                    <p className="text-gray-500 text-sm">ดูและจัดการการจองทั้งหมดของคุณ</p>
                </div>

                {/* Error */}
                {error && (
                    <div className="max-w-2xl mx-auto mb-6">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
                    </div>
                )}

                {/* Stats */}
                {reservations.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
                        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                            <div className="text-2xl font-bold text-gray-900">{reservations.length}</div>
                            <div className="text-xs text-gray-500 mt-1">การจองทั้งหมด</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {reservations.filter((r) => r.status === "CONFIRMED").length}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">ยืนยันแล้ว</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {reservations.filter((r) => r.status === "COMPLETED").length}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">เสร็จสิ้น</div>
                        </div>
                    </div>
                )}

                {/* List */}
                {reservations.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reservations.map((reservation) => {
                            const isPaid = reservation.lastPayment?.status === "PAID";
                            const canPay =
                                !isPaid &&
                                reservation.status !== "CANCELLED" &&
                                (reservation.status === "PENDING" || reservation.status === "CONFIRMED");

                            const total =
                                typeof reservation.totalPrice === "number"
                                    ? reservation.totalPrice
                                    : (reservation.table?.hourlyRate ?? 0) * (reservation.duration ?? 0);

                            return (
                                <div
                                    id={`res-${reservation.id}`}
                                    key={reservation.id}
                                    className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden ${focusId === reservation.id ? "ring-2 ring-blue-400" : ""
                                        }`}
                                >
                                    {/* Header */}
                                    <div
                                        className={`px-6 py-4 ${reservation.status === "CONFIRMED"
                                            ? "bg-blue-50"
                                            : reservation.status === "COMPLETED"
                                                ? "bg-green-50"
                                                : reservation.status === "CANCELLED"
                                                    ? "bg-red-50"
                                                    : "bg-yellow-50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{getTableTypeIcon(reservation.table?.type)}</span>
                                                <div>
                                                    <h2 className="text-xl font-bold text-gray-900">
                                                        โต๊ะที่ {reservation.table?.number ?? "-"}
                                                    </h2>
                                                    <p className="text-sm text-gray-600">
                                                        {reservation.table?.type} • {reservation.table?.hourlyRate} ฿/ช.ม.
                                                    </p>
                                                </div>
                                            </div>
                                            <div
                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[reservation.status]
                                                    }`}
                                            >
                                                {STATUS_TEXT[reservation.status]}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="px-6 py-5">
                                        <div className="space-y-3 mb-4">
                                            <div className="text-sm text-gray-700">
                                                <div className="font-medium mb-1">เวลาจอง</div>
                                                <div className="text-xs text-gray-600">
                                                    {reservation.startTime ? formatThaiTime(reservation.startTime) : "-"}
                                                </div>
                                                {reservation.endTime && (
                                                    <div className="text-xs text-gray-600 mt-1">
                                                        ถึง {formatThaiTime(reservation.endTime)}
                                                    </div>
                                                )}
                                            </div>

                                            {reservation.duration && (
                                                <div className="text-sm text-gray-700">
                                                    ระยะเวลา: <span className="font-medium">{reservation.duration} ชั่วโมง</span>
                                                </div>
                                            )}

                                            <div className="text-sm text-gray-700">
                                                ราคารวม: <span className="font-bold text-blue-600">{total} ฿</span>
                                            </div>
                                        </div>

                                        {/* Payment box */}
                                        {reservation.lastPayment && (
                                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                                <div className="text-xs font-semibold text-gray-700 mb-2">ข้อมูลการชำระเงิน</div>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">วิธีชำระ</span>
                                                        <span className="font-medium text-gray-900">
                                                            {METHOD_TEXT[reservation.lastPayment.method]}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">จำนวนเงิน</span>
                                                        <span className="font-medium text-gray-900">
                                                            {reservation.lastPayment.amount} ฿
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-600">สถานะ</span>
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAY_STATUS_COLOR[reservation.lastPayment.status]
                                                                }`}
                                                        >
                                                            {PAY_STATUS_TEXT[reservation.lastPayment.status]}
                                                        </span>
                                                    </div>
                                                    {reservation.lastPayment.paidAt && (
                                                        <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t">
                                                            <span>ชำระเมื่อ</span>
                                                            <span>{formatThaiTime(reservation.lastPayment.paidAt)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
{canPay ? (
  <button
    onClick={() => router.push(`/selectpayment?reservationId=${reservation.id}`)}
    className="w-full py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white transition"
  >
    💸 จ่ายเงิน
  </button>
) : (
  <button
    disabled
    className={`w-full py-3 rounded-xl font-semibold cursor-not-allowed ${
      isPaid
        ? "bg-green-100 text-green-500"
        : "bg-gray-100 text-gray-400"
    }`}
  >
    {isPaid ? "✅ ชำระเงินแล้ว" : "ไม่สามารถชำระเงินในสถานะนี้"}
  </button>
)}


                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // Empty
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">ยังไม่มีการจอง</h3>
                        <p className="text-gray-500 text-sm mb-6">เริ่มต้นจองโต๊ะเพื่อเล่นเกมของคุณ</p>
                        <button
                            onClick={() => router.push("/pool")}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm"
                        >
                            เริ่มจองเลย
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
