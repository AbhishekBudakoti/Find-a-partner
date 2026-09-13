import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Child controller component to fit map bounds whenever valid matches change
const MapBoundsController = ({ validMatches }) => {
  const map = useMap();

  useEffect(() => {
    if (!validMatches || validMatches.length === 0) return;

    const coordsList = validMatches.map((m) => m.profile.location.approxLocation);
    if (coordsList.length === 1) {
      map.setView(coordsList[0], 12);
    } else {
      const bounds = L.latLngBounds(coordsList);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [validMatches, map]);

  return null;
};

const PartnersMap = ({ matches = [] }) => {
  // Filter matches that have a valid approxLocation [lat, lng]
  const validMatches = matches.filter(
    (m) =>
      Array.isArray(m.profile?.location?.approxLocation) &&
      m.profile.location.approxLocation.length === 2
  );

  const defaultCenter = [20.5937, 78.9629]; // Initial fallback center

  return (
    <div className="w-full h-[480px] rounded-2xl overflow-hidden border border-slate-200 shadow-xs relative">
      {validMatches.length === 0 && (
        <div className="absolute inset-0 z-10 bg-slate-50/80 backdrop-blur-xs flex items-center justify-center text-slate-500 text-sm font-medium">
          No location pins available for these results.
        </div>
      )}
      <MapContainer
        center={defaultCenter}
        zoom={4}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <MapBoundsController validMatches={validMatches} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validMatches.map((match) => {
          const [lat, lng] = match.profile.location.approxLocation;
          const name =
            match.profile.user?.name ||
            match.profile.user?.email ||
            "Unknown";
          const distanceStr =
            match.distanceKm !== undefined
              ? `${match.distanceKm} km away`
              : null;

          return (
            <CircleMarker
              key={match.profile._id || match.profile.user?._id}
              center={[lat, lng]}
              radius={9}
              pathOptions={{
                color: "#1d4ed8",
                fillColor: "#3b82f6",
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <div className="font-bold text-sm text-slate-900">{name}</div>
                  <div className="text-slate-600 mt-0.5">
                    {match.profile.skillLevel && (
                      <span className="capitalize">{match.profile.skillLevel} · </span>
                    )}
                    {match.profile.location?.city || "Unknown city"}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="font-semibold text-blue-600">
                      Score: {match.matchScore}%
                    </span>
                    <span className="text-slate-500">({match.matchQuality})</span>
                  </div>
                  {distanceStr && (
                    <div className="text-slate-700 font-medium mt-1">
                      📍 {distanceStr}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default PartnersMap;
