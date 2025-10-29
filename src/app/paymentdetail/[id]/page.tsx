// app/payments/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// ---------- Types ----------
type PaymentDetail = {
  id: string;
  status: "PENDING" | "PAID" | "CANCELLED" | string;
  amount: number;
  method: "CASH" | "WALLET_BALANCE" | "BANK_TRANSFER" | "QR_PAYMENT" | string;
  createdAt?: string;
  paidAt?: string | null;
};

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = (params?.id as string) ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<PaymentDetail | null>(null);

  const createdAtStr = useMemo(
    () => (payment?.createdAt ? fmtDateTime(payment.createdAt) : "-"),
    [payment?.createdAt]
  );
  const paidAtStr = useMemo(
    () => (payment?.paidAt ? fmtDateTime(payment.paidAt) : "-"),
    [payment?.paidAt]
  );

  useEffect(() => {
    let cancel = false;

    const load = async () => {
      if (!paymentId) {
        setError("ไม่พบหมายเลขการชำระเงิน (paymentId)");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      try {
        // 1) พยายามเรียกเส้น detail โดยตรง
        const res = await fetch(
          `http://localhost:3001/api/v1/payment/authorized/payments/${paymentId}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        ).catch(() => null);

        if (res && res.ok) {
          const data = await safeJSON(res);
          const p =
            normalizeFromCreateOrDetail(data?.data) ||
            normalizeFromDetail(data);
          if (!cancel) setPayment(p);
        } else {
          // 2) fallback: ดึงจาก /my แล้วหา id ตรงกัน
          const resMy = await fetch(
            `http://localhost:3001/api/v1/payment/authorized/my`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
          const dataMy = await safeJSON(resMy);

          if (!resMy.ok) {
            if (!cancel)
              setError(
                dataMy?.message || `โหลดข้อมูลไม่สำเร็จ (HTTP ${resMy.status})`
              );
          } else {
            const found = (dataMy?.data as any[] | undefined)?.find(
              (x) => x?.id === paymentId
            );
            if (!cancel) setPayment(normalizeFromMy(found));
          }
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    load();
    return () => {
      cancel = true;
    };
  }, [paymentId]);

  // --- UI ---
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
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            กลับ
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copyText(paymentId)}
              className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
            >
              คัดลอกเลขที่ชำระเงิน
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
            >
              พิมพ์ใบเสร็จ
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">รายละเอียดการชำระเงิน</h1>
        <p className="text-gray-500 mb-6">
          หมายเลขการชำระเงิน: <span className="font-medium">{paymentId}</span>
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Status */}
        <div className="mb-6">
          <StatusBadge status={payment?.status} />
        </div>

        {/* Amount & Method */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <InfoCard label="ยอดชำระ" value={fmtTHB(payment?.amount ?? 0)} />
          <InfoCard label="วิธีชำระ" value={mapMethodTH(payment?.method)} />
          <InfoCard label="วันที่สร้างรายการ" value={createdAtStr} />
          <InfoCard label="วันที่ชำระ" value={paidAtStr} />
        </div>

        {/* Next Actions */}
        <div className="flex">
          <button
            onClick={() => router.push("/reservationlist")}
            className="px-4 py-3 rounded-xl bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200"
          >
            กลับไปหน้ารายละเอียดการจอง
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Components ----------
function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-base font-medium">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const map = {
    PAID: { text: "ชำระแล้ว", cls: "bg-green-50 text-green-700 border-green-200" },
    PENDING: { text: "รอดำเนินการ", cls: "bg-yellow-50 text-yellow-800 border-yellow-200" },
    CANCELLED: { text: "ยกเลิก", cls: "bg-gray-50 text-gray-600 border-gray-200" },
  } as const;

  const conf =
    (status && (map as any)[status]) || {
      text: status ?? "ไม่ทราบสถานะ",
      cls: "bg-gray-50 text-gray-600 border-gray-200",
    };

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm border ${conf.cls}`}>
      <Dot /> {conf.text}
    </span>
  );
}

function Dot() {
  return <span className="inline-block w-2 h-2 rounded-full bg-current" />;
}

// ---------- Utils ----------
async function safeJSON(res: Response | null) {
  try {
    if (!res) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function copyText(text: string) {
  if (!text) return;
  navigator.clipboard?.writeText(text).catch(() => {});
}

function fmtTHB(n: number) {
  try {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n);
  } catch {
    return `${n} ฿`;
  }
}

function fmtDateTime(i: string) {
  const d = new Date(i);
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(d);
}

function mapMethodTH(method?: string) {
  switch (method) {
    case "WALLET_BALANCE":
      return "กระเป๋าเงิน (Wallet)";
    case "CASH":
      return "เงินสด";
    case "BANK_TRANSFER":
      return "โอนผ่านธนาคาร";
    case "QR_PAYMENT":
      return "ชำระผ่าน QR";
    default:
      return method || "-";
  }
}


function normalizeFromCreateOrDetail(data: any): PaymentDetail | null {
  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    amount: Number(data.amount ?? 0),
    method: data.method,
    createdAt: data.createdAt ?? undefined,
    paidAt: data.paidAt ?? null,
  };
}

function normalizeFromDetail(resp: any): PaymentDetail | null {
  const d = resp?.data ?? resp;
  if (!d) return null;
  return normalizeFromCreateOrDetail(d);
}

function normalizeFromMy(item: any): PaymentDetail | null {
  if (!item) return null;
  return {
    id: item.id,
    status: item.status,
    amount: Number(item.amount ?? 0),
    method: item.method,
    createdAt: item.createdAt,
    paidAt: item.paidAt,
  };
}

