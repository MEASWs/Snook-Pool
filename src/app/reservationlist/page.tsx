"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ---------- ENV BASE ----------
const API = process.env.NEXT_PUBLIC_API_DOMAIN as string;

// ---------- Types ----------
type TableType = "SNOOKER" | "POOL";
type ReservationStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
type PaymentMethod =
    | "CASH"
    | "WALLET_BALANCE"
    | "BANK_TRANSFER"
    | "QR_PAYMENT";
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
    const fixed = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return fixed;
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

// อ่านสถานะการจ่ายเงินสดที่ user เคยเลือกเก็บไว้ localStorage
function getCashInfoForReservation(reservationId: string) {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(`cashpay:${reservationId}`);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (
            parsed &&
            parsed.method === "CASH" &&
            parsed.status === "PENDING" &&
            typeof parsed.amount === "number"
        ) {
            return parsed as {
                method: "CASH";
                status: "PENDING";
                amount: number;
            };
        }
    } catch {
        // ignore parse error
    }
    return null;
}

// ---------- Component ----------
export default function MyReservationsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const focusId = searchParams.get("focus");

    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    // สำหรับปุ่ม "ยกเลิกการจอง"
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [cancelError, setCancelError] = useState<string | null>(null);

    // โหลดรายการจอง (authorized)
    useEffect(() => {
        (async () => {
            try {
                const token = localStorage.getItem("token") || "";
                const res = await fetch(
                    `${API}/api/v1/reservation/authorized/reservations`,
                    {
                        headers: token
                            ? { Authorization: `Bearer ${token}` }
                            : {},
                    }
                );

                const json = await res.json();

                if (!res.ok)
                    throw new Error(json?.message || "Failed to fetch");

                const list: Reservation[] = Array.isArray(json?.data)
                    ? json.data
                    : [];

                // เคลียร์ cashpay: ถ้า backend บอกว่าจ่ายแล้ว
                list.forEach((r) => {
                    if (r.lastPayment?.status === "PAID") {
                        localStorage.removeItem(`cashpay:${r.id}`);
                    }
                });

                // sort ให้รายการล่าสุดขึ้นก่อน
                list.sort((a, b) => {
                    const ta = a.startTime
                        ? new Date(a.startTime).getTime()
                        : 0;
                    const tb = b.startTime
                        ? new Date(b.startTime).getTime()
                        : 0;
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

    // auto-scroll ไปการจองที่ focus=...
    useEffect(() => {
        if (!focusId) return;
        const t = setTimeout(() => {
            const el = document.getElementById(`res-${focusId}`);
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
        return () => clearTimeout(t);
    }, [focusId, reservations.length]);

    // ยกเลิกการจอง
    async function handleCancelReservation(id: string) {
        setCancelError(null);
        setCancellingId(id);

        try {
            const token = localStorage.getItem("token") || "";
            if (!token) {
                throw new Error("กรุณาเข้าสู่ระบบก่อนยกเลิก");
            }

            const res = await fetch(
                `${API}/api/v1/reservation/authorized/reservations/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(
                    json?.message ||
                        "ยกเลิกไม่สำเร็จ กรุณาติดต่อพนักงาน"
                );
            }

            const serverData = json?.data;

            // อัปเดต state ฝั่ง client ให้ status = CANCELLED
            setReservations((prev) =>
                prev.map((r) => {
                    if (r.id !== id) return r;

                    const newStatus: ReservationStatus =
                        serverData?.status ?? "CANCELLED";

                    return {
                        ...r,
                        status: newStatus,
                        startTime:
                            serverData?.startTime ?? r.startTime ?? null,
                        endTime: serverData?.endTime ?? r.endTime ?? null,
                        lastPayment: r.lastPayment
                            ? {
                                  ...r.lastPayment,
                                  status:
                                      r.lastPayment.status === "PAID"
                                          ? "PAID"
                                          : "CANCELLED",
                              }
                            : r.lastPayment,
                    };
                })
            );

            // ลบสถานะ cash ที่เคยเลือกใน localStorage
            localStorage.removeItem(`cashpay:${id}`);
        } catch (err: any) {
            setCancelError(
                err?.message || "เกิดข้อผิดพลาดระหว่างการยกเลิก"
            );
        } finally {
            setCancellingId(null);
        }
    }

    // ---------- UI States ----------
    if (loading) {
        return (
            <main className="flex justify-center items-center min-h-screen bg-gray-50">
                <div
                    className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
                    aria-label="กำลังโหลดข้อมูล"
                />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 py-8 px-4">
            <section className="max-w-7xl mx-auto mb-8">
                {/* Header / Back */}
                <header className="mb-6 text-center">
                    <nav className="text-left mb-6">
                        <button
                            onClick={() => router.push("/")}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:-translate-x-2 transition"
                            aria-label="กลับไปหน้าแรก"
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
                            <span className="font-medium">
                                กลับไปหน้าแรก
                            </span>
                        </button>
                    </nav>

                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg
                                className="w-8 h-8 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
                                />
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        รายการจองของฉัน
                    </h1>
                    <p className="text-gray-500 text-sm">
                        ดูและจัดการการจองทั้งหมดของคุณ
                    </p>
                </header>

                {/* Global errors */}
                {(error || cancelError) && (
                    <section
                        className="max-w-2xl mx-auto mb-6"
                        role="alert"
                    >
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                            {error || cancelError}
                        </div>
                    </section>
                )}

                {/* Stats summary */}
                {reservations.length > 0 && (
                    <section
                        aria-label="สรุปสถานะการจอง"
                        className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto"
                    >
                        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                            <div className="text-2xl font-bold text-gray-900">
                                {reservations.length}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                การจองทั้งหมด
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {
                                    reservations.filter(
                                        (r) =>
                                            r.status === "CONFIRMED"
                                    ).length
                                }
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                ยืนยันแล้ว
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {
                                    reservations.filter(
                                        (r) =>
                                            r.status === "COMPLETED"
                                    ).length
                                }
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                เสร็จสิ้น
                            </div>
                        </div>
                    </section>
                )}

                {/* Reservation list OR empty state */}
                {reservations.length > 0 ? (
                    <section
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                        aria-label="รายการการจองทั้งหมด"
                    >
                        {reservations.map((reservation) => {
                            const cashInfo = getCashInfoForReservation(
                                reservation.id
                            );

                            // payment ล่าสุดจาก backend
                            const backendPayment = reservation.lastPayment
                                ? {
                                      method:
                                          reservation.lastPayment.method,
                                      status:
                                          reservation.lastPayment.status,
                                      amount:
                                          reservation.lastPayment.amount,
                                      paidAt:
                                          reservation.lastPayment.paidAt,
                                  }
                                : null;

                            const hasPaid =
                                backendPayment?.status === "PAID";

                            const canPay =
                                !hasPaid &&
                                reservation.status !== "CANCELLED" &&
                                (reservation.status === "PENDING" ||
                                    reservation.status ===
                                        "CONFIRMED");

                            const canCancel =
                                !hasPaid &&
                                reservation.status !== "CANCELLED" &&
                                reservation.status !== "COMPLETED";

                            const total =
                                typeof reservation.totalPrice ===
                                "number"
                                    ? reservation.totalPrice
                                    : (reservation.table?.hourlyRate ??
                                          0) *
                                      (reservation.duration ?? 0);

                            // what to show as "payment box"
                            const effectivePayment = hasPaid
                                ? backendPayment
                                : cashInfo
                                ? {
                                      method: "CASH" as PaymentMethod,
                                      status:
                                          "PENDING" as PaymentStatus,
                                      amount:
                                          typeof cashInfo.amount ===
                                          "number"
                                              ? cashInfo.amount
                                              : total,
                                      paidAt: null,
                                  }
                                : backendPayment ?? null;

                            const badgeText = hasPaid
                                ? STATUS_TEXT[reservation.status]
                                : cashInfo
                                ? "รอดำเนินการ"
                                : STATUS_TEXT[reservation.status];

                            const badgeColor = hasPaid
                                ? STATUS_COLOR[reservation.status]
                                : cashInfo
                                ? "bg-yellow-100 text-yellow-700"
                                : STATUS_COLOR[reservation.status];

                            const headerBg = hasPaid
                                ? reservation.status ===
                                  "CONFIRMED"
                                    ? "bg-blue-50"
                                    : reservation.status ===
                                      "COMPLETED"
                                    ? "bg-green-50"
                                    : reservation.status ===
                                      "CANCELLED"
                                    ? "bg-red-50"
                                    : "bg-yellow-50"
                                : cashInfo
                                ? "bg-yellow-50"
                                : reservation.status ===
                                  "CONFIRMED"
                                ? "bg-blue-50"
                                : reservation.status ===
                                  "COMPLETED"
                                ? "bg-green-50"
                                : reservation.status ===
                                  "CANCELLED"
                                ? "bg-red-50"
                                : "bg-yellow-50";

                            return (
                                <article
                                    id={`res-${reservation.id}`}
                                    key={reservation.id}
                                    className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden ${
                                        focusId === reservation.id
                                            ? "ring-2 ring-blue-400"
                                            : ""
                                    }`}
                                    aria-label={`การจองโต๊ะหมายเลข ${reservation.table?.number ?? "-"
                                        }`}
                                >
                                    {/* Card Header */}
                                    <header
                                        className={`px-6 py-4 ${headerBg}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">
                                                    {getTableTypeIcon(
                                                        reservation
                                                            .table?.type
                                                    )}
                                                </span>
                                                <div>
                                                    <h2 className="text-xl font-bold text-gray-900">
                                                        โต๊ะที่{" "}
                                                        {reservation
                                                            .table
                                                            ?.number ??
                                                            "-"}
                                                    </h2>
                                                    <p className="text-sm text-gray-600">
                                                        {reservation
                                                            .table
                                                            ?.type}{" "}
                                                        •{" "}
                                                        {
                                                            reservation
                                                                .table
                                                                ?.hourlyRate
                                                        }{" "}
                                                        ฿/ช.ม.
                                                    </p>
                                                </div>
                                            </div>

                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColor}`}
                                            >
                                                {badgeText}
                                            </span>
                                        </div>
                                    </header>

                                    {/* Card Body */}
                                    <div className="px-6 py-5">
                                        <section className="space-y-3 mb-4 text-sm text-gray-700">
                                            <div>
                                                <div className="font-medium mb-1">
                                                    เวลาจอง
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {reservation.startTime
                                                        ? formatThaiTime(
                                                              reservation.startTime
                                                          )
                                                        : "-"}
                                                </div>
                                                {reservation.endTime && (
                                                    <div className="text-xs text-gray-600 mt-1">
                                                        ถึง{" "}
                                                        {formatThaiTime(
                                                            reservation.endTime
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {reservation.duration && (
                                                <div>
                                                    ระยะเวลา:{" "}
                                                    <span className="font-medium">
                                                        {
                                                            reservation.duration
                                                        }{" "}
                                                        ชั่วโมง
                                                    </span>
                                                </div>
                                            )}

                                            <div>
                                                ราคารวม:{" "}
                                                <span className="font-bold text-blue-600">
                                                    {total} ฿
                                                </span>
                                            </div>
                                        </section>

                                        {/* Payment Info */}
                                        {effectivePayment && (
                                            <section className="bg-gray-50 rounded-xl p-4 mb-4">
                                                <div className="text-xs font-semibold text-gray-700 mb-2">
                                                    ข้อมูลการชำระเงิน
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">
                                                            วิธีชำระ
                                                        </span>
                                                        <span className="font-medium text-gray-900">
                                                            {METHOD_TEXT[
                                                                effectivePayment
                                                                    .method as PaymentMethod
                                                            ] ??
                                                                effectivePayment.method}
                                                        </span>
                                                    </div>

                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">
                                                            จำนวนเงิน
                                                        </span>
                                                        <span className="font-medium text-gray-900">
                                                            {
                                                                effectivePayment.amount
                                                            }{" "}
                                                            ฿
                                                        </span>
                                                    </div>

                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-600">
                                                            สถานะ
                                                        </span>
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                effectivePayment.status ===
                                                                "PAID"
                                                                    ? "bg-green-100 text-green-700"
                                                                    : effectivePayment.status ===
                                                                      "CANCELLED"
                                                                    ? "bg-red-100 text-red-700"
                                                                    : "bg-orange-100 text-orange-700"
                                                            }`}
                                                        >
                                                            {effectivePayment.status ===
                                                            "PENDING"
                                                                ? "รอชำระ"
                                                                : effectivePayment.status ===
                                                                  "PAID"
                                                                ? "ชำระแล้ว"
                                                                : effectivePayment.status ===
                                                                  "CANCELLED"
                                                                ? "ยกเลิก"
                                                                : effectivePayment.status}
                                                        </span>
                                                    </div>

                                                    {effectivePayment.paidAt && (
                                                        <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t">
                                                            <span>
                                                                ชำระเมื่อ
                                                            </span>
                                                            <span>
                                                                {formatThaiTime(
                                                                    effectivePayment.paidAt
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </section>
                                        )}

                                        {/* Actions */}
                                        <footer className="space-y-2">
                                            {/* ปุ่มไปจ่าย */}
                                            {canPay ? (
                                                // ถ้าเคยเลือก "จ่ายสดแต่ยังไม่จ่ายจริง"
                                                cashInfo &&
                                                cashInfo.status ===
                                                    "PENDING" ? (
                                                    <button
                                                        onClick={() =>
                                                            router.push(
                                                                `/cashpay?reservationId=${reservation.id}`
                                                            )
                                                        }
                                                        className="w-full py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-2"
                                                    >
                                                        💸
                                                        <span>
                                                            ไปหน้าชำระเงินสด
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() =>
                                                            router.push(
                                                                `/selectpayment?reservationId=${reservation.id}`
                                                            )
                                                        }
                                                        className="w-full py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-2"
                                                    >
                                                        💸
                                                        <span>
                                                            จ่ายเงิน
                                                        </span>
                                                    </button>
                                                )
                                            ) : (
                                                <button
                                                    disabled
                                                    className={`w-full py-3 rounded-xl font-semibold cursor-not-allowed ${
                                                        hasPaid
                                                            ? "bg-green-100 text-green-500"
                                                            : "bg-gray-100 text-gray-400"
                                                    }`}
                                                >
                                                    {hasPaid
                                                        ? "✅ ชำระเงินแล้ว"
                                                        : "ไม่สามารถชำระเงินในสถานะนี้"}
                                                </button>
                                            )}

                                            {/* ปุ่มยกเลิกการจอง */}
                                            {canCancel ? (
                                                <button
                                                    onClick={() =>
                                                        handleCancelReservation(
                                                            reservation.id
                                                        )
                                                    }
                                                    disabled={
                                                        cancellingId ===
                                                        reservation.id
                                                    }
                                                    className={`w-full py-3 rounded-xl font-semibold border transition flex items-center justify-center gap-2 ${
                                                        cancellingId ===
                                                        reservation.id
                                                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-wait"
                                                            : "bg-white text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                                                    }`}
                                                >
                                                    {cancellingId ===
                                                    reservation.id
                                                        ? "กำลังยกเลิก..."
                                                        : "ยกเลิกการจอง"}
                                                </button>
                                            ) : (
                                                <button
                                                    disabled
                                                    className="w-full py-3 rounded-xl font-semibold bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-200"
                                                >
                                                    {reservation.status ===
                                                    "CANCELLED"
                                                        ? "ถูกยกเลิกแล้ว"
                                                        : reservation.status ===
                                                          "COMPLETED"
                                                        ? "จบการเล่นแล้ว"
                                                        : hasPaid
                                                        ? "ยกเลิกไม่ได้ (จ่ายแล้ว)"
                                                        : "ไม่สามารถยกเลิกได้"}
                                                </button>
                                            )}
                                        </footer>
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                ) : (
                    <section
                        className="text-center py-12"
                        aria-label="ยังไม่มีการจอง"
                    >
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
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
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm"
                        >
                            เริ่มจองเลย
                        </button>
                    </section>
                )}
            </section>
        </main>
    );
}
