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

    const formatThaiTime = (isoString: string) => {
        const cleaned = isoString.endsWith("Z") ? isoString.slice(0, -1) : isoString;
        return new Intl.DateTimeFormat("th-TH", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Bangkok"
        }).format(new Date(cleaned));
    };

    useEffect(() => {
        const fetchTables = async () => {
            try {
                const res = await fetch("http://localhost:3001/api/v1/table/guest/tables");
                const data = await res.json();

                const poolTables = data.data.filter(
                    (t: Table) => t.type.toUpperCase() === "POOL"
                );
                setTables(poolTables);
            } catch (err) {
                console.error("Error loading tables:", err);
            } finally {
                setTimeout(() => {
                    setLoading(false);
                }, 1000);
            }
        };
        fetchTables();
    }, []);

    if (loading)
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-7xl mx-auto mb-8">

                {/* Back Button + My Reservations */}
                <div className="mb-6 flex justify-between">
                    <button
                        onClick={() => router.push("/")}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:translate-x-[-10px] transition-all duration-200"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="font-medium">กลับไปหน้าแรก</span>
                    </button>
                </div>

                {/* Section Title */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer">
                            <span className="text-3xl">🎯</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        หน้าจองโต๊ะพูล
                    </h1>
                    <p className="text-gray-500 text-sm">
                        เลือกและจองโต๊ะพูลที่คุณต้องการ
                    </p>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
                    <div className="bg-white rounded-xl p-4 shadow-sm  transition-all duration-300 cursor-pointer">
                        <div className="text-2xl font-bold text-gray-900">{tables.length}</div>
                        <div className="text-xs text-gray-500 mt-1">โต๊ะที่มีอยู่ทั้งหมด</div>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm transition-all duration-300 cursor-pointer">
                        <div className="text-2xl font-bold text-green-600">
                            {tables.filter(t => t.status === "ACTIVE").length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">ที่จองได้</div>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm transition-all duration-300 cursor-pointer">
                        <div className="text-2xl font-bold text-red-600">
                            {tables.filter(t => t.status !== "ACTIVE").length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">ยังไม่ว่าง/ปิดซ้อมบำรุง</div>
                    </div>
                </div>

                {/* Tables Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tables.map((table) => {
                        const isAvailable = table.status === "ACTIVE";
                        const currentRes = table.reservations?.[0];
                        return (
                            <div
                                key={table.id}
                                className="bg-white rounded-2xl shadow-sm transition-all duration-300 overflow-hidden group"
                            >
                                {/* Card Header */}
                                <div className={`px-6 py-4 ${isAvailable ? 'bg-green-50' : 'bg-red-50'} transition-colors duration-300`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 transition-transform duration-300">
                                                โต๊ะที่ {table.number}
                                            </h2>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {table.hourlyRate} ฿/ช.ม.
                                            </p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-semibold transition-transform duration-300 ${isAvailable
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                            }`}>
                                            {isAvailable ? 'Available' : 'Occupied'}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="px-6 py-5">
                                    {/* ถ้ามีการจองปัจจุบัน */}
                                    {currentRes && (
                                        <div className="bg-blue-50 rounded-xl p-4 mb-4 transition-colors duration-300">
                                            <div className="text-xs font-semibold text-gray-700 mb-2">
                                                การจองปัจจุบัน
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-start transition-transform duration-200">
                                                    <svg className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-gray-700">
                                                        {currentRes.guestName || currentRes.user?.name || "Guest"}
                                                    </span>
                                                </div>
                                                <div className="flex items-start transition-transform duration-200">
                                                    <svg className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                    </svg>
                                                    <div className="text-gray-700 text-xs">
                                                        <div>Start: {formatThaiTime(currentRes.startTime)}</div>
                                                        <div className="mt-1">End: {formatThaiTime(currentRes.endTime)}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <div className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${currentRes.status === 'CONFIRMED'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {currentRes.status}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ถ้าโต๊ะว่างและไม่มีการจอง */}
                                    {isAvailable && !currentRes && (
                                        <div className="text-center py-6">
                                            <svg className="w-12 h-12 mx-auto mb-2 opacity-50  transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-sm">โต๊ะนี้พร้อมจองแล้ว</p>
                                        </div>
                                    )}

                                    {/* ปุ่มจอง */}
                                    <button
                                        onClick={() => router.push(`/reserve/Pool?tableId=${table.id}`)}
                                        disabled={!isAvailable}
                                        className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-300 ${isAvailable
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-lg hover:scale-105'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {isAvailable ? 'สามารถจองได้' : 'ไม่สามารถจองได้'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {tables.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-transform duration-300">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">โต๊ะนี้ยังไม่ว่าง</h3>
                        <p className="text-gray-500 text-sm">กรุณาตรวจสอบอีกครั้งในภายหลัง</p>
                    </div>
                )}
            </div>
        </div>
    );
}