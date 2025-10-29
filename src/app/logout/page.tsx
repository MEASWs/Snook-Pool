"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SmartroomLibrary() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [poolCount, setPoolCount] = useState(0);
  const [snookerCount, setSnookerCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);

    // ✅ ดึงข้อมูลโต๊ะจาก backend
    fetch("http://localhost:3001/api/v1/table/guest/tables")
      .then(res => res.json())
      .then(result => {
        const tables = result.data || [];

        setPoolCount(tables.filter((t: any) => t.type === "POOL").length);
        setSnookerCount(
          tables.filter((t: any) => t.type === "SNOOKER").length
        );

        setTableLoading(false);
      })
      .catch(err => {
        console.error("Fetch Error:", err);
        setTableLoading(false);
      });
  }, []);

  const campuses = [
    { name: "Snook", rooms: snookerCount, active: true, emoji: "🎱" },
    { name: "Pool", rooms: poolCount, active: true, emoji: "🎯" },
  ];

  const handleBooking = (campusName: string) => {
    if (!isLoggedIn) {
      alert("กรุณาเข้าสู่ระบบก่อนทำการจอง");
      router.push("/login");
    } else {
      router.push(`/booking/${campusName}`);
    }
  };

  if (tableLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">กำลังโหลดข้อมูลโต๊ะ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <h1
              className="text-2xl sm:text-3xl font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => router.push("/")}
            >
              Snook & Pool
            </h1>

            <div className="flex gap-3 items-center">
              {!isLoggedIn ? (
                <>
                  <button
                    onClick={() => router.push("/login")}
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white text-sm sm:text-base rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-sm"
                  >
                    เข้าสู่ระบบ
                  </button>
                  <button
                    onClick={() => router.push("/register")}
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-green-600 text-white text-sm sm:text-base rounded-xl hover:bg-green-700 transition-colors font-semibold shadow-sm"
                  >
                    สมัครสมาชิก
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    setIsLoggedIn(false);
                    router.push("/logout");
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-red-600 text-white text-sm sm:text-base rounded-xl hover:bg-red-700 transition-colors font-semibold shadow-sm"
                >
                  ออกจากระบบ
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        
        {/* Page Title */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-3xl sm:text-4xl">🎱</span>
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 px-4">
            เลือกประเภทโต๊ะที่ต้องการจอง
          </h2>
          <p className="text-gray-500 text-sm sm:text-base">
            เลือกโต๊ะที่คุณต้องการและทำการจองได้ทันที
          </p>
        </div>

        {/* Campus Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {campuses.map((campus) => (
            <div
              key={campus.name}
              className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              {/* Campus Header */}
              <div className="bg-blue-600 px-6 py-6 sm:py-8 text-center">
                <div className="text-4xl sm:text-5xl mb-3">{campus.emoji}</div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {campus.name}
                </h2>
              </div>

              {/* Room Count & Booking */}
              <div className="px-6 py-8">
                {/* Room Count Display */}
                <div className="mb-6 text-center">
                  <div className="mb-4">
                    <span className="text-5xl sm:text-6xl font-bold text-gray-800">
                      {campus.rooms}
                    </span>
                    <span className="text-xl sm:text-2xl text-gray-500 ml-2">โต๊ะ</span>
                  </div>
                </div>

                {/* Booking Button */}
                <button
                  onClick={() => handleBooking(campus.name)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-4 px-6 rounded-xl transition-colors shadow-sm"
                >
                  จองโต๊ะ {campus.name}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Login Prompt */}
        {!isLoggedIn && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 sm:p-8 text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                ต้องการจองโต๊ะ?
              </h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                กรุณาเข้าสู่ระบบหรือสมัครสมาชิกเพื่อทำการจองโต๊ะ
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push("/login")}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-sm"
                >
                  เข้าสู่ระบบ
                </button>
                <button
                  onClick={() => router.push("/register")}
                  className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50 transition-colors font-semibold"
                >
                  สมัครสมาชิก
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}