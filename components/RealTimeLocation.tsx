'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import createSocket from '@/lib/socket';

interface User {
  id: number;
  username: string;
}

interface RealTimeLocation {
  userId: number;
  username: string;
  lat: number;
  lng: number;
  timestamp: string;
}

interface RealTimeLocationProps {
  currentUser: User;
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
      <div className="h-80 bg-gray-100 flex items-center justify-center">
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
        // url="http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}"
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

export default function RealTimeLocation({ currentUser }: RealTimeLocationProps) {
  const [socket, setSocket] = useState<any>(null);
  const [realTimeLocations, setRealTimeLocations] = useState<RealTimeLocation[]>([]);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [watchInterval, setWatchInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socketInstance = createSocket();
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Connected to server with ID:', socketInstance.id);
      socketInstance.emit('join-room', currentUser.id.toString());
    });

    socketInstance.on('location-received', (data: any) => {
      setRealTimeLocations(prev => {
        const existingIndex = prev.findIndex(loc => loc.userId === data.fromUserId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            userId: data.fromUserId,
            username: data.username || `用户${data.fromUserId}`,
            lat: data.latitude,
            lng: data.longitude,
            timestamp: data.timestamp
          };
          return updated;
        } else {
          return [...prev, {
            userId: data.fromUserId,
            username: data.username || `用户${data.fromUserId}`,
            lat: data.latitude,
            lng: data.longitude,
            timestamp: data.timestamp
          }];
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

  const startSharing = () => {
    if (!navigator.geolocation) {
      alert('浏览器不支持地理定位');
      return;
    }

    setSharingEnabled(true);
    
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          if (socket) {
            socket.emit('location-update', {
              fromUserId: currentUser.id,
              targetUserId: 'all',
              latitude,
              longitude,
              timestamp: new Date().toISOString(),
              username: currentUser.username
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

  return (
    <div className="h-96 bg-gray-100 rounded-lg overflow-hidden mb-4">
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">实时位置共享</h3>
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
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {sharingEnabled ? '正在每5秒更新位置' : '点击开始共享你的实时位置'}
        </p>
      </div>
      
      <div className="h-80">
        <RealTimeMap realTimeLocations={realTimeLocations} />
      </div>
    </div>
  );
}