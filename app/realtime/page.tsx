'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import createSocket from '@/lib/socket';

interface User {
  id: number;
  username: string;
}

interface RealtimeSession {
  id: number;
  initiator: User;
  target: User;
  status: 'pending' | 'active' | 'ended';
  created_at: string;
}

interface RealTimeLocation {
  userId: number;
  username: string;
  lat: number;
  lng: number;
  timestamp: string;
}

function RealTimeMap({ realTimeLocations }: { realTimeLocations: RealTimeLocation[] }) {
  const [L, setL] = useState<any>(null);
  const [MapContainer, setMapContainer] = useState<any>(null);
  const [TileLayer, setTileLayer] = useState<any>(null);
  const [Marker, setMarker] = useState<any>(null);
  const [Popup, setPopup] = useState<any>(null);

  useEffect(() => {
    const loadLeaflet = async () => {
      const [leafletModule, reactLeafletModule] = await Promise.all([
        import('leaflet'),
        import('react-leaflet')
      ]);
      
      const L = leafletModule.default;
      const { MapContainer, TileLayer, Marker, Popup } = reactLeafletModule;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      setL(L);
      setMapContainer(() => MapContainer);
      setTileLayer(() => TileLayer);
      setMarker(() => Marker);
      setPopup(() => Popup);
    };

    loadLeaflet();
  }, []);

  const createLocationIcon = (username: string) => {
    if (!L) return null;
    
    return L.divIcon({
      className: 'custom-location-marker',
      html: `
        <div style="
          background-color: #EF4444;
          border: 2px solid #DC2626;
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          position: relative;
          top: -16px;
          left: -16px;
        ">
          ${username.substring(0, 2).toUpperCase()}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  };

  if (!MapContainer || !TileLayer || !Marker || !Popup || !L) {
    return (
      <div className="h-full bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">加载地图组件中...</div>
      </div>
    );
  }

  const defaultCenter: [number, number] = [39.9042, 116.4074];

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={10} 
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; AutoNavi'
        url="https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
      />
      
      {realTimeLocations.map((location) => (
        <Marker
          key={location.userId}
          position={[location.lat, location.lng]}
          icon={createLocationIcon(location.username)}
        >
          <Popup>
            <div style={{ minWidth: '150px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {location.username}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                时间: {new Date(location.timestamp).toLocaleString('zh-CN')}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                坐标: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default function RealTimePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [socket, setSocket] = useState<any>(null);
  const [realTimeLocations, setRealTimeLocations] = useState<RealTimeLocation[]>([]);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [watchInterval, setWatchInterval] = useState<NodeJS.Timeout | null>(null);
  const [activeSessions, setActiveSessions] = useState<RealtimeSession[]>([]);
  const [pendingSessions, setPendingSessions] = useState<RealtimeSession[]>([]);
  const [currentSession, setCurrentSession] = useState<RealtimeSession | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }

    const fetchUsers = async () => {
      try {
        const res = await api.get('/users/all');
        setUsers(Array.isArray(res.data) ? res.data : res.data.users || []);
      } catch (err) {
        console.error("加载用户失败", err);
      }
    };
    fetchUsers();
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;

    const socketInstance = createSocket();
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Connected to server with ID:', socketInstance.id);
      socketInstance.emit('join-room', currentUser.id.toString());
    });

    socketInstance.on('location-received', (data: any) => {
      setRealTimeLocations(prev => {
        const existingIndex = prev.findIndex(loc => loc.userId === data.fromUserId);
        const locationData = {
          userId: data.fromUserId,
          username: data.username || `用户${data.fromUserId}`,
          lat: data.latitude,
          lng: data.longitude,
          timestamp: data.timestamp
        };
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = locationData;
          return updated;
        } else {
          return [...prev, locationData];
        }
      });
    });

    return () => {
      socketInstance.disconnect();
      if (watchInterval) {
        clearInterval(watchInterval);
      }
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchSessions = async () => {
      try {
        const [activeRes, pendingRes] = await Promise.all([
          api.get('/realtime/active'),
          api.get('/realtime/pending')
        ]);
        
        setActiveSessions(activeRes.data.sessions || []);
        setPendingSessions(pendingRes.data.sessions || []);
      } catch (err) {
        console.error("加载会话失败", err);
      }
    };
    
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const startSession = async () => {
    if (!selectedUser) {
      alert('请选择要共享位置的用户');
      return;
    }

    try {
      const res = await api.post('/realtime/start', { targetId: parseInt(selectedUser) });
      const session = res.data.session;
      
      if (res.data.message === 'Active session already exists') {
        setCurrentSession(session);
        joinRealtimeSession(session);
      } else {
        setCurrentSession(session);
        alert('会话发起成功，等待对方接受');
      }
    } catch (err: any) {
      alert('发起会话失败: ' + (err.response?.data?.message || err.message));
    }
  };

  const acceptSession = async (sessionId: number) => {
    try {
      const res = await api.post('/realtime/accept', { sessionId });
      const session = res.data.session;
      setCurrentSession(session);
      joinRealtimeSession(session);
      alert('会话已接受，开始共享位置');
    } catch (err: any) {
      alert('接受会话失败: ' + (err.response?.data?.message || err.message));
    }
  };

  const endSession = async () => {
    if (!currentSession) return;
    
    try {
      await api.post('/realtime/end', { sessionId: currentSession.id });
      setCurrentSession(null);
      setSharingEnabled(false);
      if (watchInterval) {
        clearInterval(watchInterval);
        setWatchInterval(null);
      }
      alert('会话已结束');
    } catch (err: any) {
      alert('结束会话失败: ' + (err.response?.data?.message || err.message));
    }
  };

  const joinRealtimeSession = (session: RealtimeSession) => {
    if (!socket || !currentUser) return;
    
    const targetUserId = session.initiator.id === currentUser.id ? session.target.id : session.initiator.id;
    socket.emit('join-realtime-session', { targetUserId });
  };

  const startSharing = () => {
    if (!currentUser || !currentSession) {
      alert('请先建立会话');
      return;
    }

    if (!navigator.geolocation) {
      alert('浏览器不支持地理定位');
      return;
    }

    const targetUserId = currentSession.initiator.id === currentUser.id ? currentSession.target.id : currentSession.initiator.id;
    
    setSharingEnabled(true);
    
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          if (socket) {
            socket.emit('location-update', {
              targetUserId: targetUserId.toString(),
              latitude,
              longitude,
              timestamp: new Date().toISOString()
            });
          }
        },
        (error) => {
          console.error('获取位置失败:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }, 5000);

    setWatchInterval(interval);
  };

  const stopSharing = () => {
    setSharingEnabled(false);
    if (watchInterval) {
      clearInterval(watchInterval);
      setWatchInterval(null);
    }
  };

  const clearAllSessions = async () => {
    if (!confirm('确定要清除所有会话吗？此操作不可撤销。')) {
      return;
    }

    try {
      await api.delete('/realtime/all');
      setActiveSessions([]);
      setPendingSessions([]);
      setCurrentSession(null);
      alert('所有会话已清除');
    } catch (err: any) {
      alert('清除会话失败: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredUsers = currentUser ? users.filter(u => u.id !== currentUser.id) : users;
  const sessionUsers = new Set([
    ...activeSessions.map(s => s.initiator.id),
    ...activeSessions.map(s => s.target.id),
    ...pendingSessions.map(s => s.initiator.id),
    ...pendingSessions.map(s => s.target.id)
  ]);
  
  const availableUsers = filteredUsers.filter(u => !sessionUsers.has(u.id));

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white shadow-md z-10">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">实时位置共享</h3>
          
          {!currentSession ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">选择用户</label>
                  <select 
                    className="border p-2 rounded text-black min-w-[150px]"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    <option value="">-- 选择用户 --</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={startSession}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  发起会话
                </button>
                {(activeSessions.length > 0 || pendingSessions.length > 0) && (
                  <button
                    onClick={clearAllSessions}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    清除所有会话
                  </button>
                )}
              </div>
              
              {pendingSessions.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">待处理的会话:</p>
                  {pendingSessions.map(session => (
                    <div key={session.id} className="flex items-center gap-2 mb-2">
                      <span className="text-sm">
                        {session.initiator.username} 请求共享位置
                      </span>
                      {session.target.id === currentUser?.id && (
                        <button
                          onClick={() => acceptSession(session.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          接受
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    正在与 {currentSession.initiator.id === currentUser?.id ? currentSession.target.username : currentSession.initiator.username} 共享位置
                  </p>
                  <p className="text-xs text-gray-500">
                    会话ID: {currentSession.id}
                  </p>
                </div>
                <button
                  onClick={endSession}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  结束会话
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={sharingEnabled ? stopSharing : startSharing}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    sharingEnabled
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {sharingEnabled ? '停止共享' : '开始共享'}
                </button>
                <p className="text-sm text-gray-500">
                  {sharingEnabled ? '正在每5秒更新位置' : '点击开始共享你的实时位置'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 relative z-0">
        <RealTimeMap realTimeLocations={realTimeLocations} />
      </div>
    </div>
  );
}