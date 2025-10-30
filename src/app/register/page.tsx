"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ✅ ดึง base URL จาก .env
// ตัวแปรใน .env ต้องมี เช่น NEXT_PUBLIC_API_DOMAIN="http://localhost:3001"
const API = process.env.NEXT_PUBLIC_API_DOMAIN as string;

export default function RegisterPage() {
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);

    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [message, setMessage] = useState("");

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        // reset error
        setMessage("");

        // เช็ครหัสซ้ำก่อนยิง API
        if (form.password !== form.confirmPassword) {
            setMessage("รหัสผ่านไม่ตรงกัน");
            return;
        }

        setIsLoading(true);
        try {
            // ✅ ใช้ API จาก .env
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
                // สมัครสำเร็จ กลับหน้าแรกหรือจะพาไป login ก็ได้
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
                    <p className="text-gray-600">
                        Sign up to get started
                    </p>
                </header>

                {/* ---------- Form ---------- */}
                <form
                    className="space-y-4"
                    onSubmit={handleSubmit}
                    aria-describedby={message ? "form-error" : undefined}
                >
                    {/* Name */}
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
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Phone */}
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
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                                required
                                disabled={isLoading}
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
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                                required
                                disabled={isLoading}
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
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                                required
                                disabled={isLoading}
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
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                                required
                                disabled={isLoading}
                            />
                        </div>
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
                        <p className="text-sm text-red-600 text-center">{message}</p>
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
