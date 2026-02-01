'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface User {
  id: number;
  username: string;
  created_at: string;
}

interface Following {
  id: number;
  targetUser: {
    id: number;
    username: string;
  };
  since: string;
}

interface Follower {
  id: number;
  watcher: {
    id: number;
    username: string;
  };
  since: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [following, setFollowing] = useState<Following[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'following' | 'followers'>('all');
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [usersRes, followingRes, followersRes] = await Promise.all([
          api.get('/users/all'),
          api.get('/locations/following'),
          api.get('/locations/followers')
        ]);

        setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.users || []);
        setFollowing(followingRes.data.following || []);
        setFollowers(followersRes.data.followers || []);
      } catch (err: any) {
        setError(err.response?.data?.message || '加载数据失败');
      } finally {
        setLoading(false);
      }
    };

    const token = localStorage.getItem('token');
    if (token) {
      fetchData();
    }
  }, []);

  const handleFollow = async (targetId: number) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.id === targetId) {
      setError('不能关注自己');
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [targetId]: true }));
      await api.post('/locations/follow', { targetId });
      
      const followingRes = await api.get('/locations/following');
      setFollowing(followingRes.data.following || []);
      
      alert('关注成功！');
    } catch (err: any) {
      setError(err.response?.data?.message || '关注失败');
    } finally {
      setActionLoading(prev => ({ ...prev, [targetId]: false }));
    }
  };

  const handleUnfollow = async (targetId: number) => {
    try {
      setActionLoading(prev => ({ ...prev, [targetId]: true }));
      await api.delete(`/locations/unfollow/${targetId}`);
      
      const followingRes = await api.get('/locations/following');
      setFollowing(followingRes.data.following || []);
      
      alert('已取消关注');
    } catch (err: any) {
      setError(err.response?.data?.message || '取消关注失败');
    } finally {
      setActionLoading(prev => ({ ...prev, [targetId]: false }));
    }
  };

  const isFollowing = (userId: number) => {
    return following.some(f => f.targetUser.id === userId);
  };

  const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem('user') || '{}');
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

  const currentUser = getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">用户管理</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              所有用户 ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'following'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              我的关注 ({following.length})
            </button>
            <button
              onClick={() => setActiveTab('followers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'followers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              我的粉丝 ({followers.length})
            </button>
          </nav>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeTab === 'all' && users.map((user) => {
            const following = isFollowing(user.id);
            const isSelf = currentUser.id === user.id;
            
            return (
              <div key={user.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{user.username}</h3>
                    <p className="text-sm text-gray-500">
                      ID: {user.id} • 注册于 {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div className="text-2xl">👤</div>
                </div>
                
                {!isSelf && (
                  <button
                    onClick={() => following ? handleUnfollow(user.id) : handleFollow(user.id)}
                    disabled={actionLoading[user.id]}
                    className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                      following
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } ${actionLoading[user.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {actionLoading[user.id] 
                      ? '处理中...' 
                      : following ? '取消关注' : '关注'
                    }
                  </button>
                )}
                
                {isSelf && (
                  <div className="text-sm text-gray-500 text-center py-2">
                    这是你自己
                  </div>
                )}
              </div>
            );
          })}

          {activeTab === 'following' && following.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{item.targetUser.username}</h3>
                  <p className="text-sm text-gray-500">
                    ID: {item.targetUser.id} • 关注于 {new Date(item.since).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <div className="text-2xl">👥</div>
              </div>
              
              <button
                onClick={() => handleUnfollow(item.targetUser.id)}
                disabled={actionLoading[item.targetUser.id]}
                className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                  actionLoading[item.targetUser.id]
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {actionLoading[item.targetUser.id] ? '处理中...' : '取消关注'}
              </button>
            </div>
          ))}

          {activeTab === 'followers' && followers.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{item.watcher.username}</h3>
                  <p className="text-sm text-gray-500">
                    ID: {item.watcher.id} • 粉丝于 {new Date(item.since).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <div className="text-2xl">⭐</div>
              </div>
              
              <div className="text-sm text-gray-500 text-center py-2">
                关注了你
              </div>
            </div>
          ))}
        </div>

        {((activeTab === 'all' && users.length === 0) ||
          (activeTab === 'following' && following.length === 0) ||
          (activeTab === 'followers' && followers.length === 0)) && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无数据</h3>
            <p className="text-gray-500">
              {activeTab === 'all' && '暂无其他用户'}
              {activeTab === 'following' && '你还没有关注任何人'}
              {activeTab === 'followers' && '还没有人关注你'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}