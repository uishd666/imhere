// app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function RegisterPage() {
  const [formData, setFormData] = useState({ username: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("密码不匹配");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("密码长度至少6位");
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/users/register', {
        username: formData.username,
        password: formData.password
      });

      // 保存 Token 和用户信息
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      router.push("/map");
    } catch (err: any) {
      setError(err.response?.data?.message || "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-center text-gray-800">
          🔐 用户注册
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">用户名</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={50}
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
              minLength={6}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 text-black"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">确认密码</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 text-black"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-white bg-blue-600 rounded hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/login" className="text-blue-600 hover:underline text-sm">
            已有账户？点击登录
          </Link>
        </div>
      </div>
    </div>
  );
}