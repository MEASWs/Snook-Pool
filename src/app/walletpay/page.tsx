// app/walletpay/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Reservation = {
    id: string;
    duration: number;
    startTime?: string;
    endTime?: string;
    table?: { number: number; type: string; hourlyRate: number };
    amount?: number;
};

type Promotion = {
    id: string;
    name: string;
    description?: string;
};

type PreviewResult = {
    subtotal: number;
    discount: number;
    total: number;
};

export default function WalletPayPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const reservationId = searchParams.get("reservationId") ?? "";

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);

    // โปรจากผล apply (ไม่มีปุ่มยกเลิกโปรแล้ว)
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [preview, setPreview] = useState<PreviewResult | null>(null);

    const [loading, setLoading] = useState(true);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const subtotalFallback = useMemo(() => {
        if (!reservation) return 0;
        if (typeof reservation.amount === "number") return reservation.amount;
        const rate = reservation.table?.hourlyRate ?? 0;
        const hrs = reservation.duration ?? 1;
        return rate * hrs;
    }, [reservation]);

    // โหลด reservation + wallet balance
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

                // 1) reservation
                const resResv = await fetch(
                    `http://localhost:3001/api/v1/reservation/authorized/reservations/${reservationId}`,
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
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

                // 2) wallet balance
                const resWallet = await fetch("http://localhost:3001/api/v1/wallet/authorized/balance", {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const walletData = await safeJSON(resWallet);
                const balance = resWallet.ok ? (walletData?.data?.balance ?? walletData?.balance ?? null) : null;
                if (!cancel) setWalletBalance(typeof balance === "number" ? balance : null);
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

    // พรีวิวส่วนลดด้วย /promotion/authorized/apply (ไม่มีตัวเลือกปิดโปร)
    useEffect(() => {
        let cancel = false;

        const loadPreviewViaApply = async () => {
            if (!reservationId) return;
            setLoadingPreview(true);
            setError("");

            try {
                const token = localStorage.getItem("token");
                const res = await fetch("http://localhost:3001/api/v1/promotion/authorized/apply", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ reservationId, method: "WALLET_BALANCE" }),
                });
                const data = await safeJSON(res);

                if (res.ok && data) {
                    const discountAmount = Number(data.discountAmount ?? 0);
                    const finalAmount = Number(data.finalAmount ?? subtotalFallback);
                    const subtotal = Number((finalAmount + discountAmount).toFixed(2));

                    if (!cancel) {
                        setPreview({
                            subtotal: subtotal || subtotalFallback,
                            discount: discountAmount,
                            total: finalAmount,
                        });

                        // มีส่วนลด → แสดงว่า “จะถูกใช้ให้อัตโนมัติ”
                        if (discountAmount > 0) {
                            const name =
                                data.rewardType === "FREE_HOUR"
                                    ? "ฟรี 1 ชั่วโมง (เฉพาะชำระด้วย Wallet)"
                                    : "ส่วนลดโปรโมชัน";
                            const desc = data.message || "มีส่วนลดจากโปรโมชันที่ใช้ได้";
                            setPromotions([{ id: "APPLY_RESULT", name, description: desc }]);
                        } else {
                            setPromotions([]);
                        }
                    }
                } else {
                    if (!cancel) {
                        setPreview({
                            subtotal: subtotalFallback,
                            discount: 0,
                            total: subtotalFallback,
                        });
                        setPromotions([]);
                    }
                }
            } catch {
                if (!cancel) {
                    setPreview({
                        subtotal: subtotalFallback,
                        discount: 0,
                        total: subtotalFallback,
                    });
                    setPromotions([]);
                }
            } finally {
                if (!cancel) setLoadingPreview(false);
            }
        };

        if (reservation) loadPreviewViaApply();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reservationId, reservation]);

    const total = preview?.total ?? subtotalFallback;
    const canPay = typeof walletBalance === "number" ? walletBalance >= total : true;

    const handleConfirmPay = async () => {
        if (!reservationId) return setError("ไม่พบ reservationId");
        setSubmitting(true);
        setError("");

        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:3001/api/v1/payment/authorized/payments", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    reservationId,
                    method: "WALLET_BALANCE",
                }),
            });

            const data = await safeJSON(res);
            if (!res.ok) {
                setError(data?.message || `ชำระเงินไม่สำเร็จ (HTTP ${res.status})`);
                return;
            }

            const paymentId = data?.data?.id as string | undefined;
            if (!paymentId) {
                setError("ไม่พบหมายเลขการชำระเงินจากระบบ");
                return;
            }

            router.replace(`/paymentdetail/${paymentId}`);
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

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-6">
                <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    กลับ
                </button>

                <h1 className="text-2xl font-bold mb-2">ชำระเงินด้วยกระเป๋าเงิน (Wallet)</h1>
                <p className="text-gray-500 mb-6">
                    หมายเลขการจอง: <span className="font-medium">{reservationId}</span>
                </p>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">{error}</div>
                )}

                {/* สรุปการจอง */}
                <div className="bg-blue-50 rounded-xl p-4 mb-6">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-700">โต๊ะ</span>
                        <span className="font-medium">
                            {reservation?.table ? `#${reservation.table.number} (${reservation.table.type})` : "-"}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-700">จำนวนชั่วโมง</span>
                        <span className="font-medium">{reservation?.duration ?? "-"}</span>
                    </div>
                </div>

                {/* โปรโมชัน (แสดงผลอย่างเดียว ใช้อัตโนมัติหากมี) */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-gray-700">🎁 โปรโมชัน/ส่วนลด</label>
                        {loadingPreview && <span className="text-xs text-gray-500">กำลังคำนวณส่วนลด…</span>}
                    </div>

                    {promotions.length === 0 ? (
                        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-3">
                            ยังไม่มีโปรโมชันที่ใช้ได้
                        </div>
                    ) : (
                        <div className="p-3 rounded-xl border border-blue-500 bg-blue-50">
                            <div className="font-medium">{promotions[0].name}</div>
                            {promotions[0].description && (
                                <div className="text-xs text-gray-600 mt-0.5">{promotions[0].description}</div>
                            )}
                            <div className="mt-1 text-xs text-blue-700">ระบบจะใช้โปรโมชันนี้ให้อัตโนมัติ</div>
                        </div>
                    )}
                </div>

                {/* Breakdown */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                    <Row label="ยอดก่อนส่วนลด" value={preview?.subtotal ?? subtotalFallback} />
                    <Row label="ส่วนลดโปรโมชัน" value={-(preview?.discount ?? 0)} />
                    <div className="border-t border-gray-200 my-2" />
                    <Row label="ยอดที่ต้องชำระ" value={preview?.total ?? subtotalFallback} bold />

                    <div className="border-t border-gray-200 my-2" />
                    <Row
                        label="ยอดคงเหลือในกระเป๋า"
                        value={walletBalance ?? NaN}
                        hint={walletBalance === null ? "— กำลังโหลด/ยังไม่รองรับ endpoint" : undefined}
                    />

                    {typeof walletBalance === "number" && (
                        <Row
                            label="คงเหลือหลังชำระ"
                            value={(walletBalance ?? 0) - (preview?.total ?? subtotalFallback)}
                            muted={(walletBalance ?? 0) - (preview?.total ?? subtotalFallback) < 0}
                        />
                    )}
                </div>

                {!canPay && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-yellow-800 text-sm mb-4">
                        ยอดเงินในกระเป๋าไม่เพียงพอ กรุณาเติมเงินก่อนทำรายการ
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={() => router.push(`/topup?return=/walletpay?reservationId=${reservationId}`)}
                        className="px-4 py-3 rounded-xl bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200"
                        type="button"
                    >
                        เติมเงิน
                    </button>

                    <button
                        onClick={handleConfirmPay}
                        disabled={submitting || !reservationId || (preview?.total ?? subtotalFallback) <= 0 || !canPay}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${!submitting && canPay ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                    >
                        {submitting ? "กำลังชำระเงิน..." : "ยืนยันชำระด้วย Wallet"}
                    </button>
                </div>
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

function Row({
    label,
    value,
    bold,
    muted,
    hint,
}: {
    label: string;
    value: number;
    bold?: boolean;
    muted?: boolean;
    hint?: string;
}) {
    const show = Number.isFinite(value) ? (value as number) : NaN;
    return (
        <div className={`flex justify-between text-sm ${bold ? "font-semibold" : ""} ${muted ? "text-red-600" : ""}`}>
            <span className="text-gray-700">{label}</span>
            <span className={`${bold ? "text-gray-900" : "text-gray-800"}`}>
                {Number.isFinite(show) ? `${show} ฿` : hint ?? "-"}
            </span>
        </div>
    );
}
