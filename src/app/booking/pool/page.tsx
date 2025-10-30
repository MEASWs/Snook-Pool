"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Reservation = {
    id: string;
    guestName: string | null;
    status: string;
    startTime: string;
    endTime: string;
    user?: { id: string; name: string };
};

type Table = {
    id: string;
    number: number;
    type: string;
    status: string;
    hourlyRate: number;
    reservations: Reservation[];
};

export default function PoolPage() {
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);

    const router = useRouter();

    // ใช้ค่า base URL จาก .env (ห้ามฮาร์ดโค้ด localhost ตรง ๆ)
    const API = process.env.NEXT_PUBLIC_API_DOMAIN as string;

    // ฟอร์แมตเวลาแบบโซนไทย
    const formatThaiTime = (isoString: string) => {
        const cleaned = isoString.endsWith("Z") ? isoString.slice(0, -1) : isoString;
        return new Intl.DateTimeFormat("th-TH", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Bangkok",
        }).format(new Date(cleaned));
    };

    // โหลดข้อมูลโต๊ะพูลทั้งหมด
    useEffect(() => {
        async function fetchTables() {
            try {
                const res = await fetch(`${API}/api/v1/table/guest/tables`);
                const data = await res.json();

                const poolTables: Table[] = (data?.data || []).filter(
                    (t: Table) => t.type?.toUpperCase() === "POOL"
                );

                setTables(poolTables);
            } catch (err) {
                console.error("Error loading tables:", err);
            } finally {
                // หน่วงนิดหน่อยเพื่อโชว์ loading animation ดูเนียน
                setTimeout(() => {
                    setLoading(false);
                }, 1000);
            }
        }

        fetchTables();
    }, [API]);

    // ---------- Loading State (semantic-friendly) ----------
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div
                    className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
                    aria-label="กำลังโหลดข้อมูลโต๊ะพูล"
                ></div>
            </div>
        );
    }

    // ---------- Normal Render ----------
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

            <main
                role="main"
                className="max-w-7xl mx-auto"
            >
                {/* ส่วนหัวของหน้า */}
                <section
                    aria-labelledby="pool-page-title"
                    className="text-center mb-8"
                >
                    <div className="flex justify-center mb-4" aria-hidden="true">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center transition-all duration-300">
                            <span className="text-3xl">🎯</span>
                        </div>
                    </div>

                    <h1
                        id="pool-page-title"
                        className="text-3xl font-bold text-gray-900 mb-2"
                    >
                        หน้าจองโต๊ะพูล
                    </h1>

                    <p className="text-gray-500 text-sm">
                        เลือกและจองโต๊ะพูลที่คุณต้องการ
                    </p>
                </section>

                {/* สถิติรวมสถานะโต๊ะ */}
                <section
                    aria-label="สถานะภาพรวมของโต๊ะพูล"
                    className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto"
                >
                    <article className="bg-white rounded-xl p-4 shadow-sm transition-all duration-300">
                        <div className="text-2xl font-bold text-gray-900">
                            {tables.length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            โต๊ะที่มีอยู่ทั้งหมด
                        </div>
                    </article>

                    <article className="bg-white rounded-xl p-4 shadow-sm transition-all duration-300">
                        <div className="text-2xl font-bold text-green-600">
                            {tables.filter((t) => t.status === "ACTIVE").length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            ที่จองได้
                        </div>
                    </article>

                    <article className="bg-white rounded-xl p-4 shadow-sm transition-all duration-300">
                        <div className="text-2xl font-bold text-red-600">
                            {tables.filter((t) => t.status !== "ACTIVE").length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            ยังไม่ว่าง / ปิดซ่อมบำรุง
                        </div>
                    </article>
                </section>

                {/* รายการโต๊ะทีละตัว */}
                <section
                    aria-labelledby="table-list-title"
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    <h2
                        id="table-list-title"
                        className="sr-only"
                    >
                        รายการโต๊ะพูลทั้งหมด
                    </h2>

                    {tables.map((table) => {
                        const isAvailable = table.status === "ACTIVE";
                        const currentRes = table.reservations?.[0];

                        return (
                            <article
                                key={table.id}
                                className="bg-white rounded-2xl shadow-sm transition-all duration-300 overflow-hidden group"
                                aria-labelledby={`table-${table.id}-title`}
                            >
                                {/* หัวการ์ดของโต๊ะ */}
                                <header
                                    className={`px-6 py-4 ${
                                        isAvailable
                                            ? "bg-green-50"
                                            : "bg-red-50"
                                    } transition-colors duration-300`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3
                                                id={`table-${table.id}-title`}
                                                className="text-xl font-bold text-gray-900 transition-transform duration-300"
                                            >
                                                โต๊ะที่ {table.number}
                                            </h3>

                                            <p className="text-sm text-gray-600 mt-1">
                                                {table.hourlyRate} ฿/ช.ม.
                                            </p>
                                        </div>

                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-transform duration-300 ${
                                                isAvailable
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                            }`}
                                        >
                                            {isAvailable
                                                ? "Available"
                                                : "Occupied"}
                                        </span>
                                    </div>
                                </header>

                                {/* เนื้อหาการ์ด */}
                                <section className="px-6 py-5">
                                    {/* ถ้ามีการจองปัจจุบัน */}
                                    {currentRes && (
                                        <section
                                            aria-labelledby={`current-res-${table.id}`}
                                            className="bg-blue-50 rounded-xl p-4 mb-4 transition-colors duration-300"
                                        >
                                            <p
                                            id={`current-res-${table.id}`}
                                            className="text-xs font-semibold text-gray-700 mb-2"
                                            >
                                                การจองปัจจุบัน
                                            </p>

                                            <div className="space-y-2 text-sm">
                                                {/* ชื่อผู้จอง */}
                                                <div className="flex items-start transition-transform duration-200">
                                                    <svg
                                                        className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                        aria-hidden="true"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                    <span className="text-gray-700">
                                                        {currentRes.guestName ||
                                                            currentRes.user
                                                                ?.name ||
                                                            "Guest"}
                                                    </span>
                                                </div>

                                                {/* เวลาเริ่ม / จบ */}
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
                                                            Start:{" "}
                                                            {formatThaiTime(
                                                                currentRes.startTime
                                                            )}
                                                        </div>
                                                        <div className="mt-1">
                                                            End:{" "}
                                                            {formatThaiTime(
                                                                currentRes.endTime
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* สถานะการจอง */}
                                                <div className="flex items-center">
                                                    <span
                                                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            currentRes.status ===
                                                            "CONFIRMED"
                                                                ? "bg-blue-100 text-blue-700"
                                                                : "bg-gray-100 text-gray-700"
                                                        }`}
                                                    >
                                                        {currentRes.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {/* ถ้าโต๊ะว่างและไม่มีการจอง */}
                                    {isAvailable && !currentRes && (
                                        <section
                                            aria-label="สถานะโต๊ะนี้พร้อมให้จอง"
                                            className="text-center py-6"
                                        >
                                            <svg
                                                className="w-12 h-12 mx-auto mb-2 opacity-50 transition-all duration-300"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <p className="text-sm">
                                                โต๊ะนี้พร้อมจองแล้ว
                                            </p>
                                        </section>
                                    )}

                                    {/* ปุ่มจอง */}
                                    <div>
                                        <button
                                            onClick={() =>
                                                router.push(
                                                    `/reserve/Pool?tableId=${table.id}`
                                                )
                                            }
                                            disabled={!isAvailable}
                                            className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-300 ${
                                                isAvailable
                                                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-lg hover:scale-105"
                                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                            }`}
                                            aria-disabled={
                                                !isAvailable || undefined
                                            }
                                            aria-label={`${
                                                isAvailable
                                                    ? "จองโต๊ะนี้ได้"
                                                    : "โต๊ะนี้ไม่พร้อมจอง"
                                            }`}
                                        >
                                            {isAvailable
                                                ? "สามารถจองได้"
                                                : "ไม่สามารถจองได้"}
                                        </button>
                                    </div>
                                </section>
                            </article>
                        );
                    })}
                </section>

                {/* กรณีไม่มีโต๊ะเลย */}
                {tables.length === 0 && (
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
                                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                />
                            </svg>
                        </div>

                        <h2 className="text-lg font-semibold text-gray-900 mb-2">
                            โต๊ะนี้ยังไม่ว่าง
                        </h2>

                        <p className="text-gray-500 text-sm">
                            กรุณาตรวจสอบอีกครั้งในภายหลัง
                        </p>
                    </section>
                )}
            </main>

            {/* future footer (ถ้าจะใส่เครดิต/เบอร์ร้าน/เวลาเปิด) */}
            {/* 
            <footer className="max-w-7xl mx-auto mt-12 text-center text-xs text-gray-400 py-8">
                © 2025 Snook & Pool
            </footer>
            */}
        </div>
    );
}
