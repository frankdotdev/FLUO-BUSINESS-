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
  // --- Major Commercial Districts & Hubs ---
  { name: "Ikeja / Allen / GRA", subtitle: "Ikeja Commercial Hub, Lagos", lat: 6.596, lon: 3.343, radiusKm: 6.0 },
  { name: "Victoria Island / Lekki", subtitle: "Financial District, Lagos", lat: 6.428, lon: 3.421, radiusKm: 8.0 },
  { name: "Yaba / Surulere", subtitle: "Technology & Retail, Lagos", lat: 6.500, lon: 3.360, radiusKm: 5.0 },
  { name: "Marina / Broad Street", subtitle: "Commercial Center, Lagos Island", lat: 6.453, lon: 3.395, radiusKm: 4.0 },
  { name: "Trade Fair / Alaba", subtitle: "Wholesale & Electronics, Lagos", lat: 6.463, lon: 3.208, radiusKm: 5.0 },
  { name: "Central Business District", subtitle: "Central Area, Abuja FCT", lat: 9.057, lon: 7.495, radiusKm: 5.0 },
  { name: "Wuse 2 / Maitama", subtitle: "Retail & Dining, Abuja FCT", lat: 9.076, lon: 7.472, radiusKm: 5.0 },
  { name: "Garki / Asokoro", subtitle: "Commercial & Business, Abuja", lat: 9.032, lon: 7.489, radiusKm: 5.0 },
  { name: "Gwarinpa / Kubwa", subtitle: "Abuja Metropolis", lat: 9.110, lon: 7.375, radiusKm: 7.0 },
  { name: "Independence Layout", subtitle: "Commercial & Admin, Enugu", lat: 6.448, lon: 7.518, radiusKm: 4.0 },
  { name: "Ogbete Market / Coal Camp", subtitle: "Trading & Retail Hub, Enugu", lat: 6.442, lon: 7.493, radiusKm: 4.0 },
  { name: "New Haven / Ogui", subtitle: "Enugu Metropolis", lat: 6.447, lon: 7.512, radiusKm: 3.5 },
  { name: "Onitsha Main Market", subtitle: "Commercial Center, Anambra", lat: 6.155, lon: 6.776, radiusKm: 7.0 },
  { name: "Nnewi Industrial Hub", subtitle: "Auto & Manufacturing, Anambra", lat: 6.019, lon: 6.917, radiusKm: 5.0 },
  { name: "Port Harcourt / GRA", subtitle: "Commercial Hub, Rivers", lat: 4.815, lon: 7.010, radiusKm: 6.0 },
  { name: "Trans-Amadi Industrial", subtitle: "Industrial Layout, Port Harcourt", lat: 4.812, lon: 7.042, radiusKm: 5.0 },
  { name: "Aba Commercial / Ariaria", subtitle: "Trading & Footwear Hub, Abia", lat: 5.116, lon: 7.340, radiusKm: 6.0 },
  { name: "Bodija / Dugbe", subtitle: "Commercial Center, Ibadan, Oyo", lat: 7.398, lon: 3.896, radiusKm: 6.0 },
  { name: "Kano Commercial District", subtitle: "Kano Metropolis", lat: 12.002, lon: 8.591, radiusKm: 8.0 },
  { name: "Warri / Effurun", subtitle: "Commercial District, Delta", lat: 5.544, lon: 5.760, radiusKm: 6.0 },
  { name: "Benin City Commercial", subtitle: "King's Square & Ring Rd, Edo", lat: 6.335, lon: 5.603, radiusKm: 6.0 },
  { name: "Asaba Metropolis", subtitle: "Delta State", lat: 6.198, lon: 6.732, radiusKm: 6.0 },
  { name: "Uyo Metropolis", subtitle: "Akwa Ibom State", lat: 5.037, lon: 7.912, radiusKm: 6.0 },
  { name: "Calabar Metropolis", subtitle: "Cross River State", lat: 4.975, lon: 8.341, radiusKm: 6.0 },

  // --- Enugu State Universities & Polytechnics ---
  { name: "Caritas University", subtitle: "Amorji-Nike, Enugu", lat: 6.518, lon: 7.562, radiusKm: 3.5 },
  { name: "Coal City University", subtitle: "Emene, Enugu", lat: 6.471, lon: 7.575, radiusKm: 3.5 },
  { name: "Godfrey Okoye University", subtitle: "Thinkers Corner, Enugu", lat: 6.467, lon: 7.534, radiusKm: 3.0 },
  { name: "SUMAS (Medical & Applied Sci.)", subtitle: "Igbo-Eno, Enugu", lat: 6.942, lon: 7.468, radiusKm: 4.5 },
  { name: "Maduka University", subtitle: "Ekwegbe-Nsukka, Enugu", lat: 6.782, lon: 7.426, radiusKm: 4.0 },
  { name: "UNN Main Campus", subtitle: "Nsukka, Enugu", lat: 6.866, lon: 7.411, radiusKm: 5.0 },
  { name: "UNEC Campus", subtitle: "Enugu Metropolis, Enugu", lat: 6.432, lon: 7.508, radiusKm: 3.5 },
  { name: "ESUT Agbani Campus", subtitle: "Agbani, Enugu", lat: 6.353, lon: 7.531, radiusKm: 4.5 },
  { name: "IMT Campus (Polytechnic)", subtitle: "Independence Layout, Enugu", lat: 6.452, lon: 7.525, radiusKm: 3.0 },
  { name: "Fed. College of Dental Tech (FCDTT)", subtitle: "Trans-Ekulu, Enugu", lat: 6.472, lon: 7.498, radiusKm: 3.0 },
  { name: "Enugu State Polytechnic", subtitle: "Iwollo, Enugu", lat: 6.418, lon: 7.289, radiusKm: 4.0 },
  { name: "OSISATECH Polytechnic", subtitle: "Ogui, Enugu", lat: 6.441, lon: 7.501, radiusKm: 2.5 },
  { name: "Renaissance University", subtitle: "Ugbawka, Enugu", lat: 6.291, lon: 7.585, radiusKm: 4.0 },
  { name: "Peaceland College", subtitle: "Independence Layout, Enugu", lat: 6.448, lon: 7.518, radiusKm: 2.5 },
  { name: "FCE Eha-Amufu", subtitle: "Eha-Amufu, Enugu", lat: 6.657, lon: 7.759, radiusKm: 4.0 },

  // --- Ebonyi State Campuses & Towns ---
  { name: "EBSU Ishieke Campus", subtitle: "Abakaliki, Ebonyi", lat: 6.415, lon: 8.156, radiusKm: 4.0 },
  { name: "EBSU CAS Campus", subtitle: "Abakaliki, Ebonyi", lat: 6.326, lon: 8.113, radiusKm: 3.0 },
  { name: "EBSU Presco Campus", subtitle: "Abakaliki, Ebonyi", lat: 6.318, lon: 8.098, radiusKm: 2.5 },
  { name: "AE-FUNAI Main Campus", subtitle: "Ikwo, Ebonyi", lat: 6.136, lon: 8.136, radiusKm: 5.0 },
  { name: "Federal Polytechnic Isu", subtitle: "Isu, Ebonyi", lat: 6.042, lon: 7.915, radiusKm: 4.0 },
  { name: "College of Agriculture Ishiagu", subtitle: "Ishiagu, Ebonyi", lat: 5.947, lon: 7.568, radiusKm: 3.5 },
  { name: "Abakaliki Urban", subtitle: "Ebonyi State", lat: 6.324, lon: 8.114, radiusKm: 15.0 },

  // --- Anambra State Campuses ---
  { name: "UNIZIK Main Campus", subtitle: "Awka, Anambra", lat: 6.248, lon: 7.121, radiusKm: 5.0 },
  { name: "COOU Igbariam Campus", subtitle: "Igbariam, Anambra", lat: 6.342, lon: 6.945, radiusKm: 4.0 },
  { name: "COOU Uli Campus", subtitle: "Uli, Anambra", lat: 5.782, lon: 6.871, radiusKm: 4.0 },
  { name: "Federal Polytechnic Oko", subtitle: "Oko, Anambra", lat: 6.041, lon: 7.081, radiusKm: 4.0 },
  { name: "Paul University", subtitle: "Awka, Anambra", lat: 6.216, lon: 7.069, radiusKm: 2.5 },
  { name: "Tansian University", subtitle: "Umunya, Anambra", lat: 6.208, lon: 6.915, radiusKm: 3.5 },

  // --- Imo & Abia State Campuses ---
  { name: "FUTO Campus", subtitle: "Owerri, Imo", lat: 5.385, lon: 7.009, radiusKm: 4.5 },
  { name: "IMSU Campus", subtitle: "Owerri, Imo", lat: 5.502, lon: 7.042, radiusKm: 3.5 },
  { name: "Federal Polytechnic Nekede", subtitle: "Nekede, Owerri, Imo", lat: 5.438, lon: 7.028, radiusKm: 3.5 },
  { name: "Alvan Ikoku Federal College", subtitle: "Owerri, Imo", lat: 5.492, lon: 7.025, radiusKm: 2.5 },
  { name: "ABSU Uturu Campus", subtitle: "Uturu, Abia", lat: 5.828, lon: 7.408, radiusKm: 4.5 },
  { name: "MOUAU Umudike Campus", subtitle: "Umudike, Umuahia, Abia", lat: 5.478, lon: 7.545, radiusKm: 4.5 },
  { name: "Abia State Polytechnic", subtitle: "Aba, Abia", lat: 5.126, lon: 7.368, radiusKm: 3.0 },

  // --- Lagos & South-West Campuses ---
  { name: "UNILAG Akoka Campus", subtitle: "Yaba, Lagos", lat: 6.518, lon: 3.398, radiusKm: 3.5 },
  { name: "YabaTech Campus", subtitle: "Yaba, Lagos", lat: 6.516, lon: 3.376, radiusKm: 2.5 },
  { name: "LASU Ojo Campus", subtitle: "Ojo, Lagos", lat: 6.467, lon: 3.199, radiusKm: 4.5 },
  { name: "Pan-Atlantic University (PAU)", subtitle: "Ibeju-Lekki, Lagos", lat: 6.486, lon: 3.829, radiusKm: 4.0 },
  { name: "LASUSTECH Ikorodu", subtitle: "Ikorodu, Lagos", lat: 6.643, lon: 3.518, radiusKm: 4.0 },
  { name: "UI Main Campus", subtitle: "Ibadan, Oyo", lat: 7.444, lon: 3.9, radiusKm: 4.5 },
  { name: "The Polytechnic Ibadan", subtitle: "Ibadan, Oyo", lat: 7.435, lon: 3.875, radiusKm: 3.5 },
  { name: "OAU Campus", subtitle: "Ile-Ife, Osun", lat: 7.518, lon: 4.526, radiusKm: 4.5 },
  { name: "FUTA Campus", subtitle: "Akure, Ondo", lat: 7.302, lon: 5.138, radiusKm: 4.0 },
  { name: "Covenant University", subtitle: "Ota, Ogun", lat: 6.672, lon: 3.158, radiusKm: 4.0 },
  { name: "Babcock University", subtitle: "Ilishan-Remo, Ogun", lat: 6.892, lon: 3.718, radiusKm: 4.0 },
  { name: "FUNAAB Campus", subtitle: "Abeokuta, Ogun", lat: 7.228, lon: 3.442, radiusKm: 4.5 },

  // --- South-South & Northern Campuses ---
  { name: "UNIBEN Ugbowo Campus", subtitle: "Benin City, Edo", lat: 6.398, lon: 5.614, radiusKm: 4.5 },
  { name: "UNIPORT Choba Campus", subtitle: "Port Harcourt, Rivers", lat: 4.904, lon: 6.924, radiusKm: 4.5 },
  { name: "Rivers State University (RSU)", subtitle: "Port Harcourt, Rivers", lat: 4.802, lon: 6.982, radiusKm: 3.5 },
  { name: "DELSU Abraka Campus", subtitle: "Abraka, Delta", lat: 5.791, lon: 6.102, radiusKm: 4.0 },
  { name: "FUPRE Effurun Campus", subtitle: "Effurun, Delta", lat: 5.568, lon: 5.795, radiusKm: 3.5 },
  { name: "UNICAL Campus", subtitle: "Calabar, Cross River", lat: 4.952, lon: 8.349, radiusKm: 4.0 },
  { name: "UniAbuja Main Campus", subtitle: "Gwagwalada, Abuja", lat: 8.981, lon: 7.078, radiusKm: 5.0 },
  { name: "ABU Samaru Campus", subtitle: "Zaria, Kaduna", lat: 11.152, lon: 7.649, radiusKm: 5.0 },
  { name: "FUTMINNA Main Campus", subtitle: "Gidan Kwano, Minna, Niger", lat: 9.532, lon: 6.449, radiusKm: 4.5 },
  { name: "UNILORIN Main Campus", subtitle: "Ilorin, Kwara", lat: 8.479, lon: 4.672, radiusKm: 5.0 },
  { name: "Kwara State Polytechnic", subtitle: "Ilorin, Kwara", lat: 8.542, lon: 4.618, radiusKm: 3.5 },
  { name: "BUK New Campus", subtitle: "Kano, Kano", lat: 11.979, lon: 8.428, radiusKm: 5.0 },
  { name: "UNIJOS Naraguta Campus", subtitle: "Jos, Plateau", lat: 9.956, lon: 8.895, radiusKm: 4.5 },
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
  const [locationName, setLocationName] = useState("Discover");
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

  const ipFallback = async () => {
    try {
      const ipRes = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3500) });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.city && ipData.region) {
          saveLocation(`${ipData.city}, ${ipData.region}`);
          return;
        } else if (ipData.city) {
          saveLocation(ipData.city);
          return;
        }
      }
    } catch {}
    saveLocation("Enugu Metropolis");
  };

  const autoDetectLocation = () => {
    setDetecting(true);

    if (!("geolocation" in navigator)) {
      ipFallback().finally(() => setDetecting(false));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        // Step 1: Check known commercial districts, towns, or campuses first
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

        // Step 2: Reverse geocode via BigDataCloud client API (free, reliable client-side geocoding)
        try {
          const bdc = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (bdc.ok) {
            const data = await bdc.json();
            const loc = data.locality || data.city;
            const state = data.principalSubdivision;
            if (loc && state && loc !== state) {
              saveLocation(`${loc}, ${state}`);
              setDetecting(false);
              return;
            } else if (loc || state) {
              saveLocation(loc || state);
              setDetecting(false);
              return;
            }
          }
        } catch {}

        // Step 3: Fallback reverse geocode with OpenStreetMap Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" }, signal: AbortSignal.timeout(4000) }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const local = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter;
            const city = addr.city || addr.town || addr.municipality || addr.state;
            if (local && city && local !== city) {
              saveLocation(`${local}, ${city}`);
            } else {
              saveLocation(city || local || "Nigeria");
            }
          } else {
            await ipFallback();
          }
        } catch {
          await ipFallback();
        } finally {
          setDetecting(false);
        }
      },
      async (err) => {
        console.log("GPS permission unavailable or dismissed:", err.message);
        await ipFallback();
        setDetecting(false);
      },
      { timeout: 6000, maximumAge: 600000 }
    );
  };

  const saveLocation = (name: string) => {
    setLocationName(name);
    localStorage.setItem("fluo_user_location", name);
    try {
      document.cookie = `fluo_user_location=${encodeURIComponent(name)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
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
                <span className="section-kicker" style={{ margin: "0 0 2px" }}>COMMUNITY, CITY &amp; CAMPUS SELECTION</span>
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
              placeholder="Search city, district, campus, or town..."
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
