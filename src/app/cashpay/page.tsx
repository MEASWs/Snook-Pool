"use client";
export const dynamic = "force-dynamic"; // ป้องกัน Next พยายาม prerender

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// -------- types --------
type Reservation = {
    id: string;
    duration: number;
    table?: { number: number; type: string; hourlyRate: number };
    amount?: number;
    startTime?: string;
    endTime?: string;
};

type PaymentStatus = "PENDING" | "PAID" | "CANCELLED" | string;

type CashPayment = {
    id: string;
    status: PaymentStatus;
    amount: number;
    method: string;
    createdAt?: string;
    paidAt: string | null;
    reservation: {
        id: string;
        startTime: string | null;
        endTime: string | null;
        table: {
            number: number;
            type: string;
        } | null;
    };
};

// -------- helpers --------
function formatThaiDateTime(iso?: string | null) {
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
}

function formatTHB(n: number) {
    try {
        return new Intl.NumberFormat("th-TH", {
            style: "currency",
            currency: "THB",
        }).format(n);
    } catch {
        return `${n} ฿`;
    }
}

function copyText(txt: string) {
    if (!txt) return;
    navigator.clipboard?.writeText(txt).catch(() => {});
}

// -------- Main Content --------
function CashPayContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const reservationId = searchParams.get("reservationId") || "";
    const API =
        (process.env.NEXT_PUBLIC_API_DOMAIN as string) ||
        "http://localhost:3001";

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [payment, setPayment] = useState<CashPayment | null>(null);
    const [billError, setBillError] = useState("");

    // โหลดข้อมูลการจอง
    useEffect(() => {
        let cancel = false;

        async function loadReservation() {
            if (!reservationId) {
                setError("ไม่พบ reservationId");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");

            try {
                const token = localStorage.getItem("token") || "";
                const res = await fetch(
                    `${API}/api/v1/reservation/authorized/reservations/${reservationId}`,
                    {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                    }
                );

                const data = await res.json().catch(() => null);

                if (!res.ok) {
                    if (!cancel) {
                        setError(
                            data?.message ||
                                `โหลดข้อมูลการจองไม่สำเร็จ (HTTP ${res.status})`
                        );
                    }
                } else {
                    if (!cancel) {
                        setReservation(data?.data || null);
                    }
                }
            } catch (e: any) {
                if (!cancel) {
                    setError(e?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
                }
            } finally {
                if (!cancel) setLoading(false);
            }
        }

        loadReservation();
        return () => {
            cancel = true;
        };
    }, [API, reservationId]);

    // คำนวณยอดรวม
    const total = useMemo(() => {
        if (!reservation) return 0;
        if (typeof reservation.amount === "number") return reservation.amount;
        const rate = reservation.table?.hourlyRate ?? 0;
        const hrs = reservation.duration ?? 1;
        return rate * hrs;
    }, [reservation]);

    // ยิง POST เพื่อสร้างบิลเงินสด
    useEffect(() => {
        let cancel = false;

        async function createCashBill() {
            if (!reservationId) return;
            if (!reservation) return;
            if (payment) return;

            setBillError("");

            try {
                const token = localStorage.getItem("token") || "";
                const res = await fetch(`${API}/api/v1/payment/authorized/payments`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        reservationId,
                        method: "CASH",
                    }),
                });

                const raw = await res.text();
                let data: any = null;
                try {
                    data = JSON.parse(raw);
                } catch {
                    data = null;
                }

                if (!res.ok) {
                    if (res.status === 409) {
                        if (!cancel) {
                            setBillError(
                                "บิลเงินสดสำหรับการจองนี้มีอยู่แล้ว โปรดแจ้งพนักงานหน้าร้าน"
                            );
                        }
                    } else {
                        if (!cancel) {
                            setBillError(
                                data?.message ||
                                    `สร้างบิลเงินสดไม่สำเร็จ (HTTP ${res.status})`
                            );
                        }
                    }
                    return;
                }

                const p = data?.data;
                if (!cancel && p) {
                    const nowIso = new Date().toISOString();
                    setPayment({
                        id: p.id,
                        status: p.status,
                        amount: p.amount,
                        method: p.method,
                        paidAt: p.paidAt ?? null,
                        createdAt: nowIso,
                        reservation: {
                            id: p.reservation?.id ?? reservationId,
                            startTime: p.reservation?.startTime ?? null,
                            endTime: p.reservation?.endTime ?? null,
                            table: p.reservation?.table
                                ? {
                                      number: p.reservation.table.number,
                                      type: p.reservation.table.type,
                                  }
                                : reservation?.table
                                ? {
                                      number: reservation.table.number,
                                      type: reservation.table.type,
                                  }
                                : null,
                        },
                    });
                }
            } catch (e: any) {
                if (!cancel) {
                    setBillError(e?.message || "เกิดข้อผิดพลาดในการสร้างบิลเงินสด");
                }
            }
        }

        createCashBill();
        return () => {
            cancel = true;
        };
    }, [API, reservationId, reservation, payment]);

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm p-6">
                {/* กลับ / คัดลอก */}
                <header className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-gray-900 flex items-center gap-2 hover:translate-x-[-6px] transition-all text-sm font-medium"
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
                        กลับ
                    </button>

                    <button
                        onClick={() => copyText(reservationId)}
                        className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs sm:text-sm font-medium"
                    >
                        คัดลอกหมายเลขจอง
                    </button>
                </header>

                {/* Title */}
                <section className="mb-4">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                        ชำระเงินสดที่หน้าร้าน
                    </h1>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        ระบบได้สร้างบิลการชำระเงินสดให้แล้ว{" "}
                        <span className="font-semibold text-yellow-600">
                            (รอชำระ)
                        </span>
                        <br />
                        โปรดแจ้งพนักงานด้วยหมายเลขการจองนี้:
                        <br />
                        <span className="font-semibold text-gray-800 break-all">
                            {reservationId || "-"}
                        </span>
                        <br />
                        พนักงานจะยืนยัน “รับเงินสด” ให้คุณในระบบ
                    </p>
                </section>

                {/* Errors */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">
                        {error}
                    </div>
                )}
                {billError && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-yellow-700 text-sm mb-4">
                        {billError}
                    </div>
                )}

                {/* Bill / booking summary */}
                <section className="bg-blue-50 rounded-xl p-4 mb-6 text-sm">
                    <Row
                        label="โต๊ะ"
                        value={
                            reservation?.table
                                ? `โต๊ะที่ ${reservation.table.number} (${reservation.table.type})`
                                : payment?.reservation.table
                                ? `โต๊ะที่ ${payment.reservation.table.number} (${payment.reservation.table.type})`
                                : "-"
                        }
                    />
                    <Row
                        label="เวลาจองเริ่ม"
                        value={formatThaiDateTime(
                            reservation?.startTime ??
                                payment?.reservation.startTime
                        )}
                    />
                    <Row
                        label="เวลาจองจบ"
                        value={formatThaiDateTime(
                            reservation?.endTime ?? payment?.reservation.endTime
                        )}
                    />
                    <Row label="วิธีชำระ" value="เงินสด" />
                    <Row label="ยอดที่ต้องชำระ" value={formatTHB(total)} highlight />

                    <div className="border-t border-blue-200 mt-3 pt-3 space-y-1 text-xs text-gray-600">
                        <RowInline
                            label="สถานะบิล"
                            value={
                                payment?.status === "PAID"
                                    ? "ชำระแล้ว"
                                    : payment?.status === "CANCELLED"
                                    ? "ยกเลิก"
                                    : "รอชำระ"
                            }
                            valueClass={
                                payment?.status === "PAID"
                                    ? "text-green-600 font-semibold"
                                    : payment?.status === "CANCELLED"
                                    ? "text-gray-500 font-semibold"
                                    : "text-yellow-700 font-semibold"
                            }
                        />
                        <RowInline
                            label="ออกบิลเมื่อ"
                            value={
                                payment?.createdAt
                                    ? formatThaiDateTime(payment.createdAt)
                                    : "-"
                            }
                        />
                    </div>
                </section>

                {/* CTA */}
                <section>
                    <button
                        onClick={() => router.push("/reservationlist")}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-center transition"
                    >
                        กลับไปหน้าการจองของฉัน
                    </button>

                    <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
                        หลังจากพนักงานยืนยันการรับเงินสด
                        สถานะบิลจะเปลี่ยนเป็น{" "}
                        <span className="text-green-600 font-semibold">
                            ชำระแล้ว
                        </span>{" "}
                        และคุณจะสามารถดูหลักฐานได้ในหน้า “รายการจองของฉัน”
                    </p>
                </section>
            </div>
        </main>
    );
}

// -------- helpers UI components --------
function Row({
    label,
    value,
    highlight,
}: {
    label: string;
    value: string | number;
    highlight?: boolean;
}) {
    return (
        <div className="flex justify-between mt-1 first:mt-0">
            <span className="text-gray-700">{label}</span>
            <span
                className={`text-right font-medium ${
                    highlight ? "text-blue-600 font-semibold" : "text-gray-900"
                }`}
            >
                {value}
            </span>
        </div>
    );
}

function RowInline({
    label,
    value,
    valueClass,
}: {
    label: string;
    value: string;
    valueClass?: string;
}) {
    return (
        <div className="flex justify-between">
            <span className="text-gray-600">{label}</span>
            <span className={`text-right ${valueClass || "text-gray-800"}`}>
                {value}
            </span>
        </div>
    );
}

// -------- Export Page (with Suspense) --------
export default function CashPayPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
            <CashPayContent />
        </Suspense>
    );
}
