// app/selectpayment/page.tsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type PayMethod = "WALLET_BALANCE" | "CASH" | "BANK_TRANSFER" | "QR_PAYMENT";

type Reservation = {
  id: string;
  duration: number;
  table?: { number: number; type: string; hourlyRate: number };
  amount?: number;
};

// --------- ENV BASE ---------
const API = process.env.NEXT_PUBLIC_API_DOMAIN as string;

// ---------- ชั้นใน (ใช้ hooks ได้) ----------
function SelectPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reservationId = searchParams.get("reservationId") || "";

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // โหลดข้อมูลการจอง + กระเป๋า
  useEffect(() => {
    let cancel = false;

    const loadAll = async () => {
      setLoading(true);
      setError("");

      try {
        if (!reservationId) {
          setError("ไม่พบ reservationId");
          return;
        }

        const token = localStorage.getItem("token");

        // โหลดข้อมูลการจอง
        const resResv = await fetch(
          `${API}/api/v1/reservation/authorized/reservations/${reservationId}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        const resvData = await safeJSON(resResv);
        if (!resResv.ok) {
          setError(resvData?.message || `โหลดข้อมูลการจองไม่สำเร็จ (HTTP ${resResv.status})`);
          return;
        }
        const resv = resvData?.data as Reservation | undefined;
        if (!resv) {
          setError("ไม่พบข้อมูลการจอง");
          return;
        }
        if (!cancel) setReservation(resv);

        // โหลดข้อมูลกระเป๋า
        const resWallet = await fetch(`${API}/api/v1/auth/authorized/me`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const walletData = await safeJSON(resWallet);

        const balance =
          resWallet.ok
            ? walletData?.data?.balance ??
              walletData?.balance ??
              walletData?.data?.user?.balance ??
              null
            : null;

        if (!cancel)
          setWalletBalance(typeof balance === "number" ? balance : null);
      } catch (e: any) {
        if (!cancel) setError(e?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    loadAll();
    return () => {
      cancel = true;
    };
  }, [reservationId]);

  // คำนวณยอดรวม
  const total = (() => {
    if (!reservation) return 0;
    if (typeof reservation.amount === "number") return reservation.amount;
    const rate = reservation.table?.hourlyRate ?? 0;
    const hrs = reservation.duration ?? 1;
    return rate * hrs;
  })();

  // ยืนยันการจ่าย
  const handlePay = async () => {
    setError("");

    if (!reservationId) {
      setError("ไม่พบ reservationId");
      return;
    }
    if (!method) {
      setError("กรุณาเลือกวิธีชำระเงิน");
      return;
    }

    // จ่ายด้วย wallet
    if (method === "WALLET_BALANCE") {
      if (walletBalance === null) {
        setError("ยังไม่สามารถตรวจสอบยอดคงเหลือในกระเป๋าได้");
        return;
      }
      if (walletBalance < total) {
        setError("ยอดเงินในกระเป๋าไม่เพียงพอ กรุณาเติมเงินก่อนทำรายการ");
        return;
      }
      router.push(`/walletpay?reservationId=${reservationId}`);
      return;
    }

    // จ่ายเงินสด
    if (method === "CASH") {
      const cashInfo = {
        method: "CASH",
        status: "PENDING",
        amount: total,
      };
      localStorage.setItem(`cashpay:${reservationId}`, JSON.stringify(cashInfo));
      router.push(`/cashpay?reservationId=${reservationId}`);
      return;
    }

    // วิธีอื่นยังไม่รองรับ
    setError("วิธีชำระเงินนี้ยังไม่รองรับในระบบตอนนี้");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </main>
    );
  }

  // ---------- UI ----------
  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 hover:translate-x-[-8px] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium text-sm">กลับ</span>
          </button>
        </header>

        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">เลือกวิธีชำระเงิน</h1>
          <p className="text-gray-500 text-sm mb-4">
            หมายเลขการจอง: <span className="font-medium">{reservationId || "-"}</span>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          <section className="bg-blue-50 rounded-xl p-4 mb-6">
            <RowInline
              label="โต๊ะ"
              value={
                reservation?.table
                  ? `#${reservation.table.number} (${reservation.table.type})`
                  : "-"
              }
            />
            <RowInline
              label="จำนวนชั่วโมง"
              value={reservation?.duration?.toString() ?? "-"}
            />
            <div className="border-t border-blue-200 mt-3 pt-3 flex justify-between text-sm font-semibold">
              <span className="text-gray-700">ยอดที่ต้องชำระ</span>
              <span className="text-blue-600">{total} ฿</span>
            </div>
            {walletBalance !== null && (
              <div className="text-xs text-gray-600 mt-2">
                💰 ยอดในกระเป๋า: <span className="font-semibold">{walletBalance} ฿</span>
              </div>
            )}
          </section>

          <section className="mb-6 space-y-3">
            {[
              {
                key: "WALLET_BALANCE",
                label: "กระเป๋าเงิน (เงินในเว็บ)",
                desc: "ตัดยอดจาก Wallet ทันที",
              },
              {
                key: "CASH",
                label: "ชำระเงินสด (สำหรับจ่ายหน้าร้าน)",
                desc: "พนักงานจะรับเงินและกดยืนยันให้",
              },
            ].map((opt) => (
              <label
                key={opt.key}
                className={`block p-4 rounded-xl border cursor-pointer transition-colors ${
                  method === (opt.key as PayMethod)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    className="mt-1"
                    name="paymethod"
                    value={opt.key}
                    checked={method === (opt.key as PayMethod)}
                    onChange={() => setMethod(opt.key as PayMethod)}
                  />
                  <div>
                    <div className="font-medium text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-600">{opt.desc}</div>
                  </div>
                </div>
              </label>
            ))}
          </section>

          <section>
            <button
              onClick={handlePay}
              disabled={!method || submitting}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${
                method && !submitting
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {submitting ? "กำลังชำระเงิน..." : "ยืนยันการชำระเงิน"}
            </button>
            <p className="text-xs text-gray-500 mt-4">
              * ถ้าเลือก “กระเป๋าเงิน” แล้วเงินไม่พอ ระบบจะแจ้งเตือนให้เติมเงินก่อน
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}

// ---------- ชั้นนอก Suspense ----------
export default function SelectPaymentPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <SelectPaymentContent />
    </Suspense>
  );
}

// ---------- utilities ----------
async function safeJSON(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function RowInline({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-700">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
