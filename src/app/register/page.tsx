"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ✅ ใช้ตัวแปร .env
const API = process.env.NEXT_PUBLIC_API_DOMAIN as string;

export default function RegisterPage() {
    const router = useRouter();

    // ----- UI state -----
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

    // ----- Form state -----
    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    // onChange handler
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    // 🔒 Custom JS validation (Basic + JS ตรวจสอบ)
    function validateClientSide(): string | null {
        // 1) password === confirmPassword
        if (form.password !== form.confirmPassword) {
            return "รหัสผ่านไม่ตรงกัน";
        }

        // 2) extra check: password strength (กัน user ปิด pattern ผ่าน devtools)
        // อย่างน้อย 8 ตัว, ต้องมีตัวอักษร >=1 และตัวเลข >=1
        const passwordStrongRegex =
            /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-={}\[\]|\\:;"'<>,.?/]{8,}$/;
        if (!passwordStrongRegex.test(form.password)) {
            return "รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรและตัวเลข";
        }

        // 3) phone must be 9-10 digits (เฉพาะตัวเลข)
        const phoneRegex = /^[0-9]{9,10}$/;
        if (!phoneRegex.test(form.phone)) {
            return "รูปแบบเบอร์โทรไม่ถูกต้อง (ต้องเป็นตัวเลข 9-10 หลัก)";
        }

        // 4) name อย่างน้อย 2 ตัวอักษร
        const nameRegex = /^.{2,}$/;
        if (!nameRegex.test(form.name.trim())) {
            return "กรุณาใส่ชื่ออย่างน้อย 2 ตัวอักษร";
        }

        return null; // ผ่านทั้งหมด
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");

        // 🧠 วิ่ง custom JS validation ก่อนยิง API
        const clientErr = validateClientSide();
        if (clientErr) {
            setMessage(clientErr);
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`${API}/api/v1/auth/guest/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    phone: form.phone,
                    email: form.email,
                    password: form.password,
                    confirmPassword: form.confirmPassword,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                // สมัครเสร็จ -> ไปหน้า login
                router.push("/login");
            } else {
                setMessage(data?.message || "สมัครไม่สำเร็จ");
            }
        } catch (err) {
            console.error(err);
            setMessage("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <section
                className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8"
                aria-labelledby="register-title"
            >
                {/* ---------- Header / Avatar Icon ---------- */}
                <header className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                            <svg
                                className="w-8 h-8 text-white"
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
                    </div>

                    <h1
                        id="register-title"
                        className="text-2xl font-bold text-gray-900 mb-2"
                    >
                        Create Account
                    </h1>
                    <p className="text-gray-600">Sign up to get started</p>
                </header>

                {/* ---------- Form ---------- */}
                <form
                    className="space-y-4"
                    onSubmit={handleSubmit}
                    aria-describedby={message ? "form-error" : undefined}
                >
                    {/* Full Name */}
                    <div className="flex flex-col">
                        <label
                            htmlFor="name"
                            className="text-sm font-medium text-gray-700 mb-2"
                        >
                            Full Name
                        </label>
                        <div className="relative">
                            <input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="John Doe"
                                value={form.name}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                                // อย่างน้อย 2 ตัวอักษร
                                pattern=".{2,}"
                                title="กรุณาใส่อย่างน้อย 2 ตัวอักษร"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg 
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                            />
                        </div>
                    </div>ๅ

                    {/* Phone Number */}
                    <div className="flex flex-col">
                        <label
                            htmlFor="phone"
                            className="text-sm font-medium text-gray-700 mb-2"
                        >
                            Phone Number
                        </label>
                        <div className="relative">
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                placeholder="0812345678"
                                value={form.phone}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                                // เบอร์ = ตัวเลข 9-10 หลัก
                                pattern="^[0-9]{9,10}$"
                                title="กรุณาใส่เบอร์โทร 9-10 หลัก (ตัวเลขเท่านั้น)"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg 
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                                text-gray-900 placeholder-gray-500"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col">
                        <label
                            htmlFor="email"
                            className="text-sm font-medium text-gray-700 mb-2"
                        >
                            Email Address
                        </label>
                        <div className="relative">
                            <span
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                aria-hidden="true"
                            >
                                @
                            </span>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="yourname@example.com"
                                value={form.email}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                                // HTML5 จะเช็ค format email ให้เอง
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="flex flex-col">
                        <label
                            htmlFor="password"
                            className="text-sm font-medium text-gray-700 mb-2"
                        >
                            Password
                        </label>
                        <div className="relative">
                            <span
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                aria-hidden="true"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </span>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                                // ต้องมีตัวอักษร >=1, ตัวเลข >=1, และยาวอย่างน้อย 8 ตัว
                                pattern="^(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{8,}$"
                                title="อย่างน้อย 8 ตัวอักษร และต้องมีตัวอักษรและตัวเลขอย่างละ 1"
                                minLength={8}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg 
                                focus:outline-none focus:ring-2 focus:ring-blue-500 
                                focus:border-transparent text-gray-900 placeholder-gray-500"
                            />
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="flex flex-col">
                        <label
                            htmlFor="confirmPassword"
                            className="text-sm font-medium text-gray-700 mb-2"
                        >
                            Confirm Password
                        </label>
                        <div className="relative">
                            <span
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                aria-hidden="true"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </span>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            ต้องตรงกับรหัสผ่านด้านบน
                        </p>
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                    >
                        {isLoading ? (
                            <>
                                <svg
                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                Signing up...
                            </>
                        ) : (
                            "Sign up"
                        )}
                    </button>
                </form>

                {/* Error / server message */}
                {message && (
                    <div
                        id="form-error"
                        className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                        role="alert"
                    >
                        <p className="text-sm text-red-600 text-center">
                            {message}
                        </p>
                    </div>
                )}

                {/* Link to login */}
                <footer className="text-center text-sm text-gray-600 mt-6">
                    Already have an account?{" "}
                    <button
                        className="text-blue-600 hover:underline font-medium"
                        onClick={() => router.push("/login")}
                    >
                        Sign in
                    </button>
                </footer>
            </section>
        </main>
    );
}
