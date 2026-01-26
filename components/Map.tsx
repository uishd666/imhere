// components/Map.tsx
'use client';

import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

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

const MapComponent = ({ pathData }: MapProps) => {
  useEffect(() => {
    fixIcon();
  }, []);

  // 默认中心点（北京）
  const centerPosition: [number, number] = pathData.length > 0 
    ? [pathData[0].lat, pathData[0].lng] 
    : [39.9042, 116.4074];

  return (
    <MapContainer center={centerPosition} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {pathData.length > 0 && (
        <>
          <Polyline 
            positions={pathData.map(p => [p.lat, p.lng])} 
            color="blue" 
            weight={4}
          />
          <Marker position={[pathData[0].lat, pathData[0].lng]}>
            <Popup>起点: {new Date(pathData[0].timestamp).toLocaleString()}</Popup>
          </Marker>
          <Marker position={[pathData[pathData.length - 1].lat, pathData[pathData.length - 1].lng]}>
            <Popup>终点: {new Date(pathData[pathData.length - 1].timestamp).toLocaleString()}</Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
};

export default MapComponent;