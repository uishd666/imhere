// app/map/page.tsx
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

// ⚠️ 动态导入地图组件，禁用 SSR
const MapWithNoSSR = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center bg-gray-100">加载地图中...</div>
});

interface User {
  id: number;
  username: string;
}

interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export default function MapPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [pathData, setPathData] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // 验证登录状态 & 加载用户列表
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        const res = await api.get('/users/all');
        // 假设后端返回 { users: [] } 或 直接返回 []，根据你的实际API调整
        setUsers(Array.isArray(res.data) ? res.data : res.data.users || []);
      } catch (err) {
        console.error("加载用户失败", err);
      }
    };
    fetchUsers();
  }, [router]);

  // 查询轨迹
  const handleSearch = async () => {
    if (!selectedUser) {
      alert("请完整填写用户");
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/locations/history', {
        params: {
          userId: selectedUser,
          start: startTime,
          end: endTime
        }
      });

      // ✅ 关键修复：提取 res.data.locations 数组
      const locations = res.data.locations || [];
      
      // ✅ 类型转换：字符串转数字
      const formattedData: LocationPoint[] = locations.map((item: any) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lng),
        timestamp: item.timestamp
      }));

      // 按时间排序
      formattedData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setPathData(formattedData);
      if (formattedData.length === 0) alert("该时间段无数据");

    } catch (err) {
      console.error(err);
      alert("查询轨迹失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部控制栏 */}
      <div className="p-4 bg-white shadow-md z-10 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">选择用户</label>
          <select 
            className="border p-2 rounded text-black min-w-[150px]"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="">-- 请选择 --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">开始时间</label>
          <input 
            type="datetime-local" 
            className="border p-2 rounded text-black"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">结束时间</label>
          <input 
            type="datetime-local" 
            className="border p-2 rounded text-black"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <button 
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? '查询中...' : '查看轨迹'}
        </button>
      </div>

      {/* 地图区域 */}
      <div className="flex-1 relative z-0">
        <MapWithNoSSR pathData={pathData} />
      </div>
    </div>
  );
}