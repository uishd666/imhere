// components/Map.tsx
'use client';

import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';

// 修复 Leaflet 默认图标在 Next.js/Webpack 中不显示的问题
const fixIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

interface MapProps {
  pathData: LocationPoint[];
}

// 自动调整地图视野以适应所有标记点
const FitBounds = ({ pathData }: { pathData: LocationPoint[] }) => {
  const map = useMap();

  useEffect(() => {
    if (pathData.length === 0) return;

    if (pathData.length === 1) {
      // 只有一个点时， centered 显示，缩放级别 15
      map.setView([pathData[0].lat, pathData[0].lng], 15);
    } else {
      // 多个点时，计算边界并自适应缩放
      const bounds = L.latLngBounds(pathData.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, {
        padding: [50, 50],      // 四边留白 50px，避免标记贴边
        maxZoom: 16,            // 最大缩放级别限制，避免过度放大
        animate: true,          // 启用平滑动画
        duration: 0.5           // 动画时长 0.5秒
      });
    }
  }, [pathData, map]);

  return null;
};

// 生成带数字的自定义图标
const createNumberIcon = (number: number, type: 'start' | 'end' | 'middle') => {
  const colors = {
    start: { bg: '#10B981', border: '#059669' },  // 绿色 - 起点
    end: { bg: '#EF4444', border: '#DC2626' },    // 红色 - 终点
    middle: { bg: '#3B82F6', border: '#2563EB' }  // 蓝色 - 中间点
  };
  
  const color = colors[type];
  
  return L.divIcon({
    className: 'custom-number-marker',
    html: `
      <div style="
        background-color: ${color.bg};
        border: 2px solid ${color.border};
        color: white;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        position: relative;
        top: -14px;
        left: -14px;
      ">
        ${number}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

const MapComponent = ({ pathData }: MapProps) => {
  useEffect(() => {
    fixIcon();
  }, []);

  // 默认中心点（仅在初始无数据时使用）
  const defaultCenter: [number, number] = [39.9042, 116.4074];

  const pathLineOptions = {
    color: '#6366F1',
    weight: 4,
    opacity: 0.8
  };

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={5}  // 初始缩放级别设小一点，有数据后会自动调整
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* 自动调整视野 */}
      <FitBounds pathData={pathData} />
      
      {pathData.length > 0 && (
        <>
          {/* 路径连接线 */}
          <Polyline 
            positions={pathData.map(p => [p.lat, p.lng])} 
            {...pathLineOptions}
          />
          
          {/* 所有点位标记 */}
          {pathData.map((point, index) => {
            const isStart = index === 0;
            const isEnd = index === pathData.length - 1;
            const type = isStart ? 'start' : isEnd ? 'end' : 'middle';
            const label = isStart ? '起点' : isEnd ? '终点' : `途经点 ${index + 1}`;
            
            return (
              <Marker
                key={`${point.timestamp}-${index}`}
                position={[point.lat, point.lng]}
                icon={createNumberIcon(index + 1, type)}
              >
                <Popup>
                  <div style={{ minWidth: '150px' }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '4px',
                      color: type === 'start' ? '#10B981' : type === 'end' ? '#EF4444' : '#3B82F6'
                    }}>
                      {label} (序号: {index + 1})
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      时间: {new Date(point.timestamp).toLocaleString('zh-CN')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      坐标: {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </>
      )}
    </MapContainer>
  );
};

export default MapComponent;