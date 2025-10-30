"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TableType = "POOL" | "SNOOKER";

export default function SmartroomLibrary() {
  const router = useRouter();

  // ---------- auth / wallet ----------
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // ---------- table counts ----------
  const [poolCount, setPoolCount] = useState(0);
  const [snookerCount, setSnookerCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);

  // ---------- base API (จาก .env) ----------
  // ใช้ NEXT_PUBLIC_API_DOMAIN ตามที่คุณกำหนดใน .env
  const API = process.env.NEXT_PUBLIC_API_DOMAIN as string;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const loggedIn = !!token;
    setIsLoggedIn(loggedIn);

    // 1) โหลดจำนวนโต๊ะ (public)
    fetch(`${API}/api/v1/table/guest/tables`)
      .then((res) => res.json())
      .then((result) => {
        const tables = result?.data || [];
        setPoolCount(tables.filter((t: any) => t.type === "POOL").length);
        setSnookerCount(
          tables.filter((t: any) => t.type === "SNOOKER").length
        );
        setTableLoading(false);
      })
      .catch((err) => {
        console.error("Fetch Error:", err);
        setTimeout(() => setTableLoading(false), 1200);
      });

    // 2) ถ้าล็อกอิน ดึงข้อมูล user/me เพื่อเอายอด balance
    if (loggedIn && token) {
      fetch(`${API}/api/v1/auth/authorized/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((payload) => {
          const bal = payload?.data?.balance;
          if (typeof bal === "number") {
            setWalletBalance(bal);
          } else {
            setWalletBalance(null);
          }
        })
        .catch((err) => {
          console.error("Fetch /me Error:", err);
          setWalletBalance(null);
        });
    } else {
      setWalletBalance(null);
    }
  }, [API]);

  const campuses: Array<{
    key: TableType;
    name: string;
    rooms: number;
    emoji: string;
  }> = [
    { key: "SNOOKER", name: "Snook", rooms: snookerCount, emoji: "🎱" },
    { key: "POOL", name: "Pool", rooms: poolCount, emoji: "🎯" },
  ];

  function handleBooking(type: TableType) {
    if (!isLoggedIn) {
      alert("กรุณาเข้าสู่ระบบก่อนทำการจอง");
      router.push("/login");
      return;
    }
    router.push(`/booking/${type.toLowerCase()}`);
  }

  // ---------- Loading state ----------
  if (tableLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex justify-between items-center">
              <h1
                className="text-2xl sm:text-3xl font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => router.push("/")}
              >
                Snook & Pool
              </h1>

              <nav
                aria-label="เมนูหลัก (กำลังโหลด)"
                className="flex gap-3 items-center"
              >
                <div className="h-10 w-24 rounded-xl bg-gray-200 animate-pulse" />
                <div className="h-10 w-28 rounded-xl bg-gray-200 animate-pulse" />
              </nav>
            </div>
          </div>
        </header>

        <main
          role="main"
          className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12"
        >
          <section
            aria-labelledby="loading-section-title"
            className="text-center mb-8 sm:mb-10"
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full animate-pulse" />
            </div>

            <h2
              id="loading-section-title"
              className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2"
            >
              เลือกประเภทโต๊ะที่ต้องการจอง
            </h2>

            <p className="text-gray-500 text-sm sm:text-base">
              กำลังโหลดข้อมูลโต๊ะ…
            </p>
          </section>

          <section
            aria-label="รายการประเภทโต๊ะ (กำลังโหลด)"
            className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12"
          >
            {[0, 1].map((i) => (
              <article
                key={i}
                aria-busy="true"
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                <header className="bg-gray-200 px-6 py-8 text-center animate-pulse">
                  <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-gray-300" />
                  <div className="h-6 w-24 mx-auto rounded bg-gray-300" />
                </header>

                <div className="px-6 py-8">
                  <div className="mb-6 text-center">
                    <div className="h-16 w-32 mx-auto rounded bg-gray-200 animate-pulse" />
                  </div>
                  <div className="h-12 w-full rounded-xl bg-gray-200 animate-pulse" />
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    );
  }

  // ---------- Normal UI ----------
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1
              className="text-2xl sm:text-3xl font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => router.push("/")}
            >
              Snook & Pool
            </h1>

            <nav
              aria-label="เมนูหลัก"
              className="flex flex-col sm:flex-row gap-3 items-start sm:items-center"
            >
              {isLoggedIn ? (
                <>
                  <section
                    aria-label="ยอดเงินในวอลเล็ต"
                    className="flex items-center gap-2 bg-gray-100 text-gray-800 rounded-xl px-4 py-2 shadow-sm border border-gray-200"
                  >
                    <div className="text-xl leading-none" aria-hidden="true">
                      💰
                    </div>

                    <div className="flex flex-col leading-tight">
                      <span className="text-[0.7rem] text-gray-500 font-medium uppercase tracking-wide">
                        Wallet
                      </span>

                      <span className="text-sm font-bold text-gray-900">
                        {walletBalance !== null
                          ? `฿${walletBalance.toLocaleString("en-US")}`
                          : "…"}
                      </span>
                    </div>

                    <button
                      onClick={() => router.push(`/topup`)}
                      className="ml-2 text-xs font-semibold bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 hover:scale-105 transition-all"
                    >
                      เติม
                    </button>
                  </section>

                  <button
                    onClick={() => router.push("/reservationlist")}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="ดูการจองของฉัน"
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
                        d="M3 7h18M3 12h18M3 17h18"
                      />
                    </svg>
                    ดูการจองของฉัน
                  </button>

                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      setIsLoggedIn(false);
                      setWalletBalance(null);
                      router.push("/logout");
                    }}
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-red-600 text-white text-sm sm:text-base rounded-xl hover:bg-red-700 hover:scale-105 transition-all font-semibold shadow-sm duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    aria-label="ออกจากระบบ"
                  >
                    ออกจากระบบ
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push("/login")}
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white text-sm sm:text-base rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="เข้าสู่ระบบ"
                  >
                    เข้าสู่ระบบ
                  </button>

                  <button
                    onClick={() => router.push("/register")}
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-green-600 text-white text-sm sm:text-base rounded-xl hover:bg-green-700 transition-colors font-semibold shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                    aria-label="สมัครสมาชิก"
                  >
                    สมัครสมาชิก
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main
        id="main"
        role="main"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12"
      >
        <section
          aria-labelledby="choose-type-title"
          className="text-center mb-8 sm:mb-10"
        >
          <div className="flex justify-center mb-4" aria-hidden="true">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-3xl sm:text-4xl">🎱</span>
            </div>
          </div>

          <h2
            id="choose-type-title"
            className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 px-4"
          >
            เลือกประเภทโต๊ะที่ต้องการจอง
          </h2>

          <p className="text-gray-500 text-sm sm:text-base">
            เลือกโต๊ะที่คุณต้องการและทำการจองได้ทันที
          </p>
        </section>

        <section
          aria-label="รายการประเภทโต๊ะ"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12"
        >
          {[
            {
              key: "SNOOKER" as const,
              name: "Snook",
              rooms: snookerCount,
              emoji: "🎱",
            },
            {
              key: "POOL" as const,
              name: "Pool",
              rooms: poolCount,
              emoji: "🎯",
            },
          ].map((campus) => (
            <article
              key={campus.key}
              className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
              aria-labelledby={`card-${campus.key}`}
            >
              <header className="bg-blue-600 px-6 py-6 sm:py-8 text-center">
                <div
                  className="text-4xl sm:text-5xl mb-3"
                  aria-hidden="true"
                >
                  {campus.emoji}
                </div>

                <h3
                  id={`card-${campus.key}`}
                  className="text-xl sm:text-2xl font-bold text-white"
                >
                  {campus.name}
                </h3>
              </header>

              <div className="px-6 py-8">
                <section
                  aria-label={`จำนวนโต๊ะประเภท ${campus.name} ที่พร้อมให้จอง`}
                  className="mb-6 text-center"
                >
                  <div className="mb-1">
                    <span className="text-5xl sm:text-6xl font-bold text-gray-800">
                      {campus.rooms}
                    </span>
                    <span className="text-xl sm:text-2xl text-gray-500 ml-2">
                      โต๊ะ
                    </span>
                  </div>
                </section>

                <button
                  onClick={() => handleBooking(campus.key)}
                  className="w-full bg-blue-600 hover:bg-blue-700 hover:scale-105 text-white font-semibold py-3 sm:py-4 px-6 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label={`จองโต๊ะประเภท ${campus.name}`}
                >
                  จองโต๊ะ {campus.name}
                </button>
              </div>
            </article>
          ))}
        </section>

        {!isLoggedIn && (
          <aside
            aria-labelledby="login-callout"
            role="note"
            className="max-w-2xl mx-auto"
          >
            <section className="bg-blue-50 border border-blue-200 rounded-2xl p-6 sm:p-8 text-center">
              <div
                className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"
                aria-hidden="true"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>

              <h3
                id="login-callout"
                className="text-lg sm:text-xl font-bold text-gray-900 mb-2"
              >
                ต้องการจองโต๊ะ?
              </h3>

              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                กรุณาเข้าสู่ระบบหรือสมัครสมาชิกเพื่อทำการจองโต๊ะ
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push("/login")}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
            </section>
          </aside>
        )}
      </main>
    </div>
  );
}
