import React, { useEffect, useState, useRef } from "react";
import {
  Sun, Cloud, CloudRain, CloudDrizzle, CloudSnow, CloudFog, CloudLightning,
  Wind, Droplets, MapPin, Search, Locate, CheckCircle2, AlertTriangle, XCircle, Loader2,
} from "lucide-react";
import client from "@/lib/api";
import { WEATHER } from "@/constants/testIds";

const ICON = {
  clear: Sun,
  cloudy: Cloud,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  showers: CloudRain,
  snow: CloudSnow,
  fog: CloudFog,
  storm: CloudLightning,
};

const SPRAY = {
  good: { label: "Good", tone: "bg-secondary/15 text-secondary border-secondary/40", icon: CheckCircle2 },
  caution: { label: "Caution", tone: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: AlertTriangle },
  avoid: { label: "Avoid", tone: "bg-accent/10 text-accent border-accent/40", icon: XCircle },
};

const DEFAULT_LOC = { name: "Pune", admin1: "Maharashtra", latitude: 18.5196, longitude: 73.8553 };

const cached = () => {
  try { return JSON.parse(localStorage.getItem("agriscan_weather_loc") || "null"); } catch { return null; }
};
const cache = (v) => { try { localStorage.setItem("agriscan_weather_loc", JSON.stringify(v)); } catch {} };

export default function WeatherCard() {
  const [loc, setLoc] = useState(() => cached() || DEFAULT_LOC);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimer = useRef(null);

  const load = async (l) => {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await client.get(`/weather/forecast?lat=${l.latitude}&lon=${l.longitude}&days=7`);
      setData(data);
    } catch (e) {
      setErr("Couldn't load forecast");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(loc); }, [loc.latitude, loc.longitude]); // eslint-disable-line

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const l = { name: "My location", admin1: "", latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        cache(l);
        setLoc(l);
      },
      () => {},
      { timeout: 6000 }
    );
  };

  const onSearch = (v) => {
    setQ(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (v.length < 2) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const { data } = await client.get(`/weather/geocode?q=${encodeURIComponent(v)}`);
        setResults(data.results || []);
      } catch {}
    }, 300);
  };

  const pick = (r) => {
    const l = { name: r.name, admin1: r.admin1, latitude: r.latitude, longitude: r.longitude };
    cache(l);
    setLoc(l);
    setShowSearch(false);
    setQ("");
    setResults([]);
  };

  const CurIcon = ICON[data?.current?.weather_icon || "clear"] || Sun;

  return (
    <div data-testid={WEATHER.card} className="card-soft overflow-hidden">
      <div className="p-6 bg-gradient-to-br from-primary/95 to-primary text-primary-foreground">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="label-eyebrow text-primary-foreground/70">7-day outlook</span>
            <div className="mt-1 flex items-center gap-1 text-xs text-primary-foreground/80">
              <MapPin className="w-3 h-3" /> <span className="truncate">{loc.name}{loc.admin1 ? `, ${loc.admin1}` : ""}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button data-testid={WEATHER.useGeolocation} onClick={useMyLocation} title="Use my location" className="w-8 h-8 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 transition-colors">
              <Locate className="w-4 h-4" />
            </button>
            <button onClick={() => setShowSearch((s) => !s)} title="Change location" className="w-8 h-8 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 transition-colors">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
        {showSearch && (
          <div className="mt-3 relative">
            <input
              data-testid={WEATHER.cityInput}
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search a city or district…"
              className="w-full rounded-xl border border-white/20 bg-white/10 text-primary-foreground placeholder:text-primary-foreground/50 px-3 py-2 text-sm outline-none focus:bg-white/20"
            />
            {results.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 mt-2 bg-white text-foreground rounded-xl border border-border shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                {results.map((r, i) => (
                  <li key={i}>
                    <button data-testid={WEATHER.cityResult} onClick={() => pick(r)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-muted-foreground text-xs">{r.admin1 ? `, ${r.admin1}` : ""}{r.country ? `, ${r.country}` : ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-primary-foreground/80 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading forecast…
          </div>
        ) : err ? (
          <div className="mt-6 text-sm text-primary-foreground/80">{err}</div>
        ) : data ? (
          <div className="mt-4 flex items-end gap-4">
            <CurIcon className="w-12 h-12 shrink-0" />
            <div>
              <div data-testid={WEATHER.currentTemp} className="font-heading text-4xl font-semibold leading-none">
                {Math.round(data.current.temperature)}°
              </div>
              <div className="text-xs text-primary-foreground/85 mt-1">{data.current.weather_label}</div>
            </div>
            <div className="ml-auto flex flex-col gap-1 text-[11px] text-primary-foreground/85">
              <span className="inline-flex items-center gap-1"><Droplets className="w-3 h-3" /> {data.current.humidity}%</span>
              <span className="inline-flex items-center gap-1"><Wind className="w-3 h-3" /> {Math.round(data.current.wind_kmh)} km/h</span>
            </div>
          </div>
        ) : null}
      </div>

      {data && (
        <div data-testid={WEATHER.dailyList} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="label-eyebrow text-muted-foreground">Next 7 days · Spray outlook</span>
          </div>
          <ul className="divide-y divide-border">
            {data.daily.map((d) => {
              const Icon = ICON[d.weather_icon] || Cloud;
              const s = SPRAY[d.spray_level] || SPRAY.caution;
              const SIcon = s.icon;
              const day = new Date(d.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
              return (
                <li key={d.date} data-testid={WEATHER.dayItem} className="py-2.5 flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{day}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{d.weather_label} · {d.precip_probability}% rain</div>
                  </div>
                  <div className="text-sm text-right shrink-0 tabular-nums">
                    <span className="font-semibold">{Math.round(d.temp_max)}°</span>
                    <span className="text-muted-foreground">/{Math.round(d.temp_min)}°</span>
                  </div>
                  <span data-testid={WEATHER.sprayBadge} className={`chip text-[10px] shrink-0 ${s.tone} inline-flex items-center gap-1`}>
                    <SIcon className="w-3 h-3" /> {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 text-[11px] text-muted-foreground">
            Powered by Open-Meteo · Spray tag = rain chance + wind + heat combined
          </div>
        </div>
      )}
    </div>
  );
}
