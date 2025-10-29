// app/selectpayment/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type PayMethod = "WALLET_BALANCE" | "CASH" | "BANK_TRANSFER" | "QR_PAYMENT";

type Reservation = {
    id: string;
    duration: number;
    table?: { number: number; type: string; hourlyRate: number };
    amount?: number;
};

export default function SelectPaymentPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const reservationId = searchParams.get("reservationId") || "";

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [method, setMethod] = useState<PayMethod | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // โหลดข้อมูลการจอง + ยอดกระเป๋า
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

                // 1) โหลดข้อมูลการจอง
                const resResv = await fetch(
                    `http://localhost:3001/api/v1/reservation/authorized/reservations/${reservationId}`,
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                );
                const resvData = await safeJSON(resResv);
                if (!resResv.ok) {
                    setError(
                        resvData?.message ||
                        `โหลดข้อมูลการจองไม่สำเร็จ (HTTP ${resResv.status})`
                    );
                    return;
                }
                const resv = resvData?.data as Reservation | undefined;
                if (!resv) {
                    setError("ไม่พบข้อมูลการจอง");
                    return;
                }
                if (!cancel) setReservation(resv);

                // 2) ✅ โหลดยอด wallet จาก /auth/authorized/me
                const resWallet = await fetch(
                    "http://localhost:3001/api/v1/auth/authorized/me",
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                );
                const walletData = await safeJSON(resWallet);

                // ✅ รองรับหลายรูปแบบของ response
                const balance = resWallet.ok
                    ? walletData?.data?.balance ??
                    walletData?.balance ??
                    walletData?.data?.user?.balance ??
                    null
                    : null;

                if (!cancel)
                    setWalletBalance(typeof balance === "number" ? balance : null);
            } catch (e: any) {
                if (!cancel)
                    setError(e?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
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

    // กดยืนยันชำระเงิน
    const handlePay = async () => {
        if (!reservationId) return setError("ไม่พบ reservationId");
        if (!method) return setError("กรุณาเลือกวิธีชำระเงิน");

        // ✅ ถ้าเลือก Wallet ให้ตรวจสอบยอดก่อน
        if (method === "WALLET_BALANCE") {
            if (walletBalance === null) {
                setError("ยังไม่สามารถตรวจสอบยอดคงเหลือในกระเป๋าได้");
                return;
            }
            if (walletBalance < total) {
                setError("ยอดเงินในกระเป๋าไม่เพียงพอ กรุณาเติมเงินก่อนทำรายการ");
                return;
            }

            // ไปหน้าชำระเงินด้วย walletpay
            router.push(`/walletpay?reservationId=${reservationId}`);
            return;
        }

        // วิธีอื่น: ยิง API ชำระเงินทันที
        setSubmitting(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                "http://localhost:3001/api/v1/payment/authorized/payments",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ reservationId, method }),
                }
            );
            const data = await res.json();
            if (!res.ok) {
                setError(data?.message || "ชำระเงินไม่สำเร็จ");
                return;
            }
            router.push("/snook");
        } catch (e: any) {
            setError(e?.message || "เกิดข้อผิดพลาดในการชำระเงิน");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    // ---------- UI ----------
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-6">
                <button
                    onClick={() => router.back()}
                    className="text-gray-600 hover:text-gray-900 mb-6 flex items-center gap-2"
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
                    กลับ
                </button>

                <h1 className="text-2xl font-bold mb-2">เลือกวิธีชำระเงิน</h1>
                <p className="text-gray-500 mb-6">
                    หมายเลขการจอง:{" "}
                    <span className="font-medium">{reservationId || "-"}</span>
                </p>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">
                        {error}
                    </div>
                )}

                {/* สรุปยอด */}
                <div className="bg-blue-50 rounded-xl p-4 mb-6">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-700">โต๊ะ</span>
                        <span className="font-medium">
                            {reservation?.table
                                ? `#${reservation.table.number} (${reservation.table.type})`
                                : "-"}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-700">จำนวนชั่วโมง</span>
                        <span className="font-medium">{reservation?.duration ?? "-"}</span>
                    </div>
                    <div className="border-t border-blue-200 mt-2 pt-2 flex justify-between font-semibold">
                        <span>ยอดที่ต้องชำระ</span>
                        <span className="text-blue-600">{total} ฿</span>
                    </div>

                    {walletBalance !== null && (
                        <div className="text-xs text-gray-600 mt-2">
                            💰 ยอดในกระเป๋า:{" "}
                            <span className="font-semibold">{walletBalance} ฿</span>
                        </div>
                    )}
                </div>

                {/* วิธีชำระ */}
                <div className="space-y-3 mb-6">
                    {[
                        { key: "WALLET_BALANCE", label: "กระเป๋าเงิน (Wallet)" },
                        { key: "QR_PAYMENT", label: "QR พร้อมเพย์" },
                        { key: "BANK_TRANSFER", label: "โอนผ่านธนาคาร" },
                        { key: "CASH", label: "ชำระเงินสดหน้าร้าน" },
                    ].map((opt) => (
                        <label
                            key={opt.key}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${method === (opt.key as PayMethod)
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 bg-white"
                                }`}
                        >
                            <input
                                type="radio"
                                name="paymethod"
                                value={opt.key}
                                checked={method === (opt.key as PayMethod)}
                                onChange={() => setMethod(opt.key as PayMethod)}
                            />
                            <span className="font-medium">{opt.label}</span>
                        </label>
                    ))}
                </div>

                <button
                    onClick={handlePay}
                    disabled={!method || submitting}
                    className={`w-full py-3 rounded-xl font-semibold transition-all ${method && !submitting
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                >
                    {submitting ? "กำลังชำระเงิน..." : "ยืนยันการชำระเงิน"}
                </button>

                <p className="text-xs text-gray-500 mt-4">
                    * ถ้าเลือก “กระเป๋าเงิน” แล้วเงินไม่พอ ระบบจะแจ้งเตือนให้เติมเงินก่อน
                </p>
            </div>
        </div>
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
