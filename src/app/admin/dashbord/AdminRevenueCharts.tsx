"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
} from "recharts";

import { useEffect, useMemo, useState } from "react";

type ReservationRecord = {
    table?: {
        number: number;
        type: string;
    };
    lastPayment?: {
        amount: number;
    };
};

const API = process.env.NEXT_PUBLIC_API_DOMAIN || "http://localhost:3001";

// ---------- Custom tooltip for THB ----------
function BahtTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md">
            {label && (
                <div className="text-gray-600 font-medium mb-1">{label}</div>
            )}
            {payload.map((entry: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                    <span className="text-gray-500">{entry.name}:</span>
                    <span className="font-semibold text-gray-900">
                        {Number(entry.value).toLocaleString("th-TH")} บาท
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function AdminRevenueCharts() {
    // ---------------- state ----------------
    const [reservations, setReservations] = useState<ReservationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ---------------- fetch once ----------------
    useEffect(() => {
        const token = localStorage.getItem("token"); // admin token

        if (!token) {
            setErrorMsg("Unauthorized: no admin token.");
            setLoading(false);
            return;
        }

        fetch(`${API}/api/v1/admin/authorized/reservations`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json().catch(() => null);
                    throw new Error(
                        body?.message ||
                        `Request failed with status ${res.status}`
                    );
                }
                return res.json();
            })
            .then((json) => {
                const list = Array.isArray(json.data) ? json.data : [];
                setReservations(list);
            })
            .catch((err: any) => {
                console.error("fetch reservations error:", err);
                setErrorMsg(String(err.message || err));
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // ---------------- helpers to build chart data ----------------

    // รายได้แยกตามประเภทโต๊ะ (POOL / SNOOKER)
    const revenueByTypeData = useMemo(() => {
        const bucket: Record<string, number> = {};

        for (const r of reservations) {
            const tableType = r.table?.type;
            const amount = r.lastPayment?.amount ?? 0;
            if (!tableType) continue;

            if (!bucket[tableType]) bucket[tableType] = 0;
            bucket[tableType] += amount;
        }

        return Object.entries(bucket).map(([tableType, total]) => ({
            tableType,
            total,
        }));
    }, [reservations]);

    // รายได้ต่อโต๊ะเลขที่ (โต๊ะ 1, โต๊ะ 2, ...)
    const revenueByTableNumberData = useMemo(() => {
        const bucket: Record<string, number> = {};

        for (const r of reservations) {
            const tableNo = r.table?.number;
            const amount = r.lastPayment?.amount ?? 0;
            if (tableNo == null) continue;

            if (!bucket[tableNo]) bucket[tableNo] = 0;
            bucket[tableNo] += amount;
        }

        return Object.entries(bucket).map(([tableNo, total]) => ({
            tableLabel: `โต๊ะ ${tableNo}`,
            tableNo: Number(tableNo),
            total,
        }));
    }, [reservations]);

    // 🔥 NEW: summary เชิงสถิติสำหรับตารางด้านล่าง
    const summaryStats = useMemo(() => {
        let totalAll = 0;
        let totalSnooker = 0;
        let totalPool = 0;

        // รวมยอดทั้งหมด + แยกตามประเภทโต๊ะ
        for (const r of reservations) {
            const amount = r.lastPayment?.amount ?? 0;
            totalAll += amount;

            if (r.table?.type === "SNOOKER") {
                totalSnooker += amount;
            } else if (r.table?.type === "POOL") {
                totalPool += amount;
            }
        }

        // หาโต๊ะทำเงินสูงสุด
        let topTableNo: number | null = null;
        let topTableAmount = 0;
        for (const row of revenueByTableNumberData) {
            if (row.total > topTableAmount) {
                topTableAmount = row.total;
                topTableNo = row.tableNo;
            }
        }

        return {
            totalAll,
            totalSnooker,
            totalPool,
            totalReservations: reservations.length,
            topTableNo,
            topTableAmount,
        };
    }, [reservations, revenueByTableNumberData]);

    // ---------- UI states ----------
    if (loading) {
        return (
            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 h-[320px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 h-[320px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                </div>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                ดึงข้อมูลไม่ได้: {errorMsg}
            </div>
        );
    }

    // ---------- Empty state helper ----------
    function renderEmptyCard(title: string) {
        return (
            <div className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-200 h-[320px] flex flex-col">
                <h2 className="text-lg font-bold mb-2 text-gray-900">{title}</h2>
                <div className="flex-1 min-h-0 flex items-center justify-center text-gray-400 text-sm text-center px-4">
                    ยังไม่มีข้อมูลรายได้เพียงพอสำหรับแสดงกราฟ
                </div>
            </div>
        );
    }

    // ---------- Render charts + summary table ----------
    return (
        <div className="flex flex-col gap-6">
            {/* ----- CHART GRID ----- */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* ----- Chart A: รายได้แยกตามประเภทโต๊ะ ----- */}
                {revenueByTypeData.length === 0 ? (
                    renderEmptyCard("รายได้แยกตามประเภทโต๊ะ (บาท)")
                ) : (
                    <div className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-200 h-[320px] flex flex-col">
                        <h2 className="text-lg font-bold mb-2 text-gray-900">
                            รายได้แยกตามประเภทโต๊ะ (บาท)
                        </h2>

                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={revenueByTypeData}
                                    margin={{
                                        top: 16,
                                        right: 24,
                                        bottom: 16,
                                        left: 8,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="4 4" />
                                    <XAxis dataKey="tableType" />
                                    <YAxis
                                        label={{
                                            value: "บาท",
                                            angle: -90,
                                            position: "insideLeft",
                                        }}
                                    />
                                    <Tooltip content={<BahtTooltip />} />
                                    <Legend />
                                    <Bar
                                        dataKey="total"
                                        name="รายได้รวม (บาท)"
                                        barSize={35}
                                        fillOpacity={0.9}
                                    >
                                        {revenueByTypeData.map(
                                            (entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={
                                                        entry.tableType ===
                                                            "SNOOKER"
                                                            ? "#ff0808"
                                                            : entry.tableType ===
                                                                "POOL"
                                                                ? "#4c97fc"
                                                                : "#a1a1aa"
                                                    }
                                                />
                                            )
                                        )}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* ----- Chart B: รายได้ต่อหมายเลขโต๊ะ ----- */}
                {revenueByTableNumberData.length === 0 ? (
                    renderEmptyCard("ยอดขายต่อโต๊ะ (บาท)")
                ) : (
                    <div className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-200 h-[320px] flex flex-col">
                        <h2 className="text-lg font-bold mb-2 text-gray-900">
                            ยอดขายต่อโต๊ะ (บาท)
                        </h2>

                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={revenueByTableNumberData}
                                    layout="vertical"
                                    margin={{
                                        top: 16,
                                        right: 24,
                                        bottom: 16,
                                        left: 32,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="4 4" />
                                    {/* X = ยอดเงิน */}
                                    <XAxis
                                        type="number"
                                        label={{
                                            value: "บาท",
                                            position: "insideBottomRight",
                                            offset: -10,
                                        }}
                                    />
                                    {/* Y = โต๊ะ 1 / โต๊ะ 5 / ... */}
                                    <YAxis
                                        type="category"
                                        dataKey="tableLabel"
                                        width={64}
                                    />
                                    <Tooltip content={<BahtTooltip />} />
                                    <Legend />
                                    <Bar
                                        dataKey="total"
                                        name="รายได้รวม (บาท)"
                                        barSize={25}
                                        fill="#34d399"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* ----- 🔥 SUMMARY TABLE (ตารางสรุปภาพรวม) ----- */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold mb-4 text-gray-900">
                    สรุปรายงานรายได้
                </h2>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left border-collapse">
                        <tbody className="text-gray-700">
                            <tr className="border-t border-gray-200">
                                <th className="py-2 px-3 font-medium text-gray-600 w-48">
                                    รายได้รวมทั้งหมด
                                </th>
                                <td className="py-2 px-3 font-semibold text-gray-900">
                                    {summaryStats.totalAll.toLocaleString(
                                        "th-TH"
                                    )}{" "}
                                    บาท
                                </td>
                            </tr>

                            <tr className="border-t border-gray-200">
                                <th className="py-2 px-3 font-medium text-gray-600">
                                    รายได้โต๊ะ SNOOKER
                                </th>
                                <td className="py-2 px-3 font-semibold text-gray-900">
                                    {summaryStats.totalSnooker.toLocaleString(
                                        "th-TH"
                                    )}{" "}
                                    บาท
                                </td>
                            </tr>

                            <tr className="border-t border-gray-200">
                                <th className="py-2 px-3 font-medium text-gray-600">
                                    รายได้โต๊ะ POOL
                                </th>
                                <td className="py-2 px-3 font-semibold text-gray-900">
                                    {summaryStats.totalPool.toLocaleString(
                                        "th-TH"
                                    )}{" "}
                                    บาท
                                </td>
                            </tr>

                            <tr className="border-t border-gray-200">
                                <th className="py-2 px-3 font-medium text-gray-600">
                                    จำนวนการจองที่ดึงมา
                                </th>
                                <td className="py-2 px-3 font-semibold text-gray-900">
                                    {summaryStats.totalReservations.toLocaleString(
                                        "th-TH"
                                    )}{" "}
                                    ครั้ง
                                </td>
                            </tr>

                            <tr className="border-t border-gray-200 border-b">
                                <th className="py-2 px-3 font-medium text-gray-600">
                                    โต๊ะทำเงินสูงสุด
                                </th>
                                <td className="py-2 px-3 font-semibold text-gray-900">
                                    {summaryStats.topTableNo == null
                                        ? "—"
                                        : `โต๊ะ ${summaryStats.topTableNo} (${summaryStats.topTableAmount.toLocaleString(
                                            "th-TH"
                                        )} บาท)`}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p className="text-[11px] text-gray-400 mt-3">
                    *ตัวเลขนี้นับจากข้อมูลทั้งหมดที่ backend ส่งมาในครั้งล่าสุด
                </p>
            </div>
        </div>
    );
}
