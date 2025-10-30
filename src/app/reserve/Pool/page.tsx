"use client";
export const dynamic = "force-dynamic";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Table = {
  id: string;
  number: number;
  type: string;
  hourlyRate: number;
  status: string;
};

type BusySlot = { start: string; end: string };

function ReserveContent() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("tableId");
  const router = useRouter();

  const API = process.env.NEXT_PUBLIC_API_DOMAIN as string;

  const [table, setTable] = useState<Table | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(1);
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const hours = useMemo(() => Array.from({ length: 14 }, (_, i) => i + 9), []);

  useEffect(() => {
    if (!tableId) {
      setError("ลิงก์ไม่ถูกต้อง: ไม่พบ tableId ใน URL");
      setLoading(false);
    }
  }, [tableId]);

  function forceToThaiTZ(iso: string) {
    const [d, t = "00:00:00"] = iso.split("T");
    const hhmmss = (t || "00:00:00").slice(0, 8);
    return `${d}T${hhmmss}+07:00`;
  }

  useEffect(() => {
    if (!tableId) return;
    const safeTableId = tableId;

    async function fetchTable() {
      try {
        const res = await fetch(`${API}/api/v1/table/guest/tables`);
        const data = await res.json();
        const found = data?.data?.find((t: Table) => t.id === safeTableId);
        if (!found) {
          setError("ไม่พบโต๊ะ");
          setTable(null);
        } else {
          setTable(found);
        }
      } catch {
        setError("ไม่สามารถโหลดข้อมูลโต๊ะได้");
      } finally {
        setTimeout(() => setLoading(false), 400);
      }
    }

    fetchTable();
  }, [API, tableId]);

  useEffect(() => {
    if (!tableId || !date) return;
    const safeTableId = tableId;

    async function fetchBusy() {
      try {
        const res = await fetch(
          `${API}/api/v1/reservation/guest/availability?tableId=${encodeURIComponent(
            safeTableId
          )}&date=${encodeURIComponent(date)}`
        );
        const data = await res.json();
        setBusySlots(data?.data?.busy || []);
      } catch {
        setError("โหลดข้อมูลเวลาที่ถูกจองไม่สำเร็จ");
      }
    }

    fetchBusy();
  }, [API, tableId, date]);

  const calculateTotal = () => (table ? table.hourlyRate * duration : 0);

  const isHourAvailable = (hour: number) => {
    const checkStart = new Date(
      `${date}T${String(hour).padStart(2, "0")}:00:00+07:00`
    ).getTime();
    const checkEnd = checkStart + 60 * 60 * 1000;
    return !busySlots.some((b) => {
      const bs = new Date(forceToThaiTZ(b.start)).getTime();
      const be = new Date(forceToThaiTZ(b.end)).getTime();
      return checkStart < be && checkEnd > bs;
    });
  };

  const overDay = useMemo(
    () => startHour !== null && startHour + duration > 23,
    [startHour, duration]
  );

  const hasConflict = useMemo(() => {
    if (startHour === null) return false;
    return Array.from({ length: duration }).some(
      (_, i) => !isHourAvailable(startHour + i)
    );
  }, [startHour, duration, busySlots]);

  const renderHourButtons = () =>
    hours.map((hour) => {
      const overlap = Array.from({ length: duration }).some(
        (_, i) => !isHourAvailable(hour + i)
      );
      const _overDay = hour + duration > 23;
      const disabled = overlap || _overDay;
      const selected =
        startHour !== null && hour >= startHour && hour < startHour + duration;

      return (
        <button
          key={hour}
          disabled={disabled}
          onClick={() => {
            setStartHour(hour);
            setError("");
          }}
          className={`py-3 px-2 rounded-xl font-semibold text-sm transition-all ${
            selected
              ? "bg-blue-600 text-white shadow-md"
              : disabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white border-2 border-gray-200 text-gray-700 active:bg-gray-50"
          }`}
        >
          <div className="text-base">{String(hour).padStart(2, "0")}:00</div>
          {selected && startHour === hour && duration > 1 && (
            <div className="text-xs mt-0.5">
              ถึง {String(hour + duration - 1).padStart(2, "0")}:59
            </div>
          )}
        </button>
      );
    });

  const handleReserve = async () => {
    if (!tableId || startHour === null) {
      setError("กรุณาเลือกเวลาเริ่มต้น");
      return;
    }
    if (hasConflict || overDay) {
      setError("เวลาที่เลือกทับกับช่วงเวลาที่ถูกจองแล้ว หรือเกินเวลาทำการ");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("กรุณาเข้าสู่ระบบก่อนทำการจอง");
      return;
    }

    const safeTableId = tableId;
    setSubmitting(true);
    setError("");

    const startDate = new Date(`${date}T${String(startHour).padStart(2, "0")}:00:00`);
    const startISO = new Date(
      startDate.getTime() - startDate.getTimezoneOffset() * 60000
    ).toISOString();

    try {
      const res = await fetch(`${API}/api/v1/reservation/authorized/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tableId: safeTableId, startTime: startISO, duration }),
      });
      const data = await res.json();

      if (res.ok) {
        const id = data?.data?.id || data?.id || data?.reservationId || "";
        alert("จองโต๊ะสำเร็จ! 🎉");
        router.push(`/reservationlist${id ? `?focus=${id}` : ""}`);
      } else {
        setError(data?.message || "เกิดข้อผิดพลาด");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการจอง");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );

  if (!table)
    return (
      <div className="min-h-screen bg-gray-50 py-4 px-4">
        <main className="max-w-3xl mx-auto text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">ไม่พบโต๊ะ</h1>
          <p className="text-gray-500 text-sm mb-6">
            {error || "โต๊ะที่คุณค้นหาไม่มีในระบบ"}
          </p>
          <button
            onClick={() => router.push("/booking/pool")}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            กลับไปหน้าจองโต๊ะพูล
          </button>
        </main>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <header className="max-w-7xl mx-auto mb-6">
        <button
          onClick={() => router.push("/booking/pool")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:-translate-x-2 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">กลับไปหน้าจองโต๊ะพูล</span>
        </button>

        <div className="text-center mt-4">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            จองโต๊ะที่ {table.number}
          </h1>
          <p className="text-gray-500 text-sm">
            {table.type} • {table.hourlyRate} ฿/ชั่วโมง
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto mb-8">
        <article className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden">
          <section className="px-4 sm:px-6 py-6">
            {/* วันที่ */}
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📅 เลือกวันที่
            </label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                setDate(e.target.value);
                setStartHour(null);
                setError("");
              }}
              className="w-full px-3 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />

            {/* ระยะเวลา */}
            <label className="block text-sm font-semibold text-gray-700 mb-2 mt-5">
              ⏱️ ระยะเวลา (ชั่วโมง)
            </label>
            <select
              value={duration}
              onChange={(e) => {
                setDuration(Number(e.target.value));
                setStartHour(null);
                setError("");
              }}
              className="w-full px-3 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {[1, 2, 3, 4, 5].map((h) => (
                <option key={h} value={h}>
                  {h} ชั่วโมง
                </option>
              ))}
            </select>

            {/* เวลาเริ่มต้น */}
            <label className="block text-sm font-semibold text-gray-700 mb-3 mt-5">
              🕐 เลือกเวลาเริ่มต้น
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {renderHourButtons()}
            </div>
            <p className="text-xs text-gray-500 mt-3">💡 สีเทา = ไม่สามารถเลือกได้</p>

            {/* สรุป */}
            <section className="bg-blue-50 rounded-xl p-4 mb-4 mt-6">
              <h2 className="text-xs font-semibold text-gray-700 mb-3">💰 สรุปการจอง</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>วันที่</span>
                  <span>
                    {new Date(date).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>เวลา</span>
                  <span>
                    {startHour !== null
                      ? `${String(startHour).padStart(2, "0")}:00 - ${String(
                          startHour + duration
                        ).padStart(2, "0")}:00`
                      : "ยังไม่ได้เลือก"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ราคาต่อชั่วโมง</span>
                  <span>{table.hourlyRate} ฿</span>
                </div>
                <div className="flex justify-between border-t border-blue-200 pt-2">
                  <span className="font-semibold">รวมทั้งหมด</span>
                  <span className="text-blue-600 font-bold">{calculateTotal()} ฿</span>
                </div>
              </div>
            </section>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleReserve}
              disabled={submitting || startHour === null || hasConflict || overDay}
              className={`w-full py-3.5 rounded-xl font-semibold transition-all ${
                !submitting && startHour !== null && !hasConflict && !overDay
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {submitting
                ? "กำลังดำเนินการ..."
                : startHour !== null
                ? "✅ ยืนยันการจอง"
                : "⚠️ กรุณาเลือกเวลาก่อน"}
            </button>
          </section>
        </article>
      </main>
    </div>
  );
}

// ✅ Export หน้า พร้อม Suspense boundary ป้องกัน useSearchParams error
export default function ReservePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <ReserveContent />
    </Suspense>
  );
}
