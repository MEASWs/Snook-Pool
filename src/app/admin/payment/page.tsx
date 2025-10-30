"use client";

import { useEffect, useState } from "react";

// ---------- Types ----------
type PaymentStatus = "PENDING" | "PAID" | "CANCELLED" | string;
type PaymentMethod =
    | "CASH"
    | "WALLET_BALANCE"
    | "BANK_TRANSFER"
    | "QR_PAYMENT"
    | string;

type PaymentItem = {
    id: string;
    status: PaymentStatus;
    amount: number;
    method: PaymentMethod;
    createdAt: string;
    paidAt: string | null;
    user: { id: string; name: string } | null;
    confirmedBy: { id: string; name: string } | null;
    reservation: {
        id: string;
        startTime: string | null;
        endTime: string | null;
        table: { number: number; type: string } | null;
    } | null;
};

// ---------- Helpers ----------
function fmtTHB(n: number) {
    try {
        return new Intl.NumberFormat("th-TH", {
            style: "currency",
            currency: "THB",
        }).format(n);
    } catch {
        return `${n} ฿`;
    }
}

function fmtDateTime(iso?: string | null) {
    if (!iso) return "-";
    return new Intl.DateTimeFormat("th-TH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
    }).format(new Date(iso));
}

function methodLabel(m?: PaymentMethod) {
    const labels = {
        CASH: { text: "เงินสด", emoji: "💵" },
        WALLET_BALANCE: { text: "กระเป๋าเงิน", emoji: "👛" },
        BANK_TRANSFER: { text: "โอนเงิน", emoji: "🏦" },
        QR_PAYMENT: { text: "QR Code", emoji: "📱" },
    };
    return labels[m as keyof typeof labels] || { text: m || "-", emoji: "💳" };
}

function statusView(status: PaymentStatus) {
    if (status === "PAID")
        return {
            text: "ชำระแล้ว",
            emoji: "✅",
            className: "bg-green-100 text-green-800 border-green-300",
        };
    if (status === "PENDING")
        return {
            text: "รอชำระ",
            emoji: "⏳",
            className: "bg-yellow-100 text-yellow-800 border-yellow-300",
        };
    if (status === "CANCELLED")
        return {
            text: "ยกเลิก",
            emoji: "❌",
            className: "bg-gray-100 text-gray-600 border-gray-300",
        };
    return {
        text: status || "ไม่ทราบสถานะ",
        emoji: "❓",
        className: "bg-gray-100 text-gray-600 border-gray-300",
    };
}

// ========================
//   AdminPaymentsPage
// ========================
export default function AdminPaymentsPage() {
    const [list, setList] = useState<PaymentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errMsg, setErrMsg] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("ALL");

    const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

    const handleNavigation = (path: string) => {
        window.location.href = path;
    };

    // โหลดบิลทั้งหมด
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setErrMsg("");

            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    setErrMsg("Unauthorized: no admin token");
                    setLoading(false);
                    return;
                }

                const res = await fetch(
                    `${API}/api/v1/adminPayment/authorized/payments`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    setErrMsg(
                        data?.message ||
                        `โหลดข้อมูลไม่สำเร็จ (${res.status})`
                    );
                    setLoading(false);
                    return;
                }

                const arr: PaymentItem[] = Array.isArray(data?.data)
                    ? data.data
                    : [];

                // sort: PENDING ก่อน, แล้วค่อยตามเวลาล่าสุด
                arr.sort((a, b) => {
                    if (a.status === "PENDING" && b.status !== "PENDING")
                        return -1;
                    if (b.status === "PENDING" && a.status !== "PENDING")
                        return 1;
                    return (
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    );
                });

                setList(arr);
            } catch (e: any) {
                setErrMsg(e?.message || "โหลดข้อมูลไม่สำเร็จ");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [API]);

    // กดยืนยันรับเงิน
    async function confirmPayment(paymentId: string) {
        setBusyId(paymentId);

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("❌ Unauthorized: no admin token");
                setBusyId(null);
                return;
            }

            const res = await fetch(
                `${API}/api/v1/adminPayment/authorized/payments/${paymentId}/confirm`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({}),
                }
            );

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                alert(
                    data?.message ||
                        `ยืนยันการชำระเงินไม่สำเร็จ (${res.status})`
                );
                setBusyId(null);
                return;
            }

            const updated = data?.data;

            // sync state ตาม backend
            setList((prev) =>
                prev.map((p) =>
                    p.id === paymentId
                        ? {
                              ...p,
                              status: updated?.status ?? "PAID",
                              paidAt:
                                  updated?.paidAt ??
                                  p.paidAt ??
                                  new Date().toISOString(),
                              amount:
                                  typeof updated?.amount === "number"
                                      ? updated.amount
                                      : p.amount,
                              method: updated?.method ?? p.method,
                              confirmedBy: updated?.confirmedBy
                                  ? {
                                        id: updated.confirmedBy.id,
                                        name: updated.confirmedBy.name,
                                    }
                                  : p.confirmedBy,
                          }
                        : p
                )
            );

            alert("✅ ยืนยันรับเงินเรียบร้อย");
        } catch (e: any) {
            alert(
                e?.message || "เกิดข้อผิดพลาดในการยืนยันการชำระเงิน"
            );
        } finally {
            setBusyId(null);
        }
    }

    const filteredList =
        filterStatus === "ALL"
            ? list
            : list.filter((item) => item.status === filterStatus);

    const stats = {
        total: list.length,
        pending: list.filter((p) => p.status === "PENDING").length,
        paid: list.filter((p) => p.status === "PAID").length,
        cancelled: list.filter((p) => p.status === "CANCELLED").length,
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">
                        กำลังโหลดข้อมูล...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Back Button */}
                <div className="mb-6">
                    <button
                        onClick={() => handleNavigation("/admin/home")}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:translate-x-[-10px] transition-all duration-200"
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
                            กลับไปหน้า Admin
                        </span>
                    </button>
                </div>

                {/* Page Header */}
                <header className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-3xl sm:text-4xl">💰</span>
                        </div>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                        ยืนยันการชำระเงิน
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base">
                        ตรวจสอบและยืนยันการชำระเงินของลูกค้า
                    </p>
                </header>

                {/* Error Message */}
                {errMsg && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
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
                                {errMsg}
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats Overview */}
                <section
                    aria-labelledby="stats-heading"
                    className="mb-6"
                >
                    <h2
                        id="stats-heading"
                        className="sr-only"
                    >
                        สถิติการชำระเงิน
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatBox
                            bg="bg-white"
                            border="border-transparent"
                            title="ทั้งหมด"
                            value={stats.total}
                            titleCls="text-gray-600"
                            valueCls="text-gray-900"
                        />
                        <StatBox
                            bg="bg-yellow-50"
                            border="border-yellow-200"
                            title="⏳ รอชำระ"
                            value={stats.pending}
                            titleCls="text-yellow-700"
                            valueCls="text-yellow-800"
                        />
                        <StatBox
                            bg="bg-green-50"
                            border="border-green-200"
                            title="✅ ชำระแล้ว"
                            value={stats.paid}
                            titleCls="text-green-700"
                            valueCls="text-green-800"
                        />
                        <StatBox
                            bg="bg-gray-50"
                            border="border-gray-200"
                            title="❌ ยกเลิก"
                            value={stats.cancelled}
                            titleCls="text-gray-600"
                            valueCls="text-gray-700"
                        />
                    </div>
                </section>

                {/* Filter Buttons */}
                <section
                    aria-label="Filter payments"
                    className="mb-6"
                >
                    <div className="flex flex-wrap gap-2">
                        {["ALL", "PENDING", "PAID", "CANCELLED"].map(
                            (status) => (
                                <button
                                    key={status}
                                    onClick={() =>
                                        setFilterStatus(status)
                                    }
                                    className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                                        filterStatus === status
                                            ? "bg-blue-600 text-white shadow-md"
                                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                                    }`}
                                >
                                    {status === "ALL"
                                        ? "ทั้งหมด"
                                        : status === "PENDING"
                                        ? "⏳ รอชำระ"
                                        : status === "PAID"
                                        ? "✅ ชำระแล้ว"
                                        : "❌ ยกเลิก"}
                                </button>
                            )
                        )}
                    </div>
                </section>

                {/* Payments Grid */}
                <section aria-labelledby="payments-heading">
                    <h2
                        id="payments-heading"
                        className="sr-only"
                    >
                        รายการชำระเงิน
                    </h2>

                    {filteredList.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">📭</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                ไม่มีรายการ
                            </h3>
                            <p className="text-gray-500 text-sm">
                                ไม่พบรายการชำระเงินในขณะนี้
                            </p>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredList.map((bill) => {
                                const badge = statusView(bill.status);
                                const method = methodLabel(
                                    bill.method
                                );
                                const canConfirm =
                                    bill.status === "PENDING";

                                return (
                                    <article
                                        key={bill.id}
                                        className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow"
                                    >
                                        {/* Header */}
                                        <header className="flex justify-between items-start mb-4 pb-3 border-b border-gray-100">
                                            <div className="flex-1 min-w-0 mr-2">
                                                <p
                                                    className="text-xs font-mono text-gray-500 truncate"
                                                    title={bill.id}
                                                >
                                                    {bill.id}
                                                </p>
                                            </div>

                                            <span
                                                className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border ${badge.className}`}
                                            >
                                                <span>
                                                    {badge.emoji}
                                                </span>
                                                <span>
                                                    {badge.text}
                                                </span>
                                            </span>
                                        </header>

                                        {/* Amount & Method */}
                                        <div className="mb-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-gray-600">
                                                    ยอดชำระ
                                                </span>
                                                <span className="text-2xl font-bold text-gray-900">
                                                    {fmtTHB(
                                                        bill.amount
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">
                                                    วิธิชำระ
                                                </span>
                                                <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                                    <span>
                                                        {
                                                            method.emoji
                                                        }
                                                    </span>
                                                    <span>
                                                        {
                                                            method.text
                                                        }
                                                    </span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Timestamps */}
                                        <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                                            <div className="flex justify-between text-gray-600">
                                                <span>
                                                    🕐 สร้างเมื่อ
                                                </span>
                                                <span className="font-medium">
                                                    {fmtDateTime(
                                                        bill.createdAt
                                                    )}
                                                </span>
                                            </div>

                                            {bill.paidAt && (
                                                <div className="flex justify-between text-green-700">
                                                    <span>
                                                        ✅
                                                        ชำระเมื่อ
                                                    </span>
                                                    <span className="font-medium">
                                                        {fmtDateTime(
                                                            bill.paidAt
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Reservation Info */}
                                        <div className="bg-blue-50 rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-700">
                                                    🎱 โต๊ะ
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    {bill.reservation
                                                        ?.table
                                                        ? `#${bill.reservation.table.number} (${bill.reservation.table.type})`
                                                        : "-"}
                                                </span>
                                            </div>

                                            <div className="flex justify-between">
                                                <span className="text-gray-700">
                                                    👤 ลูกค้า
                                                </span>
                                                <span className="font-medium text-gray-900">
                                                    {bill.user?.name ??
                                                        "-"}
                                                </span>
                                            </div>

                                            {bill.confirmedBy && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-700">
                                                        ✅
                                                        ยืนยันโดย
                                                    </span>
                                                    <span className="font-medium text-gray-900">
                                                        {
                                                            bill
                                                                .confirmedBy
                                                                .name
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        <footer>
                                            {canConfirm ? (
                                                <button
                                                    onClick={() =>
                                                        confirmPayment(
                                                            bill.id
                                                        )
                                                    }
                                                    disabled={
                                                        busyId ===
                                                        bill.id
                                                    }
                                                    className={`w-full py-3 rounded-xl text-white text-sm font-semibold transition-all ${
                                                        busyId ===
                                                        bill.id
                                                            ? "bg-blue-400 cursor-wait"
                                                            : "bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-[0.99]"
                                                    }`}
                                                >
                                                    {busyId ===
                                                    bill.id ? (
                                                        <span className="flex items-center justify-center gap-2">
                                                            <svg
                                                                className="animate-spin h-4 w-4"
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
                                                            กำลังยืนยัน...
                                                        </span>
                                                    ) : (
                                                        "✅ ยืนยันรับเงิน"
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    disabled
                                                    className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 text-sm font-semibold cursor-not-allowed"
                                                >
                                                    {bill.status ===
                                                    "PAID"
                                                        ? "✅ ชำระแล้ว"
                                                        : "❌ ไม่สามารถยืนยัน"}
                                                </button>
                                            )}
                                        </footer>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

function StatBox({
    bg,
    border,
    title,
    value,
    titleCls,
    valueCls,
}: {
    bg: string;
    border: string;
    title: string;
    value: number;
    titleCls: string;
    valueCls: string;
}) {
    return (
        <div
            className={`${bg} border ${border} rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow`}
        >
            <div
                className={`text-sm mb-1 ${titleCls}`}
            >
                {title}
            </div>
            <div
                className={`text-2xl font-bold ${valueCls}`}
            >
                {value}
            </div>
        </div>
    );
}
