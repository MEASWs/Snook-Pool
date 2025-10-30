"use client";
export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ---------- ENV BASE ----------
const API = process.env.NEXT_PUBLIC_API_DOMAIN as string;

// ---------- Types ----------
type TableType = "SNOOKER" | "POOL";
type ReservationStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
type PaymentMethod = "CASH" | "WALLET_BALANCE" | "BANK_TRANSFER" | "QR_PAYMENT";
type PaymentStatus = "PENDING" | "PAID" | "CANCELLED";

type Table = { id: string; number: number; type: TableType; hourlyRate: number; };
type Payment = { id: string; amount: number; method: PaymentMethod; status: PaymentStatus; paidAt: string | null; };
type Reservation = {
  id: string;
  status: ReservationStatus;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  totalPrice: number | null;
  table: Table | null;
  lastPayment: Payment | null;
};

// ---------- Constant maps ----------
const STATUS_TEXT: Record<ReservationStatus, string> = {
  PENDING: "รอดำเนินการ",
  CONFIRMED: "ยืนยันแล้ว",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};
const STATUS_COLOR: Record<ReservationStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};
const METHOD_TEXT: Record<PaymentMethod, string> = {
  CASH: "เงินสด",
  WALLET_BALANCE: "กระเป๋าเงิน",
  BANK_TRANSFER: "โอนเงิน",
  QR_PAYMENT: "QR Code",
};

// ---------- Helpers ----------
function makeLocalNoShift(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
}
function formatThaiTime(iso?: string | null) {
  if (!iso) return "-";
  const fixedDate = makeLocalNoShift(iso);
  if (!fixedDate) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(fixedDate);
}
function getTableTypeIcon(t?: TableType | null) {
  return t === "POOL" ? "🎯" : "🎱";
}
function getCashInfoForReservation(reservationId: string) {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`cashpay:${reservationId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.method === "CASH" &&
      parsed.status === "PENDING" &&
      typeof parsed.amount === "number"
    ) {
      return parsed as { method: "CASH"; status: "PENDING"; amount: number };
    }
  } catch {}
  return null;
}

// ---------------------
// ชั้นใน: ใช้ hooks ได้
// ---------------------
function MyReservationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // โหลดข้อมูล
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`${API}/api/v1/reservation/authorized/reservations`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "โหลดข้อมูลล้มเหลว");

        const list: Reservation[] = Array.isArray(json?.data) ? json.data : [];
        list.forEach((r) => {
          if (r.lastPayment?.status === "PAID")
            localStorage.removeItem(`cashpay:${r.id}`);
        });
        list.sort((a, b) => {
          const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
          const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
          return tb - ta;
        });
        setReservations(list);
      } catch (e: any) {
        setError(e?.message || "โหลดข้อมูลล้มเหลว");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // auto scroll
  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => {
      document.getElementById(`res-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => clearTimeout(t);
  }, [focusId, reservations.length]);

  async function handleCancelReservation(id: string) {
    setCancelError(null);
    setCancellingId(id);
    try {
      const token = localStorage.getItem("token") || "";
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อนยกเลิก");

      const res = await fetch(`${API}/api/v1/reservation/authorized/reservations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "ยกเลิกไม่สำเร็จ");

      const serverData = json?.data;
      setReservations((prev) =>
        prev.map((r) =>
          r.id !== id
            ? r
            : {
                ...r,
                status: serverData?.status ?? "CANCELLED",
                lastPayment: r.lastPayment
                  ? { ...r.lastPayment, status: "CANCELLED" }
                  : r.lastPayment,
              }
        )
      );
      localStorage.removeItem(`cashpay:${id}`);
    } catch (err: any) {
      setCancelError(err?.message || "เกิดข้อผิดพลาดในการยกเลิก");
    } finally {
      setCancellingId(null);
    }
  }

  // ---------- UI ----------
  if (loading)
    return (
      <main className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </main>
    );

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <section className="max-w-7xl mx-auto mb-8">
        {/* Header */}
        <header className="mb-6 text-center">
          <nav className="text-left mb-6">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:-translate-x-2 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">กลับไปหน้าแรก</span>
            </button>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">รายการจองของฉัน</h1>
        </header>

        {(error || cancelError) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-6">
            {error || cancelError}
          </div>
        )}

        {/* ไม่มีรายการ */}
        {reservations.length === 0 ? (
          <section className="text-center py-12">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">ยังไม่มีการจอง</h2>
            <p className="text-gray-500 text-sm mb-6">เริ่มต้นจองโต๊ะเพื่อเล่นเกมของคุณ</p>
            <button
              onClick={() => router.push("/pool")}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm"
            >
              เริ่มจองเลย
            </button>
          </section>
        ) : (
          <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reservations.map((r) => {
              const hasPaid = r.lastPayment?.status === "PAID";
              const canCancel = !hasPaid && r.status !== "CANCELLED";
              return (
                <article key={r.id} id={`res-${r.id}`} className="bg-white rounded-2xl shadow-sm p-6">
                  <header className="flex justify-between mb-2">
                    <div>
                      <h2 className="font-bold text-gray-900">
                        {getTableTypeIcon(r.table?.type)} โต๊ะ {r.table?.number ?? "-"}
                      </h2>
                      <div className="text-sm text-gray-600">
                        {formatThaiTime(r.startTime)} - {formatThaiTime(r.endTime)}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[r.status]}`}
                    >
                      {STATUS_TEXT[r.status]}
                    </span>
                  </header>
                  <p className="text-gray-700 text-sm mb-3">
                    ราคา {r.table?.hourlyRate ?? 0}฿ × {r.duration ?? 0} ={" "}
                    <span className="text-blue-600 font-semibold">{r.totalPrice ?? 0}฿</span>
                  </p>

                  <footer className="space-y-2">
                    <button
                      onClick={() => router.push(`/selectpayment?reservationId=${r.id}`)}
                      disabled={hasPaid}
                      className={`w-full py-2 rounded-xl font-semibold ${
                        hasPaid
                          ? "bg-green-100 text-green-600 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {hasPaid ? "✅ ชำระเงินแล้ว" : "💸 ชำระเงิน"}
                    </button>

                    {canCancel ? (
                      <button
                        onClick={() => handleCancelReservation(r.id)}
                        disabled={cancellingId === r.id}
                        className={`w-full py-2 rounded-xl font-semibold border ${
                          cancellingId === r.id
                            ? "bg-gray-100 text-gray-400"
                            : "bg-white text-red-600 border-red-300 hover:bg-red-50"
                        }`}
                      >
                        {cancellingId === r.id ? "กำลังยกเลิก..." : "ยกเลิกการจอง"}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2 rounded-xl font-semibold bg-gray-50 text-gray-400 border border-gray-200"
                      >
                        ยกเลิกไม่ได้
                      </button>
                    )}
                  </footer>
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
}

// ---------------------
// ชั้นนอก: Suspense Wrapper
// ---------------------
export default function MyReservationsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <MyReservationsContent />
    </Suspense>
  );
}
