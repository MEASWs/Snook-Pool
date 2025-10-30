"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ✅ ใช้ ENV เดียวทั้งโปรเจกต์
const API = process.env.NEXT_PUBLIC_API_DOMAIN as string;

type TableRow = {
  type: "POOL" | "SNOOKER" | string;
};

export default function SmartroomLibrary() {
  const router = useRouter();

  // ---------- auth ----------
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ---------- table counts ----------
  const [poolCount, setPoolCount] = useState(0);
  const [snookerCount, setSnookerCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);

  // โหลดข้อมูลครั้งแรก
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);

    fetch(`${API}/api/v1/table/guest/tables`)
      .then((res) => res.json())
      .then((result) => {
        const tables: TableRow[] = result?.data || [];

        setPoolCount(tables.filter((t) => t.type === "POOL").length);
        setSnookerCount(
          tables.filter((t) => t.type === "SNOOKER").length
        );
      })
      .catch((err) => {
        console.error("Fetch Error:", err);
      })
      .finally(() => {
        setTableLoading(false);
      });
  }, []);

  // การ์ด 2 ประเภทให้แสดงในหน้า
  const categories: Array<{
    key: "SNOOKER" | "POOL";
    label: string;
    emoji: string;
    count: number;
  }> = [
    {
      key: "SNOOKER",
      label: "Snook",
      emoji: "🎱",
      count: snookerCount,
    },
    {
      key: "POOL",
      label: "Pool",
      emoji: "🎯",
      count: poolCount,
    },
  ];

  // เมื่อกด "จองโต๊ะ ..."
  function handleBooking(type: "SNOOKER" | "POOL") {
    if (!isLoggedIn) {
      alert("กรุณาเข้าสู่ระบบก่อนทำการจอง");
      router.push("/login");
      return;
    }

    // เส้นทาง booking ใช้ slug พิมพ์เล็ก เพื่อความสวยใน URL
    const slug = type === "SNOOKER" ? "snooker" : "pool";
    router.push(`/booking/${slug}`);
  }

  // -------- Loading state --------
  if (tableLoading) {
    return (
      <main className="flex justify-center items-center min-h-screen bg-gray-50">
        <section className="text-center" aria-busy="true">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"
            aria-hidden="true"
          ></div>
          <p className="text-gray-600 text-sm">
            กำลังโหลดข้อมูลโต๊ะ...
          </p>
        </section>
      </main>
    );
  }

  // -------- Normal UI --------
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ================= HEADER ================= */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <nav
            className="flex justify-between items-center"
            aria-label="Main navigation"
          >
            {/* ซ้าย: ชื่อเว็บ / ปุ่มกลับหน้าแรก */}
            <button
              onClick={() => router.push("/")}
              className="text-2xl sm:text-3xl font-bold text-gray-800 hover:text-blue-600 transition-colors text-left"
            >
              Snook & Pool
            </button>

            {/* ขวา: ปุ่ม auth */}
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
          </nav>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
        {/* ---------- Section: Intro ---------- */}
        <section
          className="text-center mb-8 sm:mb-10"
          aria-labelledby="choose-type-title"
        >
          <div
            className="flex justify-center mb-4"
            aria-hidden="true"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-3xl sm:text-4xl">🎱</span>
            </div>
          </div>

          <h1
            id="choose-type-title"
            className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 px-4"
          >
            เลือกประเภทโต๊ะที่ต้องการจอง
          </h1>

          <p className="text-gray-500 text-sm sm:text-base">
            เลือกโต๊ะที่คุณต้องการและทำการจองได้ทันที
          </p>
        </section>

        {/* ---------- Section: Category Cards ---------- */}
        <section
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12"
          aria-label="ประเภทโต๊ะให้จอง"
        >
          {categories.map((cat) => (
            <article
              key={cat.key}
              className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              {/* Card Header */}
              <header className="bg-blue-600 px-6 py-6 sm:py-8 text-center text-white">
                <div
                  className="text-4xl sm:text-5xl mb-3"
                  aria-hidden="true"
                >
                  {cat.emoji}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold">
                  {cat.label}
                </h2>
              </header>

              {/* Card Body */}
              <div className="px-6 py-8">
                {/* Count */}
                <div className="mb-6 text-center">
                  <p className="text-gray-500 text-xs sm:text-sm">
                    จำนวนโต๊ะในระบบ
                  </p>
                  <div className="mb-4">
                    <span className="text-5xl sm:text-6xl font-bold text-gray-800">
                      {cat.count}
                    </span>
                    <span className="text-xl sm:text-2xl text-gray-500 ml-2">
                      โต๊ะ
                    </span>
                  </div>
                </div>

                {/* Button */}
                <button
                    onClick={() => handleBooking(cat.key)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-4 px-6 rounded-xl transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={`จองโต๊ะแบบ ${cat.label}`}
                >
                  จองโต๊ะ {cat.label}
                </button>
              </div>
            </article>
          ))}
        </section>

        {/* ---------- Section: Login prompt ---------- */}
        {!isLoggedIn && (
          <section
            className="max-w-2xl mx-auto"
            aria-labelledby="login-callout-title"
          >
            <article className="bg-blue-50 border border-blue-200 rounded-2xl p-6 sm:p-8 text-center">
              <div
                className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"
                aria-hidden="true"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>

              <h2
                id="login-callout-title"
                className="text-lg sm:text-xl font-bold text-gray-900 mb-2"
              >
                ต้องการจองโต๊ะ?
              </h2>

              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                กรุณาเข้าสู่ระบบหรือสมัครสมาชิกเพื่อทำการจองโต๊ะ
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push("/login")}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  เข้าสู่ระบบ
                </button>

                <button
                  onClick={() => router.push("/register")}
                  className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50 transition-colors font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  สมัครสมาชิก
                </button>
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
