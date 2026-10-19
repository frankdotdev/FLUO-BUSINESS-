"use client";

import { useState, useEffect } from "react";
import { IconMapPin, IconChevronDown, IconCheck, IconX, IconSparkles } from "@/components/icons.tsx";

interface KnownLandmark {
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  radiusKm: number;
}

const KNOWN_LANDMARKS: KnownLandmark[] = [
  { name: "EBSU Ishieke Campus", subtitle: "Abakaliki, Ebonyi", lat: 6.415, lon: 8.156, radiusKm: 4.0 },
  { name: "EBSU CAS Campus", subtitle: "Abakaliki, Ebonyi", lat: 6.326, lon: 8.113, radiusKm: 3.0 },
  { name: "EBSU Presco Campus", subtitle: "Abakaliki, Ebonyi", lat: 6.318, lon: 8.098, radiusKm: 2.5 },
  { name: "AE-FUNAI Main Campus", subtitle: "Ikwo, Ebonyi", lat: 6.136, lon: 8.136, radiusKm: 5.0 },
  { name: "UNN Main Campus", subtitle: "Nsukka, Enugu", lat: 6.866, lon: 7.411, radiusKm: 5.0 },
  { name: "UNEC Campus", subtitle: "Enugu, Enugu", lat: 6.432, lon: 7.508, radiusKm: 3.5 },
  { name: "ESUT Agbani Campus", subtitle: "Enugu, Enugu", lat: 6.353, lon: 7.531, radiusKm: 4.0 },
  { name: "UNILAG Akoka Campus", subtitle: "Yaba, Lagos", lat: 6.518, lon: 3.398, radiusKm: 3.5 },
  { name: "YabaTech Campus", subtitle: "Yaba, Lagos", lat: 6.516, lon: 3.376, radiusKm: 2.5 },
  { name: "FUTO Campus", subtitle: "Owerri, Imo", lat: 5.385, lon: 7.009, radiusKm: 4.5 },
  { name: "UI Main Campus", subtitle: "Ibadan, Oyo", lat: 7.444, lon: 3.9, radiusKm: 4.5 },
  { name: "OAU Campus", subtitle: "Ile-Ife, Osun", lat: 7.518, lon: 4.526, radiusKm: 4.5 },
  { name: "Abakaliki Urban", subtitle: "Ebonyi State", lat: 6.324, lon: 8.114, radiusKm: 15.0 },
  { name: "Enugu Metropolis", subtitle: "Enugu State", lat: 6.458, lon: 7.546, radiusKm: 20.0 },
];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function LocationPill() {
  const [locationName, setLocationName] = useState("Abakaliki");
  const [isOpen, setIsOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // 1. Read stored location
    const stored = localStorage.getItem("fluo_user_location");
    if (stored) {
      setLocationName(stored);
      return;
    }

    // 2. Auto-detect if available
    autoDetectLocation();
  }, []);

  const autoDetectLocation = () => {
    if (!("geolocation" in navigator)) return;
    setDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Check known landmarks/campuses first
        let closestMatch: KnownLandmark | null = null;
        let minDistance = Infinity;

        for (const landmark of KNOWN_LANDMARKS) {
          const dist = haversineDistance(latitude, longitude, landmark.lat, landmark.lon);
          if (dist <= landmark.radiusKm && dist < minDistance) {
            minDistance = dist;
            closestMatch = landmark;
          }
        }

        if (closestMatch) {
          saveLocation(closestMatch.name);
          setDetecting(false);
          return;
        }

        // Fallback: reverse geocode with OpenStreetMap Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const city =
              addr.city || addr.town || addr.suburb || addr.neighbourhood || addr.state || "Abakaliki";
            saveLocation(city);
          } else {
            saveLocation("Abakaliki");
          }
        } catch {
          saveLocation("Abakaliki");
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        console.log("Location auto-detect permission not granted or timeout:", err.message);
        setDetecting(false);
      },
      { timeout: 7000, maximumAge: 600000 }
    );
  };

  const saveLocation = (name: string) => {
    setLocationName(name);
    localStorage.setItem("fluo_user_location", name);
    // Dispatch custom event so any active feed components can react
    window.dispatchEvent(new CustomEvent("fluo:location-change", { detail: { location: name } }));
    setIsOpen(false);
  };

  const filteredLandmarks = KNOWN_LANDMARKS.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <button
        type="button"
        className="location-pill"
        onClick={() => setIsOpen(true)}
        style={{
          background: "transparent",
          cursor: "pointer",
          border: "1px solid var(--line)",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "var(--ink)",
          fontWeight: 600,
        }}
        aria-label="Change current campus or city location"
      >
        <span className="pin-dot"></span>
        <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {detecting ? "Locating..." : locationName}
        </span>
        <IconChevronDown size={13} style={{ color: "var(--muted)" }} />
      </button>

      {/* Location Selector Modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(23, 33, 38, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              border: "1px solid var(--line)",
              padding: "24px 24px 20px",
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
              animation: "dashReveal 0.2s ease both",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <span className="section-kicker" style={{ margin: "0 0 2px" }}>CAMPUS &amp; CITY SELECTION</span>
                <h3 style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, margin: 0 }}>
                  Choose Your Location
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: 4,
                }}
              >
                <IconX size={18} />
              </button>
            </div>

            {/* Auto-detect button */}
            <button
              type="button"
              onClick={autoDetectLocation}
              disabled={detecting}
              className="secondary-button"
              style={{
                width: "100%",
                justifyContent: "center",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px",
                fontSize: 13,
                marginBottom: 16,
                background: "var(--coral-soft)",
                borderColor: "var(--coral)",
                color: "var(--coral-dark)",
                fontWeight: 700,
              }}
            >
              <IconSparkles size={16} />
              {detecting ? "Acquiring GPS coordinates..." : "Auto-Detect My Current Location"}
            </button>

            {/* Filter Search */}
            <input
              type="text"
              placeholder="Search campus, town, or state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid var(--line)",
                fontSize: 13,
                outline: "none",
                marginBottom: 12,
              }}
            />

            {/* Landmarks List */}
            <div style={{ maxHeight: 280, overflowY: "auto", display: "grid", gap: 6 }}>
              {filteredLandmarks.map((l) => {
                const isSelected = locationName === l.name;
                return (
                  <button
                    key={l.name}
                    type="button"
                    onClick={() => saveLocation(l.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: `1px solid ${isSelected ? "var(--coral)" : "var(--line)"}`,
                      background: isSelected ? "var(--coral-soft)" : "var(--canvas)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <strong style={{ display: "block", fontSize: 13, color: isSelected ? "var(--coral-dark)" : "var(--ink)" }}>
                        {l.name}
                      </strong>
                      <small style={{ fontSize: 11, color: "var(--muted)" }}>{l.subtitle}</small>
                    </div>
                    {isSelected && <IconCheck size={16} style={{ color: "var(--coral-dark)" }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
