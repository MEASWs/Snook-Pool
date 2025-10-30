"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminRevenueCharts from "../dashbord/AdminRevenueCharts";

type Status = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
type TableType = "POOL" | "SNOOKER";
type Method = "CASH" | "WALLET_BALANCE" | "BANK_TRANSFER" | "QR_PAYMENT";

type ReservationRow = {
    id: string;
    status: Status;
    startTime: string | null;
    endTime: string | null;
    duration: number | null;
    totalPrice: number | null;
    table: {
        id: string;
        number: number;
        type: TableType;
        hourlyRate: number;
        status: "ACTIVE" | "MAINTENANCE";
    } | null;
    user: { id: string | null; name: string; phone: string | null; email: string | null } | null;
    lastPayment: {
        id: string;
        amount: number;
        method: Method;
        status: "PENDING" | "PAID" | "CANCELLED";
        paidAt: string | null;
        referenceCode: string | null;
    } | null;
};

const API = process.env.NEXT_PUBLIC_API_DOMAIN || "http://localhost:3001";

// ---- time helper (no timezone shift) ----
function formatThaiDateTimeNoShift(iso?: string | null) {
    if (!iso) return "-";
    const d = new Date(iso);
    const fixed = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "short",
        timeStyle: "short",
        hour12: false,
        timeZone: "Asia/Bangkok",
    }).format(fixed);
}

export default function AdminHome() {
    const [loading, setLoading] = useState(true);
    const [reservations, setReservations] = useState<ReservationRow[]>([]);
    const [error, setError] = useState("");

    const handleNavigation = (path: string) => {
        window.location.href = path;
    };

    // -------- Load data (admin-only endpoint) --------
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            handleNavigation("/login");
            return;
        }

        (async () => {
            try {
                const res = await fetch(`${API}/api/v1/admin/authorized/reservations`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) {
                    setError("Unauthorized");
                    handleNavigation("/login");
                    return;
                }

                const data = await res.json().catch(() => null);
                setReservations(data?.data ?? []);
            } catch (e) {
                setError("Network error");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // -------- Derive stats --------
    const stats = useMemo(() => {
        const g = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 };
        for (const r of reservations) g[r.status] += 1;
        const snooker = reservations.filter(r => r.table?.type === "SNOOKER").length;
        const pool = reservations.filter(r => r.table?.type === "POOL").length;
        return { ...g, snooker, pool };
    }, [reservations]);

    // ล่าสุด 10 รายการ (ตามเวลาเริ่ม)
    const latest = useMemo(
        () =>
            [...reservations]
                .sort((a, b) => {
                    const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
                    const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
                    return tb - ta;
                })
                .slice(0, 10),
        [reservations]
    );

    const getStatusStyle = (s: Status) => {
        const styles: Record<Status, string> = {
            PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
            CONFIRMED: "bg-blue-100 text-blue-800 border-blue-300",
            COMPLETED: "bg-green-100 text-green-800 border-green-300",
            CANCELLED: "bg-red-100 text-red-800 border-red-300",
        };
        return styles[s] || "bg-gray-100 text-gray-800 border-gray-300";
    };

    const getPaymentMethodLabel = (method: Method) => {
        const labels: Record<Method, string> = {
            CASH: "เงินสด",
            WALLET_BALANCE: "กระเป๋าเงิน",
            BANK_TRANSFER: "โอนเงิน",
            QR_PAYMENT: "QR Code",
        };
        return labels[method] || method;
    };

    // -------- Loading UI --------
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                        <div className="flex justify-between items-center">
                            <div className="h-8 w-40 rounded bg-gray-200 animate-pulse" />
                            <div className="h-10 w-24 rounded-xl bg-gray-200 animate-pulse" />
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                    <div className="grid md:grid-cols-4 gap-4 mb-8">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl shadow-sm p-6">
                                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-3" />
                                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h1
                            className="text-2xl sm:text-3xl font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2"
                            onClick={() => handleNavigation("/admin")}
                        >
                            <span className="text-3xl">⚙️</span>
                            Admin Panel
                        </h1>
                        <nav className="flex flex-wrap gap-2">
                            <button
                                onClick={() => {
                                    localStorage.removeItem("token");
                                    handleNavigation("/login");
                                }}
                                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl font-semibold transition-colors shadow-sm text-sm sm:text-base"
                            >
                                🚪 Logout
                            </button>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
                {/* Charts (Revenue) */}
                <AdminRevenueCharts />

                {/* Status summary boxes */}
                <section aria-labelledby="stats-heading">
                    <h2 id="stats-heading" className="sr-only">สรุปภาพรวม</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon="⏳" label="Pending" value={stats.PENDING} />
                        <StatCard icon="✅" label="Confirmed" value={stats.CONFIRMED} />
                        <StatCard icon="🎉" label="Completed" value={stats.COMPLETED} />
                        <StatCard icon="❌" label="Cancelled" value={stats.CANCELLED} />
                    </div>
                </section>

                {/* Quick Actions */}
                <section aria-labelledby="actions-heading">
                    <h2 id="actions-heading" className="text-xl font-bold text-gray-900 mb-4">🚀 เมนูลัด</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <QuickActionCard
                            icon="👤"
                            title="ยืนยันการชำระเงิน"
                            desc="ดูบิลที่ยังไม่ชำระ/ดูบิลที่ชำระแล้ว"
                            onClick={() => handleNavigation("/admin/payment")}
                        />
                        <QuickActionCard
                            icon="📊"
                            title="จัดการการจอง"
                            desc="ดู/ยืนยัน/เสร็จสิ้น"
                            onClick={() => handleNavigation("/admin/change-status")}
                        />
                        <QuickActionCard
                            icon="🎱"
                            title="จัดการโต๊ะ"
                            desc="เพิ่ม/แก้ไข/เปลี่ยนสถานะโต๊ะ (ACTIVE/MAINTENANCE)"
                            onClick={() => handleNavigation("/admin/tables")}
                        />
                    </div>
                </section>

                {/* Table Type Stats */}
                <section aria-labelledby="table-stats-heading">
                    <h2 id="table-stats-heading" className="text-xl font-bold text-gray-900 mb-4">📈 แยกตามประเภทโต๊ะ</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <TypeStatCard
                            icon="🎱"
                            label="Snooker Reservations"
                            value={stats.snooker}
                            gradient="from-purple-50 to-blue-50"
                            border="border-purple-100"
                        />
                        <TypeStatCard
                            icon="🎯"
                            label="Pool Reservations"
                            value={stats.pool}
                            gradient="from-blue-50 to-cyan-50"
                            border="border-blue-100"
                        />
                    </div>
                </section>

                {/* Latest Reservations */}
                <section aria-labelledby="latest-heading" className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <header className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h2 id="latest-heading" className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <span className="text-2xl">📋</span>
                            รายการล่าสุด (10 รายการ)
                        </h2>
                    </header>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <Th>เวลา</Th>
                                    <Th>โต๊ะ</Th>
                                    <Th>ประเภท</Th>
                                    <Th>ลูกค้า</Th>
                                    <Th>สถานะ</Th>
                                    <Th>การชำระเงิน</Th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200">
                                {latest.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                        <Td>
                                            <div className="space-y-1 text-xs text-gray-600">
                                                <div>🕐 {formatThaiDateTimeNoShift(r.startTime)}</div>
                                                <div>🕐 {formatThaiDateTimeNoShift(r.endTime)}</div>
                                            </div>
                                        </Td>

                                        <Td>
                                            <span className="font-semibold text-gray-900">
                                                #{r.table?.number ?? "-"}
                                            </span>
                                        </Td>

                                        <Td>
                                            <span className="inline-flex items-center gap-1 text-sm">
                                                {r.table?.type === "SNOOKER" ? "🎱" : "🎯"}
                                                <span className="font-medium text-gray-700">
                                                    {r.table?.type ?? "-"}
                                                </span>
                                            </span>
                                        </Td>

                                        <Td>
                                            <span className="text-sm text-gray-900">
                                                {r.user?.name ?? "-"}
                                            </span>
                                        </Td>

                                        <Td>
                                            <span
                                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(
                                                    r.status
                                                )}`}
                                            >
                                                {r.status}
                                            </span>
                                        </Td>

                                        <Td>
                                            {r.lastPayment ? (
                                                <div className="space-y-1 text-xs text-gray-600">
                                                    <div className="font-semibold text-gray-900">
                                                        {r.lastPayment.amount.toLocaleString()} ฿
                                                    </div>
                                                    <div>{getPaymentMethodLabel(r.lastPayment.method)}</div>
                                                    <div
                                                        className={
                                                            r.lastPayment.status === "PAID"
                                                                ? "text-green-600 font-semibold"
                                                                : r.lastPayment.status === "PENDING"
                                                                ? "text-yellow-600"
                                                                : "text-gray-500"
                                                        }
                                                    >
                                                        {r.lastPayment.status}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </Td>
                                    </tr>
                                ))}

                                {latest.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-12 text-center text-gray-500"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-4xl">📭</span>
                                                <p className="text-sm font-medium">
                                                    ไม่มีรายการ
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}

// --- tiny presentational components ---

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{icon}</span>
                <div className="text-sm text-gray-600 font-medium">{label}</div>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-gray-900">{value}</div>
        </div>
    );
}

function QuickActionCard({
    icon,
    title,
    desc,
    onClick,
}: {
    icon: string;
    title: string;
    desc: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="bg-white rounded-2xl shadow-sm p-6 text-left hover:shadow-md hover:scale-[1.02] transition-all"
        >
            <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{icon}</span>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
                    <p className="text-gray-600 text-sm">{desc}</p>
                </div>
            </div>
        </button>
    );
}

function TypeStatCard({
    icon,
    label,
    value,
    gradient,
    border,
}: {
    icon: string;
    label: string;
    value: number;
    gradient: string;
    border: string;
}) {
    return (
        <div
            className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-sm p-6 border ${border}`}
        >
            <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{icon}</span>
                <div className="text-sm text-gray-700 font-medium">{label}</div>
            </div>
            <div className="text-4xl font-bold text-gray-900">{value}</div>
        </div>
    );
}

function Th({ children }: { children: React.ReactNode }) {
    return (
        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
            {children}
        </th>
    );
}

function Td({ children }: { children: React.ReactNode }) {
    return <td className="px-4 py-3 align-top">{children}</td>;
}
