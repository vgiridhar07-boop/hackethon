import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LocationPreviewMapProps {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  className?: string;
}

export const LocationPreviewMap: React.FC<LocationPreviewMapProps> = ({
  latitude,
  longitude,
  accuracy,
  address,
  className = 'h-48 w-full rounded-stitch-card overflow-hidden border border-stitch-surface-border',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not yet created
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom high-contrast sovereign pin
      const pinIcon = L.divIcon({
        className: 'custom-osm-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
            <div style="width: 32px; height: 32px; background: #0F172A; border: 2.5px solid #FFFFFF; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
              <div style="width: 10px; height: 10px; background: #EA580C; border-radius: 50%; transform: rotate(45deg);"></div>
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -34],
      });

      const marker = L.marker([latitude, longitude], { icon: pinIcon }).addTo(map);
      if (address) {
        marker.bindPopup(
          `<div style="font-family: inherit; font-size: 11px; padding: 2px;">
            <strong style="color: #0F172A; display: block; font-size: 12px; margin-bottom: 2px;">Verified Resident Location</strong>
            <span style="color: #475569;">${address}</span><br/>
            <span style="color: #0284C7; font-family: monospace; font-size: 10px;">GPS: ${latitude.toFixed(6)}° N, ${longitude.toFixed(6)}° E</span>
          </div>`
        );
      }

      const circle = L.circle([latitude, longitude], {
        radius: Math.max(accuracy, 10),
        color: '#2563EB',
        fillColor: '#3B82F6',
        fillOpacity: 0.18,
        weight: 1.5,
      }).addTo(map);

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      // Invalidate map size after mount
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    } else {
      // Update existing map, marker, and accuracy circle
      const map = mapRef.current;
      map.setView([latitude, longitude], 16, { animate: true });

      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
        if (address) {
          markerRef.current.setPopupContent(
            `<div style="font-family: inherit; font-size: 11px; padding: 2px;">
              <strong style="color: #0F172A; display: block; font-size: 12px; margin-bottom: 2px;">Verified Resident Location</strong>
              <span style="color: #475569;">${address}</span><br/>
              <span style="color: #0284C7; font-family: monospace; font-size: 10px;">GPS: ${latitude.toFixed(6)}° N, ${longitude.toFixed(6)}° E</span>
            </div>`
          );
        }
      }

      if (circleRef.current) {
        circleRef.current.setLatLng([latitude, longitude]);
        circleRef.current.setRadius(Math.max(accuracy, 10));
      }
    }

    return () => {
      // Map cleanup on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, accuracy, address]);

  return (
    <div className="relative group">
      <div ref={mapContainerRef} className={className} />
      {/* OSM Attribution Pill */}
      <div className="absolute bottom-1 right-2 z-400 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] font-mono text-slate-600 shadow-xs border border-slate-200 pointer-events-none">
        OpenStreetMap • Leaflet GIS
      </div>
    </div>
  );
};

