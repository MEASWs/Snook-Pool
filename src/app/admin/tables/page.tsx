"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TableType = "SNOOKER" | "POOL";
type TableStatus = "ACTIVE" | "MAINTENANCE";

type AdminTableRow = {
    id: string;
    number: number;
    type: TableType;
    hourlyRate: number;
    status: TableStatus;
};

const API = process.env.NEXT_PUBLIC_API_DOMAIN || "http://localhost:3001";

const ADMIN_PREFIX = `${API}/api/v1/adminTable/authorized`;
const ADMIN_POST = `${ADMIN_PREFIX}/`; // POST (มี / ปิดท้าย)
const ADMIN_ITEM = (id: string) => `${ADMIN_PREFIX}/${id}`;
const GUEST_TABLES = `${API}/api/v1/table/guest/tables`;

/* ---------- Pure helpers ---------- */
function replaceRow(
    arr: AdminTableRow[],
    id: string,
    patch: Partial<AdminTableRow>
): AdminTableRow[] {
    return arr.map((t) => (t.id === id ? { ...t, ...patch } : t));
}
function appendRow(arr: AdminTableRow[], row: AdminTableRow): AdminTableRow[] {
    return [...arr, row];
}
function removeRow(arr: AdminTableRow[], id: string): AdminTableRow[] {
    return arr.filter((t) => t.id !== id);
}
/* ---------------------------------- */

export default function AdminTablesPage() {
    const router = useRouter();

    // data
    const [tables, setTables] = useState<AdminTableRow[]>([]);
    // ui / load
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");
    // filter/search
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<"ALL" | TableType>("ALL");
    const [filterStatus, setFilterStatus] = useState<"ALL" | TableStatus>("ALL");
    // modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<AdminTableRow | null>(null);

    // ========= derived list =========
    const filtered = useMemo(() => {
        let list = tables;
        if (filterType !== "ALL") list = list.filter((t) => t.type === filterType);
        if (filterStatus !== "ALL")
            list = list.filter((t) => t.status === filterStatus);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(
                (t) =>
                    `${t.number}`.includes(q) ||
                    t.type.toLowerCase().includes(q)
            );
        }
        return [...list].sort((a, b) => a.number - b.number);
    }, [tables, filterType, filterStatus, search]);

    // ========= lifecycle: load tables =========
    useEffect(() => {
        loadTables();
    }, []);

    function getToken() {
        return localStorage.getItem("token");
    }

    async function loadTables() {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(GUEST_TABLES, { cache: "no-store" });
            const json = await res.json().catch(() => null);
            const data = (json?.data || []) as any[];

            const mapped: AdminTableRow[] = data.map((t) => ({
                id:
                    t.id ??
                    (typeof crypto !== "undefined"
                        ? crypto.randomUUID()
                        : String(Math.random())),
                number: Number(t.number),
                type: (t.type || "SNOOKER") as TableType,
                hourlyRate: Number(t.hourlyRate ?? t.rate ?? 0),
                status: (t.status || "ACTIVE") as TableStatus,
            }));
            setTables(mapped);
        } catch (e: any) {
            setError(e?.message || "โหลดข้อมูลโต๊ะไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }

    async function createTable(
        payload: Omit<AdminTableRow, "id" | "status"> & { status?: TableStatus }
    ) {
        const token = getToken();
        if (!token) {
            setError("Unauthorized: no admin token");
            return Promise.reject();
        }
        setError("");
        const res = await fetch(ADMIN_POST, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.message || "Create failed");
        return json.data as AdminTableRow;
    }

    async function updateTable(id: string, payload: Partial<AdminTableRow>) {
        const token = getToken();
        if (!token) {
            setError("Unauthorized: no admin token");
            return Promise.reject();
        }
        setError("");
        const res = await fetch(ADMIN_ITEM(id), {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.message || "Update failed");
        return json.data as AdminTableRow;
    }

    async function archiveTable(id: string) {
        const token = getToken();
        if (!token) {
            setError("Unauthorized: no admin token");
            return Promise.reject();
        }
        setError("");
        const res = await fetch(ADMIN_ITEM(id), {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.message || "Archive failed");
        return json.data as Pick<
            AdminTableRow,
            "id" | "number" | "type" | "status"
        >;
    }

    // ========= modal handlers =========
    function openCreate() {
        setEditing(null);
        setModalOpen(true);
    }
    function openEdit(row: AdminTableRow) {
        setEditing(row);
        setModalOpen(true);
    }

    async function handleSubmit(form: HTMLFormElement) {
        const fd = new FormData(form);
        const number = Number(fd.get("number"));
        const type = fd.get("type") as TableType;
        const hourlyRate = Number(fd.get("hourlyRate"));
        const status = (fd.get("status") as TableStatus) || "ACTIVE";

        if (!number || !type || isNaN(hourlyRate)) {
            setError("กรุณากรอกข้อมูลให้ครบก่อน");
            return;
        }

        try {
            if (editing) {
                const id = editing.id;
                // optimistic update
                setTables((prev) =>
                    replaceRow(prev, id, {
                        number,
                        type,
                        hourlyRate,
                        status,
                    })
                );
                await updateTable(id, { number, type, hourlyRate, status });
            } else {
                const created = await createTable({
                    number,
                    type,
                    hourlyRate,
                    status,
                });
                setTables((prev) => appendRow(prev, created));
            }
            setModalOpen(false);
        } catch (e: any) {
            setError(e?.message || "บันทึกไม่สำเร็จ");
            await loadTables();
        }
    }

    async function handleArchive(row: AdminTableRow) {
        if (
            !confirm(
                `ยืนยันเปลี่ยนโต๊ะ #${row.number} เป็นสถานะ MAINTENANCE ?`
            )
        )
            return;
        try {
            const id = row.id;
            // optimistic remove
            setTables((prev) => removeRow(prev, id));
            await archiveTable(id);
        } catch (e: any) {
            setError(e?.message || "อัปเดตสถานะไม่สำเร็จ");
            await loadTables();
        }
    }

    // ========= small UI helpers =========
    function statusBadge(status: TableStatus) {
        if (status === "ACTIVE") {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border bg-green-100 text-green-800 border-green-300">
                    <span>✅</span>
                    <span>ACTIVE</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border bg-yellow-100 text-yellow-800 border-yellow-300">
                <span>🛠</span>
                <span>MAINTENANCE</span>
            </span>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
                {/* back button */}
                <div>
                    <button
                        onClick={() => router.push("/admin/home")}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:translate-x-[-10px] transition-all duration-200"
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
                        <span className="font-medium text-sm sm:text-base">
                            กลับไปหน้า Admin
                        </span>
                    </button>
                </div>

                {/* header */}
                <header className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-3xl sm:text-4xl">🎱</span>
                        </div>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                        จัดการโต๊ะ
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                        เพิ่ม / แก้ไข / ปิดซ่อมโต๊ะ (ACTIVE → MAINTENANCE)
                    </p>
                </header>

                {/* controls card */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <span>⚙️</span>
                                <span>ตัวกรอง & ค้นหา</span>
                            </h2>
                            <p className="text-xs text-gray-500">
                                ใช้ค้นหาเลขโต๊ะ หรือกรองเฉพาะประเภท/สถานะ
                            </p>
                        </div>

                        <div>
                            <button
                                onClick={openCreate}
                                className="w-full lg:w-auto py-3 px-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-[0.99] transition-all"
                            >
                                + เพิ่มโต๊ะใหม่
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="search"
                            placeholder="ค้นหาเลขโต๊ะหรือประเภท…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />

                        <select
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                            value={filterType}
                            onChange={(e) =>
                                setFilterType(e.target
                                    .value as "ALL" | TableType)
                            }
                        >
                            <option value="ALL">ทุกประเภท</option>
                            <option value="SNOOKER">SNOOKER</option>
                            <option value="POOL">POOL</option>
                        </select>

                        <select
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                            value={filterStatus}
                            onChange={(e) =>
                                setFilterStatus(
                                    e.target
                                        .value as "ALL" | TableStatus
                                )
                            }
                        >
                            <option value="ALL">ทุกสถานะ</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="MAINTENANCE">MAINTENANCE</option>
                        </select>

                        <button
                            onClick={loadTables}
                            disabled={loading}
                            className={`w-full py-3 rounded-xl font-semibold transition-all ${
                                loading
                                    ? "bg-gray-200 text-gray-400 cursor-wait"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-[0.99]"
                            }`}
                        >
                            🔄 รีเฟรช
                        </button>
                    </div>

                    {error && (
                        <div className="rounded-xl px-4 py-3 text-sm font-medium bg-red-50 text-red-700 border-2 border-red-200">
                            {error}
                        </div>
                    )}
                </section>

                {/* table list card */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <header className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <span>📋</span>
                            <span>รายการโต๊ะทั้งหมด</span>
                        </h2>
                        <span className="text-sm text-gray-500">
                            รวม {filtered.length} โต๊ะ
                        </span>
                    </header>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase text-[11px]">
                                        โต๊ะ
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase text-[11px]">
                                        ประเภท
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-700 uppercase text-[11px]">
                                        ค่าชม (฿/ชม.)
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 uppercase text-[11px]">
                                        สถานะ
                                    </th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-700 uppercase text-[11px]">
                                        จัดการ
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-10 text-center text-gray-500 text-sm"
                                        >
                                            กำลังโหลด...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-12 text-center text-gray-500 text-sm"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-4xl">
                                                    📭
                                                </span>
                                                <div className="font-medium">
                                                    ไม่พบข้อมูล
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((t) => (
                                        <tr
                                            key={t.id}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-4 py-3 font-semibold text-gray-900">
                                                #{t.number}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1">
                                                    <span>
                                                        {t.type === "SNOOKER"
                                                            ? "🎱"
                                                            : "🎯"}
                                                    </span>
                                                    <span className="font-medium text-gray-700">
                                                        {t.type}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-900 font-medium">
                                                {t.hourlyRate.toFixed(0)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {statusBadge(t.status)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    <button
                                                        className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:shadow-sm active:scale-[0.99] transition"
                                                        onClick={() =>
                                                            openEdit(t)
                                                        }
                                                    >
                                                        ✏️ แก้ไข
                                                    </button>
                                                    <button
                                                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-yellow-500 text-white hover:bg-yellow-600 hover:shadow-md active:scale-[0.99] transition"
                                                        onClick={() =>
                                                            handleArchive(t)
                                                        }
                                                    >
                                                        🛠 ปิดซ่อม
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {/* MODAL OVERLAY */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* dim background */}
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setModalOpen(false)}
                    />
                    {/* card */}
                    <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 p-6 z-10">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span>📝</span>
                            <span>
                                {editing
                                    ? `แก้ไขโต๊ะ #${editing.number}`
                                    : "เพิ่มโต๊ะใหม่"}
                            </span>
                        </h2>

                        <form
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                await handleSubmit(e.currentTarget);
                            }}
                        >
                            <label className="flex flex-col text-sm font-medium text-gray-700">
                                <span className="mb-1">
                                    เลขโต๊ะ
                                    <span className="text-red-500">*</span>
                                </span>
                                <input
                                    name="number"
                                    type="number"
                                    min={1}
                                    required
                                    defaultValue={editing?.number ?? ""}
                                    className="px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                />
                            </label>

                            <label className="flex flex-col text-sm font-medium text-gray-700">
                                <span className="mb-1">ประเภท</span>
                                <select
                                    name="type"
                                    defaultValue={editing?.type ?? "SNOOKER"}
                                    className="px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                >
                                    <option value="SNOOKER">SNOOKER</option>
                                    <option value="POOL">POOL</option>
                                </select>
                            </label>

                            <label className="flex flex-col text-sm font-medium text-gray-700">
                                <span className="mb-1">
                                    ค่าชม (฿/ชม.)
                                    <span className="text-red-500">*</span>
                                </span>
                                <input
                                    name="hourlyRate"
                                    type="number"
                                    min={0}
                                    step={1}
                                    required
                                    defaultValue={editing?.hourlyRate ?? ""}
                                    className="px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                />
                            </label>

                            <label className="flex flex-col text-sm font-medium text-gray-700">
                                <span className="mb-1">สถานะ</span>
                                <select
                                    name="status"
                                    defaultValue={editing?.status ?? "ACTIVE"}
                                    className="px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="MAINTENANCE">
                                        MAINTENANCE
                                    </option>
                                </select>
                            </label>

                            {/* footer buttons */}
                            <div className="col-span-2 flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm active:scale-[0.99] transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-[0.99] transition"
                                >
                                    บันทึก
                                </button>
                            </div>
                        </form>

                        {error && (
                            <div className="mt-4 rounded-xl px-4 py-3 text-sm font-medium bg-red-50 text-red-700 border-2 border-red-200">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
