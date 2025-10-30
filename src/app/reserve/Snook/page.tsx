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

// ---------------------
// ชั้นใน: ใช้ hooks ได้
// ---------------------
function ReserveContent() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("tableId"); // string | null
  const router = useRouter();

  // ---- ENV base URL (.env) ----
  const API = process.env.NEXT_PUBLIC_API_DOMAIN as string;

  // ---- state ----
  const [table, setTable] = useState<Table | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); // yyyy-mm-dd
  const [startHour, setStartHour] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(1);
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ชั่วโมงเลือกได้ 09:00 - 22:00
  const hours = useMemo(() => Array.from({ length: 14 }, (_, i) => i + 9), []);

  // ถ้าไม่มี tableId -> แจ้ง error ทันที
  useEffect(() => {
    if (!tableId) {
      setError("ลิงก์ไม่ถูกต้อง: ไม่พบ tableId ใน URL");
      setLoading(false);
    }
  }, [tableId]);

  // helper: แปลงเวลา busy slot ให้เป็น +07:00 ชัด ๆ
  function forceToThaiTZ(iso: string) {
    const [d, t = "00:00:00"] = iso.split("T");
    const hhmmss = (t || "00:00:00").slice(0, 8);
    return `${d}T${hhmmss}+07:00`;
  }

  // โหลดข้อมูลโต๊ะ
  useEffect(() => {
    if (!tableId) return;

    const safeTableId: string = tableId;

    async function fetchTable() {
      try {
        const res = await fetch(`${API}/api/v1/table/guest/tables`);
        const data = await res.json();

        const foundTable: Table | undefined = data?.data?.find(
          (t: Table) => t.id === safeTableId
        );

        if (!foundTable) {
          setError("ไม่พบโต๊ะ");
          setTable(null);
        } else {
          setTable(foundTable);
        }
      } catch (err) {
        console.error(err);
        setError("ไม่สามารถโหลดข้อมูลโต๊ะได้");
      } finally {
        // ดีเลย์นิดหน่อยเพื่อไม่ให้กระพริบ
        setTimeout(() => setLoading(false), 400);
      }
    }

    fetchTable();
  }, [API, tableId]);

  // โหลดช่วงเวลาที่ถูกจอง
  useEffect(() => {
    if (!tableId || !date) return;

    const safeTableId: string = tableId;

    async function fetchBusySlots() {
      try {
        const res = await fetch(
          `${API}/api/v1/reservation/guest/availability?tableId=${encodeURIComponent(
            safeTableId
          )}&date=${encodeURIComponent(date)}`
        );
        const data = await res.json();
        setBusySlots(data?.data?.busy || []);
      } catch (err) {
        console.error(err);
        setError("โหลดข้อมูลเวลาที่ถูกจองไม่สำเร็จ");
      }
    }

    fetchBusySlots();
  }, [API, tableId, date]);

  // ราคาทั้งหมด
  const calculateTotal = () =>
    table ? table.hourlyRate * duration : 0;

  // ชั่วโมงนี้ว่างไหม (ดูชนกับ busySlot มั้ย)
  const isHourAvailable = (hour: number) => {
    const checkStart = new Date(
      `${date}T${String(hour).padStart(2, "0")}:00:00+07:00`
    ).getTime();
    const checkEnd = checkStart + 60 * 60 * 1000;

    return !busySlots.some((b) => {
      const busyStart = new Date(forceToThaiTZ(b.start)).getTime();
      const busyEnd = new Date(forceToThaiTZ(b.end)).getTime();
      return checkStart < busyEnd && checkEnd > busyStart;
    });
  };

  // เลยเที่ยงคืนมั้ย (ถ้าเกิน 23:xx ไม่ให้เลือก)
  const overDay = useMemo(
    () => startHour !== null && startHour + duration > 23,
    [startHour, duration]
  );

  // block ที่เลือกมีชนกับช่วงที่ถูกจองมั้ย
  const hasConflict = useMemo(() => {
    if (startHour === null) return false;
    return Array.from({ length: duration }).some(
      (_, i) => !isHourAvailable(startHour + i)
    );
  }, [startHour, duration, busySlots]);

  // เรนเดอร์ปุ่มเลือกชั่วโมง (semantic: ใช้ button list)
  const renderHourButtons = () =>
    hours.map((hour) => {
      const overlapWithBusy = Array.from({ length: duration }).some(
        (_, i) => !isHourAvailable(hour + i)
      );
      const _overDay = hour + duration > 23;

      const disabled = overlapWithBusy || _overDay;
      const isSelected =
        startHour !== null &&
        hour >= startHour &&
        hour < startHour + duration;

      return (
        <button
          key={hour}
          disabled={disabled}
          onClick={() => {
            setStartHour(hour);
            setError("");
          }}
          className={`py-3 px-2 rounded-xl font-semibold text-sm transition-all ${
            isSelected
              ? "bg-blue-600 text-white shadow-md"
              : disabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white border-2 border-gray-200 text-gray-700 active:bg-gray-50"
          }`}
          aria-pressed={isSelected}
          aria-disabled={disabled || undefined}
          aria-label={`เริ่ม ${String(hour).padStart(
            2,
            "0"
          )}:00 ระยะ ${duration} ชม.`}
        >
          <div className="text-base">
            {String(hour).padStart(2, "0")}:00
          </div>

          {isSelected && startHour === hour && duration > 1 && (
            <div className="text-xs mt-0.5">
              ถึง {String(hour + duration - 1).padStart(2, "0")}:59
            </div>
          )}
        </button>
      );
    });

  // submit การจอง
  const handleReserve = async () => {
    if (!tableId || startHour === null) {
      setError("กรุณาเลือกเวลาเริ่มต้น");
      return;
    }

    if (hasConflict || overDay) {
      setError(
        "เวลาที่เลือกทับกับช่วงเวลาที่ถูกจองแล้ว หรือเกินเวลาทำการ"
      );
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("กรุณาเข้าสู่ระบบก่อนทำการจอง");
      return;
    }

    const safeTableId: string = tableId;

    setSubmitting(true);
    setError("");

    const startDate = new Date(
      `${date}T${String(startHour).padStart(2, "0")}:00:00`
    );
    const startISO = new Date(
      startDate.getTime() -
        startDate.getTimezoneOffset() * 60000
    ).toISOString();

    try {
      const res = await fetch(
        `${API}/api/v1/reservation/authorized/reservations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tableId: safeTableId,
            startTime: startISO,
            duration,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        const reservationId =
          data?.data?.id ||
          data?.id ||
          data?.reservationId ||
          "";

        alert("จองโต๊ะสำเร็จ! 🎉");

        router.push(
          `/reservationlist${
            reservationId ? `?focus=${reservationId}` : ""
          }`
        );
      } else {
        setError(data?.message || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการจอง");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- LOADING STATE ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
          aria-label="กำลังโหลดข้อมูลการจอง"
        />
      </div>
    );
  }

  // ---------- ไม่พบโต๊ะ ----------
  if (!table) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 px-4">
        <main
          role="main"
          className="max-w-3xl mx-auto text-center"
        >
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            ไม่พบโต๊ะ
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {error || "โต๊ะที่คุณค้นหาไม่มีในระบบ"}
          </p>

          <button
            onClick={() => router.push("/booking/snooker")}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            กลับไปหน้าจองโต๊ะสนุ๊ก
          </button>
        </main>
      </div>
    );
  }

  // ---------- หน้าปกติ ----------
  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto mb-6">
        <nav
          aria-label="ย้อนกลับไปหน้าจองโต๊ะสนุ๊ก"
          className="mb-4"
        >
          <button
            onClick={() => router.push("/booking/snooker")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:-translate-x-2 transition"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-medium text-sm">
              กลับไปหน้าจองโต๊ะสนุ๊ก
            </span>
          </button>
        </nav>

        <section
          aria-labelledby="reserve-page-title"
          className="text-center"
        >
          <div
            className="flex justify-center mb-3"
            aria-hidden="true"
          >
            <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-2xl">🎱</span>
            </div>
          </div>

          <h1
            id="reserve-page-title"
            className="text-2xl font-bold text-gray-900 mb-2"
          >
            จองโต๊ะที่ {table.number}
          </h1>

          <p className="text-gray-500 text-sm">
            {table.type} • {table.hourlyRate} ฿/ชั่วโมง
          </p>
        </section>
      </header>

      {/* MAIN */}
      <main
        role="main"
        className="max-w-7xl mx-auto mb-8"
      >
        <article className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden">
          <section className="px-4 sm:px-6 py-4 sm:py-6">
            {/* วันที่ */}
            <section
              aria-labelledby="pick-date-label"
              className="mb-5"
            >
              <label
                id="pick-date-label"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                📅 เลือกวันที่
              </label>

              <input
                type="date"
                value={date}
                min={new Date()
                  .toISOString()
                  .split("T")[0]}
                onChange={(e) => {
                  setDate(e.target.value);
                  setStartHour(null);
                  setError("");
                }}
                className="w-full px-3 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </section>

            {/* ระยะเวลา */}
            <section
              aria-labelledby="duration-label"
              className="mb-5"
            >
              <label
                id="duration-label"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
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
            </section>

            {/* เวลาเริ่มต้น */}
            <section
              aria-labelledby="time-label"
              className="mb-6"
            >
              <label
                id="time-label"
                className="block text-sm font-semibold text-gray-700 mb-3"
              >
                🕐 เลือกเวลาเริ่มต้น
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {renderHourButtons()}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                💡 เวลาสีเทา = ถูกจองแล้ว / เกินเวลาทำการ
              </p>
            </section>

            {/* สรุปการจอง */}
            <section
              aria-labelledby="summary-label"
              className="bg-blue-50 rounded-xl p-4 mb-4"
            >
              <h2
                id="summary-label"
                className="text-xs font-semibold text-gray-700 mb-3"
              >
                💰 สรุปการจอง
              </h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">
                    วันที่
                  </span>
                  <span className="font-medium text-gray-900">
                    {new Date(date).toLocaleDateString(
                      "th-TH",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700">
                    เวลา
                  </span>
                  <span className="font-medium text-gray-900">
                    {startHour !== null
                      ? `${String(startHour).padStart(
                          2,
                          "0"
                        )}:00 - ${String(
                          startHour + duration
                        ).padStart(2, "0")}:00`
                      : "ยังไม่ได้เลือก"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700">
                    ราคาต่อชั่วโมง
                  </span>
                  <span className="font-medium text-gray-900">
                    {table.hourlyRate} ฿
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700">
                    จำนวนชั่วโมง
                  </span>
                  <span className="font-medium text-gray-900">
                    × {duration}
                  </span>
                </div>

                <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
                  <span className="font-semibold text-gray-900 text-sm">
                    ราคารวมทั้งหมด
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {calculateTotal()} ฿
                  </span>
                </div>
              </div>
            </section>

            {/* error */}
            {error && (
              <section
                aria-live="assertive"
                className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4"
              >
                <p className="text-red-700 text-sm font-medium">
                  {error}
                </p>
              </section>
            )}

            {/* ปุ่มยืนยัน */}
            <section>
              <button
                onClick={handleReserve}
                disabled={
                  submitting ||
                  startHour === null ||
                  hasConflict ||
                  overDay
                }
                className={`w-full py-3.5 rounded-xl font-semibold transition-all ${
                  !submitting &&
                  startHour !== null &&
                  !hasConflict &&
                  !overDay
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
                aria-disabled={
                  submitting ||
                  startHour === null ||
                  hasConflict ||
                  overDay ||
                  undefined
                }
              >
                {submitting
                  ? "กำลังดำเนินการ..."
                  : startHour !== null
                  ? "✅ ยืนยันการจอง"
                  : "⚠️ กรุณาเลือกเวลาก่อน"}
              </button>
            </section>
          </section>
        </article>
      </main>
    </div>
  );
}

// ---------------------
// ชั้นนอก: ใส่ Suspense ครอบ
// ---------------------
export default function ReservePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <ReserveContent />
    </Suspense>
  );
}
