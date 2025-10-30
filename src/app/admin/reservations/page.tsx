"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type NextStatus = "CONFIRMED" | "COMPLETED";

export default function AdminQuickChangeStatusPage() {
    const search = useSearchParams();
    const router = useRouter();

    // env
    const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

    // form states
    const [reservationId, setReservationId] = useState("");
    const [nextStatus, setNextStatus] = useState<NextStatus>("CONFIRMED");

    // ui states
    const [loading, setLoading] = useState(false);
    const [serverMsg, setServerMsg] = useState<string | null>(null);
    const [serverJson, setServerJson] = useState<{
        id?: string;
        status?: string;
        addedHours?: number;
    } | null>(null);

    // fill ?id=... อัตโนมัติ
    useEffect(() => {
        const id = search.get("id");
        if (id) setReservationId(id);
    }, [search]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        setServerMsg(null);
        setServerJson(null);

        const token = localStorage.getItem("token");
        if (!token) {
            setServerMsg("❌ Unauthorized: no admin token. กรุณาล็อกอินใหม่");
            return;
        }
        if (!reservationId) {
            setServerMsg("❌ กรุณาใส่ Reservation ID");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(
                `${API}/api/v1/admin/authorized/reservations/${reservationId}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ status: nextStatus }),
                }
            );

            // พยายาม parse json -> ถ้า parse ไม่ได้จะลอง text
            let parsed: any = null;
            try {
                parsed = await res.json();
            } catch {
                try {
                    const text = await res.text();
                    parsed = text ? { message: text } : {};
                } catch {
                    parsed = {};
                }
            }

            // ถ้า success
            if (res.ok) {
                setServerMsg("✅ อัปเดตสถานะการจองเรียบร้อยแล้ว");
                const data = parsed?.data;
                if (data && typeof data === "object") {
                    setServerJson({
                        id: data.id,
                        status: data.status,
                        addedHours: data.addedHours,
                    });
                } else {
                    setServerJson(null);
                }
            } else {
                const msg =
                    parsed?.message ||
                    `อัปเดตไม่สำเร็จ (HTTP ${res.status})`;
                setServerMsg(`❌ ${msg}`);
                setServerJson(null);
            }
        } catch (err: any) {
            setServerMsg("❌ Network Error");
            setServerJson(null);
        } finally {
            setLoading(false);
        }
    }

    // helper ปุ่ม back
    const goAdminHome = () => {
        router.push("/admin/home");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">

                {/* ปุ่มกลับไปหน้า Admin */}
                <div className="mb-2">
                    <button
                        onClick={goAdminHome}
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
                <header className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-3xl sm:text-4xl">🛠️</span>
                        </div>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                        เปลี่ยนสถานะการจองแบบด่วน
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                        ใช้หน้านี้เวลาเรารู้ Reservation ID อยู่แล้ว
                        <br />
                        เช่น ลูกค้ามาหน้าร้านแล้วเล่นจบ
                        → เปลี่ยนเป็น COMPLETED เพื่อเคลียร์โต๊ะ
                    </p>
                </header>

                {/* Card ฟอร์มอัปเดตสถานะ */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <span>⚙️</span>
                        <span>อัปเดตสถานะ</span>
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Reservation ID */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Reservation ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
                                placeholder="97dc6cda-1b2e-43fa-9763-439000cd2fef"
                                value={reservationId}
                                onChange={(e) => setReservationId(e.target.value.trim())}
                            />
                            <p className="text-xs text-gray-500">
                                ใส่ ID ของการจองที่ต้องการอัปเดตสถานะ
                            </p>
                        </div>

                        {/* Next Status */}
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
                            <p className="text-xs text-gray-500 leading-relaxed">
                                ปกติ: <br />
                                - สถานะ PENDING → กดเป็น CONFIRMED เมื่อลูกค้ามาโต๊ะจริง <br />
                                - สถานะ CONFIRMED → กดเป็น COMPLETED หลังเล่นจบและจ่ายบิลแล้ว
                            </p>
                        </div>

                        {/* ปุ่มส่ง */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all ${
                                loading
                                    ? "bg-blue-400 cursor-wait"
                                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-[0.99]"
                            }`}
                        >
                            {loading ? "กำลังอัปเดต..." : "✅ อัปเดตสถานะ"}
                        </button>

                        {/* ผลลัพธ์หลังบ้าน */}
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
                                        <span className="text-blue-400">
                                            id:
                                        </span>{" "}
                                        {serverJson.id ?? "-"}
                                    </div>
                                    <div>
                                        <span className="text-blue-400">
                                            status:
                                        </span>{" "}
                                        <span className="text-yellow-300">
                                            {serverJson.status ?? "-"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-blue-400">
                                            addedHours:
                                        </span>{" "}
                                        <span className="text-purple-400">
                                            {serverJson.addedHours ?? 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </section>

                {/* Hint การใช้งานเร็ว */}
                <section className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800 leading-relaxed">
                    <div className="font-semibold mb-1 flex items-center gap-2">
                        <span>💡</span>
                        <span>ทริคใช้งานไว</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                        <li>
                            ถ้าอยู่หน้า “รายการจองล่าสุด” ใน /admin/home
                            ให้ก๊อป Reservation ID มากดวางที่นี่ได้เลย
                        </li>
                        <li>
                            สามารถแนบ ?id=... ใน URL ได้ เช่น{" "}
                            <code className="bg-white border border-yellow-300 text-yellow-700 px-1 py-0.5 rounded text-xs font-mono">
                                /admin/change-status-fast?id=97dc6cda-...
                            </code>{" "}
                            แล้วช่อง Reservation ID จะถูกเติมอัตโนมัติ
                        </li>
                    </ul>
                </section>
            </main>
        </div>
    );
}
