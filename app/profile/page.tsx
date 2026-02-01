'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface UserProfile {
  id: number;
  username: string;
  created_at: string;
  lastLocation?: {
    lat: number;
    lng: number;
    created_at: string;
  };
}

interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentLocations, setRecentLocations] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationSharing, setLocationSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchProfile();
  }, [router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profileRes = await api.get('/users/profile');
      setProfile(profileRes.data.user);

      if (profileRes.data.user.lastLocation) {
        setCurrentLocation({
          lat: profileRes.data.user.lastLocation.lat,
          lng: profileRes.data.user.lastLocation.lng
        });
      }

      const locationsRes = await api.get('/locations/history', {
        params: {
          userId: JSON.parse(localStorage.getItem('user') || '{}').id,
          startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      setRecentLocations(locationsRes.data.locations || []);
    } catch (err: any) {
      setError(err.response?.data?.message || '加载个人资料失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationUpdate = async () => {
    if (!navigator.geolocation) {
      setError('浏览器不支持地理定位');
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          await api.post('/locations/update', {
            lat: latitude,
            lng: longitude
          });

          setCurrentLocation({ lat: latitude, lng: longitude });
          await fetchProfile();
          alert('位置更新成功！');
        },
        (error) => {
          setError('获取位置失败: ' + error.message);
        }
      );
    } catch (err: any) {
      setError(err.response?.data?.message || '位置更新失败');
    }
  };

  const handleLocationShare = async () => {
    if (!navigator.geolocation) {
      setError('浏览器不支持地理定位');
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          await api.post('/locations/share', {
            lat: latitude,
            lng: longitude
          });

          await fetchProfile();
          alert('位置分享成功！');
        },
        (error) => {
          setError('获取位置失败: ' + error.message);
        }
      );
    } catch (err: any) {
      setError(err.response?.data?.message || '位置分享失败');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">加载中...</div>
      </div>
    </div>
  );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">无法加载个人资料</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">个人资料</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">基本信息</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">用户名</label>
                  <p className="mt-1 text-lg text-gray-900">{profile.username}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">用户ID</label>
                  <p className="mt-1 text-lg text-gray-900">{profile.id}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">注册时间</label>
                  <p className="mt-1 text-lg text-gray-900">
                    {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">最后位置</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {profile.lastLocation 
                      ? `${profile.lastLocation.lat.toFixed(6)}, ${profile.lastLocation.lng.toFixed(6)}`
                      : '暂无位置信息'
                    }
                    {profile.lastLocation && (
                      <span className="block text-xs text-gray-500 mt-1">
                        更新于 {new Date(profile.lastLocation.created_at).toLocaleString('zh-CN')}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                >
                  退出登录
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">位置管理</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">当前位置</label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    {currentLocation 
                      ? `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`
                      : '暂无位置信息'
                    }
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleLocationUpdate}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    更新我的位置
                  </button>
                  
                  <button
                    onClick={handleLocationShare}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                  >
                    分享当前位置
                  </button>
                </div>

                <div className="text-sm text-gray-500">
                  <p>• 更新位置：仅更新你的最后位置记录</p>
                  <p>• 分享位置：创建新的位置分享记录</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">最近7天位置记录</h2>
            
            {recentLocations.length > 0 ? (
              <div className="space-y-3">
                {recentLocations.map((location, index) => (
                  <div key={`${location.timestamp}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(location.timestamp).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className="text-2xl">📍</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">📍</div>
                <p className="text-gray-500">最近7天暂无位置记录</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}