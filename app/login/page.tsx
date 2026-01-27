// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function LoginPage() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // TOFIX
        const res = await api.post('/users/login', formData);

        // 保存 Token 和用户信息
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));

      router.push("/map"); // 跳转到地图页
    } catch (err: any) {
      setError(err.response?.data?.message || "登录失败，请检查用户名或密码");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-center text-gray-800">
          🔐 用户登录
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">用户名</label>
            <input
              type="text"
              required
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 text-black"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">密码</label>
            <input
              type="password"
              required
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 text-black"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-2 text-white bg-blue-600 rounded hover:bg-blue-700 transition"
          >
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
