"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type NextStatus = "CONFIRMED" | "COMPLETED";

type ApiResponseData = {
    id: string;
    status: string;
    addedHours: number;
};

type AdminReservationRow = {
    id: string;
    status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
    startTime: string | null;
    endTime: string | null;
    table?: {
        number: number;
        type: string;
    } | null;
    lastPayment?: {
        status: "PENDING" | "PAID" | "CANCELLED";
        amount: number;
        method: string;
    } | null;
};

export default function AdminChangeReservationStatusPage() {
    const [reservationId, setReservationId] = useState("");
    const [nextStatus, setNextStatus] = useState<NextStatus>("CONFIRMED");

    const [loading, setLoading] = useState(false);
    const [serverMsg, setServerMsg] = useState<string | null>(null);
    const [serverJson, setServerJson] = useState<ApiResponseData | null>(null);

    const [recentReservations, setRecentReservations] = useState<AdminReservationRow[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [loadListErr, setLoadListErr] = useState<string | null>(null);

    // 🆕 state สำหรับสถานะลบเฉพาะอันที่กำลังโดนลบ เพื่อ disable ปุ่ม
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const router = useRouter();

    // ---------- CONFIG ----------
    const API = process.env.NEXT_PUBLIC_API_DOMAIN || "http://localhost:3001";
    const PATCH_URL = `${API}/api/v1/admin/authorized/reservations`;
    const LIST_URL = `${API}/api/v1/admin/authorized/reservations`;
    const DELETE_URL = `${API}/api/v1/admin/authorized/reservations`; // /:id (DELETE)

    // ---------- HELPERS ----------
    function fmtThai(dtISO?: string | null) {
        if (!dtISO) return "-";
        return new Intl.DateTimeFormat("th-TH", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Bangkok",
        }).format(new Date(dtISO));
    }

    function getStatusColor(status: string) {
        switch (status) {
            case "PENDING":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "CONFIRMED":
                return "bg-blue-100 text-blue-800 border-blue-200";
            case "COMPLETED":
                return "bg-green-100 text-green-800 border-green-200";
            case "CANCELLED":
                return "bg-red-100 text-red-800 border-red-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    }

    // ---------- STATS ----------
    const stats = {
        total: recentReservations.length,
        pending: recentReservations.filter((r) => r.status === "PENDING").length,
        confirmed: recentReservations.filter((r) => r.status === "CONFIRMED").length,
        completed: recentReservations.filter((r) => r.status === "COMPLETED").length,
    };

    // ---------- LOAD LIST ----------
    useEffect(() => {
        (async () => {
            setLoadListErr(null);
            setLoadingList(true);
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    setLoadListErr("no admin token in localStorage");
                    setLoadingList(false);
                    return;
                }

                const res = await fetch(LIST_URL, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const json = await res.json().catch(() => null);

                if (!res.ok) {
                    setLoadListErr(
                        json?.message ||
                            `Fetch list failed ${res.status} ${res.statusText}`
                    );
                    setLoadingList(false);
                    return;
                }

                const arr = Array.isArray(json?.data) ? json.data : [];
                setRecentReservations(arr);
            } catch (err: any) {
                setLoadListErr(err?.message || "failed to load list");
            } finally {
                setLoadingList(false);
            }
        })();
    }, [LIST_URL]);

    // ---------- PATCH STATUS ----------
    async function handleSubmit() {
        setServerMsg(null);
        setServerJson(null);

        const token = localStorage.getItem("token");
        if (!token) {
            setServerMsg("❌ Unauthorized: no admin token. Please login again.");
            return;
        }
        if (!reservationId) {
            setServerMsg("❌ กรุณาใส่ Reservation ID");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${PATCH_URL}/${reservationId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status: nextStatus,
                }),
            });

            const raw = await res.text();
            let parsed: any = null;
            try {
                parsed = JSON.parse(raw);
            } catch {}

            if (!res.ok) {
                const msg = parsed?.message
                    ? `❌ ${res.status} ${res.statusText}: ${parsed.message}`
                    : `❌ ${res.status} ${res.statusText}: ${raw}`;
                setServerMsg(msg);
                setLoading(false);
                return;
            }

            setServerMsg("✅ " + (parsed?.message ?? "Success"));
            setServerJson(parsed?.data ?? null);

            // อัปเดต list ใน sidebar ให้ status เปลี่ยนทันทีแบบ optimistic
            setRecentReservations((prev) =>
                prev.map((item) =>
                    item.id === reservationId
                        ? { ...item, status: nextStatus }
                        : item
                )
            );
        } catch (err: any) {
            console.error("Fetch error:", err);
            setServerMsg("❌ Network / Client Error");
        } finally {
            setLoading(false);
        }
    }

    // ---------- DELETE RESERVATION ----------
    async function deleteReservation(id: string) {
        // reset msg ก่อน เพื่อให้เห็นผลลบล่าสุด
        setServerMsg(null);
        setServerJson(null);

        const token = localStorage.getItem("token");
        if (!token) {
            setServerMsg("❌ Unauthorized: no admin token. Please login again.");
            return;
        }

        // mark กำลังลบปุ่มนี้ -> ปุ่มนี้จะ disabled
        setDeletingId(id);

        try {
            const res = await fetch(`${DELETE_URL}/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const raw = await res.text();
            let parsed: any = null;
            try {
                parsed = JSON.parse(raw);
            } catch {}

            if (!res.ok) {
                const msg = parsed?.message
                    ? `❌ ${res.status} ${res.statusText}: ${parsed.message}`
                    : `❌ ${res.status} ${res.statusText}: ${raw}`;

                setServerMsg(msg);
                setDeletingId(null);
                return;
            }

            //ตามสเปค:
            // {
            //   "ok": true,
            //   "message": "Deleted",
            //   "id": "1a96f0aa-6131-4abb-a0a9-412936045120"
            // }

            setServerMsg("✅ ลบสำเร็จ: " + (parsed?.message || "Deleted"));

            // ตัดตัวที่ถูกลบออกจาก recentReservations
            setRecentReservations((prev) => prev.filter((r) => r.id !== id));

            // ถ้า form ข้างซ้ายกำลังถือ id เดียวกันอยู่ ให้เคลียร์ด้วยกันไปเลย
            setReservationId((curr) => (curr === id ? "" : curr));
        } catch (err: any) {
            console.error("Delete error:", err);
            setServerMsg("❌ Network / Client Error");
        } finally {
            setDeletingId(null);
        }
    }

    // ---------- RENDER ----------
    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* 🔙 back to admin home */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push("/admin/home")}
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

                {/* Header */}
                <header className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-3xl sm:text-4xl">📋</span>
                        </div>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                        เปลี่ยนสถานะการจอง
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base">
                        อัปเดตสถานะการจองของลูกค้า
                    </p>
                </header>

                {/* Stats */}
                <section className="mb-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                            <div className="text-sm text-gray-600 mb-1">ทั้งหมด</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {stats.total}
                            </div>
                        </div>
                        <div className="bg-yellow-50 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow border border-yellow-200">
                            <div className="text-sm text-yellow-700 mb-1">
                                ⏳ รอดำเนินการ
                            </div>
                            <div className="text-2xl font-bold text-yellow-800">
                                {stats.pending}
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow border border-blue-200">
                            <div className="text-sm text-blue-700 mb-1">✓ ยืนยันแล้ว</div>
                            <div className="text-2xl font-bold text-blue-800">
                                {stats.confirmed}
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow border border-green-200">
                            <div className="text-sm text-green-700 mb-1">✔ เสร็จสิ้น</div>
                            <div className="text-2xl font-bold text-green-800">
                                {stats.completed}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT: Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                <span>⚙️</span>
                                <span>อัปเดตสถานะ</span>
                            </h2>

                            <div className="space-y-6">
                                {/* Reservation ID */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Reservation ID{" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
                                        placeholder="97dc6cda-1b2e-43fa-9763-439000cd2fef"
                                        value={reservationId}
                                        onChange={(e) => setReservationId(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-500">
                                        ใส่ ID ของการจองที่ต้องการอัปเดตสถานะ
                                    </p>
                                </div>

                                {/* Status Select */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        สถานะใหม่
                                    </label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        value={nextStatus}
                                        onChange={(e) =>
                                            setNextStatus(e.target.value as NextStatus)
                                        }
                                    >
                                        <option value="CONFIRMED">
                                            ✓ CONFIRMED (ยืนยันการจอง)
                                        </option>
                                        <option value="COMPLETED">
                                            ✔ COMPLETED (เล่นเสร็จ / เคลียร์บิลแล้ว)
                                        </option>
                                    </select>
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all ${
                                        loading
                                            ? "bg-blue-400 cursor-wait"
                                            : "bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-[0.99]"
                                    }`}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg
                                                className="animate-spin h-5 w-5"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth={4}
                                                    fill="none"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            กำลังอัปเดต...
                                        </span>
                                    ) : (
                                        "✅ อัปเดตสถานะ"
                                    )}
                                </button>

                                {/* Result message */}
                                {serverMsg && (
                                    <div
                                        className={`rounded-xl px-4 py-3 text-sm font-medium ${
                                            serverMsg.startsWith("❌")
                                                ? "bg-red-50 text-red-700 border-2 border-red-200"
                                                : "bg-green-50 text-green-700 border-2 border-green-200"
                                        }`}
                                    >
                                        {serverMsg}
                                    </div>
                                )}

                                {serverJson && (
                                    <div className="bg-gray-900 rounded-xl p-4 text-green-400 font-mono text-xs overflow-x-auto">
                                        <div className="space-y-1">
                                            <div>
                                                <span className="text-blue-400">id:</span>{" "}
                                                {serverJson.id}
                                            </div>
                                            <div>
                                                <span className="text-blue-400">status:</span>{" "}
                                                <span className="text-yellow-300">
                                                    {serverJson.status}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-blue-400">
                                                    addedHours:
                                                </span>{" "}
                                                <span className="text-purple-400">
                                                    {serverJson.addedHours}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Recent reservations */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <span>📋</span>
                                    <span>รายการจองล่าสุด</span>
                                </h2>
                            </div>
                            <div className="p-6">
                                {loadingList ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
                                        <p className="text-sm text-gray-500">
                                            กำลังโหลด...
                                        </p>
                                    </div>
                                ) : loadListErr ? (
                                    <div className="bg-red-50 border-2 border-red-200 text-red-700 rounded-xl p-3 text-xs">
                                        {loadListErr}
                                    </div>
                                ) : recentReservations.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <span className="text-3xl">📭</span>
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            ไม่มีข้อมูลจอง
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                        {recentReservations.map((r) => (
                                            <div
                                                key={r.id}
                                                className="border border-gray-200 rounded-xl p-3 hover:shadow-md transition-shadow bg-gray-50"
                                            >
                                                {/* ID + ปุ่มใช้ + ปุ่มลบ */}
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="font-mono text-[10px] text-gray-600 break-all flex-1">
                                                        {r.id}
                                                    </div>

                                                    {/* ปุ่มลบ */}
                                                    <button
                                                        className={`text-[10px] px-2 py-1 rounded-lg whitespace-nowrap flex-shrink-0 font-semibold transition
                                                            ${
                                                                deletingId === r.id
                                                                    ? "bg-gray-400 text-white cursor-wait"
                                                                    : "bg-red-600 text-white hover:bg-red-700"
                                                            }`}
                                                        disabled={deletingId === r.id}
                                                        onClick={() => {
                                                            // ยืนยันก่อนลบ (confirm ของ browser ง่ายๆ)
                                                            const ok = window.confirm(
                                                                "⚠ ลบการจองนี้ถาวร?\n(จะหายออกจากระบบ)"
                                                            );
                                                            if (!ok) return;
                                                            deleteReservation(r.id);
                                                        }}
                                                    >
                                                        {deletingId === r.id
                                                            ? "กำลังลบ..."
                                                            : "ลบ"}
                                                    </button>

                                                    {/* ปุ่มใช้ */}
                                                    <button
                                                        className="text-[10px] px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap flex-shrink-0"
                                                        onClick={() => {
                                                            // auto-fill form
                                                            setReservationId(r.id);

                                                            // smart default nextStatus:
                                                            if (r.status === "PENDING") {
                                                                setNextStatus("CONFIRMED");
                                                            } else if (r.status === "CONFIRMED") {
                                                                setNextStatus("COMPLETED");
                                                            }
                                                        }}
                                                    >
                                                        ใช้
                                                    </button>
                                                </div>

                                                {/* status + table */}
                                                <div className="flex flex-wrap gap-2 items-center mb-2">
                                                    <span
                                                        className={`text-[10px] px-2 py-1 rounded-full font-semibold border ${getStatusColor(
                                                            r.status
                                                        )}`}
                                                    >
                                                        {r.status}
                                                    </span>

                                                    {r.table && (
                                                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                                            <span>🎱</span>
                                                            <span>
                                                                โต๊ะ {r.table.number} (
                                                                {r.table.type})
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>

                                                {/* payment info */}
                                                {r.lastPayment && (
                                                    <div className="bg-blue-50 rounded-lg p-2 mb-2">
                                                        <div className="text-[10px] text-gray-600 flex items-center gap-1">
                                                            <span>💰</span>
                                                            <span>
                                                                {r.lastPayment.status} •{" "}
                                                                {r.lastPayment.amount}฿ •{" "}
                                                                {r.lastPayment.method}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* time info */}
                                                {r.startTime && (
                                                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        <span>🕐</span>
                                                        <span>{fmtThai(r.startTime)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
