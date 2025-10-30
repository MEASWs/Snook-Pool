"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ✅ ใช้ ENV เดียวตามที่เราตกลง
const API = process.env.NEXT_PUBLIC_API_DOMAIN as string;

export default function LoginPage() {
    const router = useRouter();

    // ผู้ใช้ใส่ได้ทั้ง email (user ปกติ) หรือ username (admin)
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (isLoading) return; // กัน spam click

        setIsLoading(true);
        setError("");

        try {
            // ถ้ามี @ = ถือว่าเป็น user login ด้วย email
            const isEmailLogin = identifier.includes("@");

            const url = isEmailLogin
                ? `${API}/api/v1/auth/guest/login`      // user login
                : `${API}/api/v1/admin/guest/login`;    // admin login

            const body = isEmailLogin
                ? { email: identifier, password }
                : { username: identifier, password };

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json().catch(() => ({}));

            // รูปแบบ response:
            // user:  { message, data: { token } }
            // admin: { message, token, admin: {...} }
            const token: string | undefined =
                data?.data?.token ?? data?.token;

            if (!res.ok || !token) {
                setError(data?.message || "Login failed");
                return;
            }

            // เก็บ token
            localStorage.setItem("token", token);

            // เด้งหน้าตาม role
            if (isEmailLogin) {
                router.push("/");
            } else {
                router.push("/admin/home");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <section
                aria-labelledby="login-title"
                className="w-full max-w-md"
            >
                <article className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
                    {/* HEADER / BRAND */}
                    <header className="text-center space-y-2">
                        <div
                            className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mx-auto flex items-center justify-center"
                            aria-hidden="true"
                        >
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

                        <h1
                            id="login-title"
                            className="text-2xl font-bold text-gray-900"
                        >
                            Welcome Back
                        </h1>
                        <p className="text-gray-600 text-sm">
                            Please sign in to your account
                        </p>
                    </header>

                    {/* ERROR MESSAGE */}
                    {error && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="bg-red-50 border border-red-200 rounded-lg p-3"
                        >
                            <div className="flex items-center">
                                <svg
                                    className="w-5 h-5 text-red-500 mr-2 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <p className="text-red-700 text-sm font-medium">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* FORM */}
                    <form
                        onSubmit={handleLogin}
                        className="space-y-5"
                        aria-describedby={error ? "login-error" : undefined}
                    >
                        {/* IDENTIFIER */}
                        <div className="space-y-1">
                            <label
                                htmlFor="identifier"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Email or Username
                            </label>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg
                                        className="h-5 w-5 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206A8.959 8.959 0 01-4.5 1.207"
                                        />
                                    </svg>
                                </div>

                                <input
                                    id="identifier"
                                    name="identifier"
                                    type="text" // รองรับทั้ง email และ username
                                    autoComplete="username"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                                    placeholder="Enter your Email"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* PASSWORD */}
                        <div className="space-y-1">
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Password
                            </label>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg
                                        className="h-5 w-5 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                        />
                                    </svg>
                                </div>

                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                                    placeholder="Enter your password"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* OPTIONS ROW */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    disabled={isLoading}
                                />
                                <label
                                    htmlFor="remember-me"
                                    className="ml-2 block text-sm text-gray-700"
                                >
                                    Remember me
                                </label>
                            </div>

                            <button
                                type="button"
                                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                                // onClick={() => router.push("/forgot")} // ไว้อนาคต
                            >
                                Forgot password?
                            </button>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                        >
                            {isLoading ? (
                                <>
                                    <svg
                                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
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
                                    Signing in...
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </button>
                    </form>

                    {/* FOOTER / SIGNUP LINK */}
                    <footer className="text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{" "}
                            <button
                                type="button"
                                onClick={() => router.push("/register")}
                                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                            >
                                Sign up
                            </button>
                        </p>
                    </footer>
                </article>
            </section>
        </main>
    );
}
