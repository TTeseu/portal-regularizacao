"use client";

import { useEffect, useMemo, useState } from "react";
import { Cloud, CloudDrizzle, CloudRain, CloudSun, Sun } from "lucide-react";

type WeatherState = {
  temperature: number | null;
  code: number | null;
  loading: boolean;
};

const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=-23.2237&longitude=-45.9009&current=temperature_2m,weather_code&timezone=America%2FSao_Paulo";

function weatherLabel(code: number | null) {
  if (code === null) return "Clima indisponível";
  if (code === 0) return "Ensolarado";
  if ([1, 2].includes(code)) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if ([45, 48].includes(code)) return "Neblina";
  if ([51, 53, 55, 56, 57].includes(code)) return "Garoa";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Chuva";
  if ([95, 96, 99].includes(code)) return "Tempestade";
  return "Tempo variável";
}

function WeatherIcon({ code }: { code: number | null }) {
  if (code === 0) return <Sun size={18} />;
  if (code !== null && [1, 2].includes(code)) return <CloudSun size={18} />;
  if (code !== null && [51, 53, 55, 56, 57].includes(code)) return <CloudDrizzle size={18} />;
  if (code !== null && [61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return <CloudRain size={18} />;
  return <Cloud size={18} />;
}

export function SidebarWeather() {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<WeatherState>({
    temperature: null,
    code: null,
    loading: true
  });

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadWeather() {
      try {
        const response = await fetch(weatherUrl, { cache: "no-store" });
        const data = await response.json();
        if (!active) return;
        setWeather({
          temperature: typeof data?.current?.temperature_2m === "number" ? data.current.temperature_2m : null,
          code: typeof data?.current?.weather_code === "number" ? data.current.weather_code : null,
          loading: false
        });
      } catch {
        if (active) {
          setWeather((current) => ({ ...current, loading: false }));
        }
      }
    }

    loadWeather();
    const timer = window.setInterval(loadWeather, 10 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const dateTime = useMemo(() => {
    const date = new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo"
    }).format(now);
    const time = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Sao_Paulo"
    }).format(now);

    return { date, time };
  }, [now]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-edp-muted shadow-lg shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-edp">São José dos Campos</div>
          <div className="mt-1 text-xs text-edp-muted">SP, Brasil</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-edp/25 bg-edp/10 text-edp">
          <WeatherIcon code={weather.code} />
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-bold text-white">
            {weather.temperature === null ? "--" : Math.round(weather.temperature)}°C
          </div>
          <div className="text-xs font-medium text-edp-muted">
            {weather.loading ? "Atualizando..." : weatherLabel(weather.code)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-white">{dateTime.time}</div>
          <div className="mt-1 text-[11px] capitalize text-edp-muted">{dateTime.date}</div>
        </div>
      </div>
    </div>
  );
}
