import React, { useEffect, useMemo, useRef, useState } from "react";

const BACKEND_URL = "http://localhost:5179";

// Keep visuals stable for each count (so new fireflies feel “added”, not reshuffled)
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeFireflies(count) {
  const capped = Math.min(count, 120);
  const rand = mulberry32(12345);

  const flies = [];
  for (let i = 0; i < capped; i++) {
    const x = rand() * 100;
    const y = rand() * 100;

    // smaller sizes read more like "lights"
    const size = 3 + rand() * 6;

    // durations
    const flicker = 1.8 + rand() * 3.2;
    const wander = 3.5 + rand() * 5.5;
    const driftDur = 10 + rand() * 18;

    // drift direction & distance
    const dx = (rand() * 2 - 1) * (120 + rand() * 240); // px
    const dy = (rand() * 2 - 1) * (30 + rand() * 120);  // px

    const delay = rand() * 2.5;

    flies.push({ id: i, x, y, size, flicker, wander, driftDur, delay, dx, dy });
  }
  return flies;
}

export default function App() {
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState("Connecting…");

  const [musicOn, setMusicOn] = useState(true);
  const [forestOn, setForestOn] = useState(true);
  const [musicVol, setMusicVol] = useState(0.35);
  const [forestVol, setForestVol] = useState(0.45);

  const musicRef = useRef(null);
  const forestRef = useRef(null);

  const fireflies = useMemo(() => makeFireflies(count), [count]);

  async function fetchCount() {
    setStatus("Loading garden…");
    const res = await fetch(`${BACKEND_URL}/api/fireflies`);
    if (!res.ok) throw new Error("GET failed");
    const data = await res.json();
    setCount(data.firefly_count);
    setStatus("Ready");
  }

  async function releaseFirefly() {
    setStatus("Releasing…");
    const res = await fetch(`${BACKEND_URL}/api/fireflies/release`, { method: "POST" });
    if (!res.ok) throw new Error("POST failed");
    const data = await res.json();
    setCount(data.firefly_count);
    setStatus("Ready");
  }

  async function resetGarden() {
    setStatus("Resetting…");
    const res = await fetch(`${BACKEND_URL}/api/fireflies/reset`, { method: "POST" });
    if (!res.ok) throw new Error("RESET failed");
    const data = await res.json();
    setCount(data.firefly_count);
    setStatus("Ready");
  }

  useEffect(() => {
    fetchCount().catch(() => setStatus("Backend not reachable"));
  }, []);

  // Keep audio refs synced
  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = musicVol;
  }, [musicVol]);

  useEffect(() => {
    if (forestRef.current) forestRef.current.volume = forestVol;
  }, [forestVol]);

  useEffect(() => {
    if (!musicRef.current) return;
    musicRef.current.muted = !musicOn;
  }, [musicOn]);

  useEffect(() => {
    if (!forestRef.current) return;
    forestRef.current.muted = !forestOn;
  }, [forestOn]);

  // Autoplay policies: start audio after first user interaction
  async function ensureAudioStarted() {
    const tasks = [];
    if (musicRef.current) tasks.push(musicRef.current.play().catch(() => {}));
    if (forestRef.current) tasks.push(forestRef.current.play().catch(() => {}));
    await Promise.all(tasks);
  }

  return (
    <div className="app" onPointerDown={ensureAudioStarted}>
      {/* Audio */}
      <audio ref={musicRef} src="/audio/music.mp3" loop />
      <audio ref={forestRef} src="/audio/forest.mp3" loop />

      {/* Background layers */}
      <div className="bg" />
      <div className="forest" />
      <div className="vignette" />
      <div className="haze" />

      <header className="header">
        <div>
          <div className="title">Firefly Garden</div>
          <div className="subtitle">Release a light into the night.</div>
        </div>

        <div className="pill">
          <span className="pillLabel">Fireflies</span>
          <span className="pillValue">{count}</span>
        </div>
      </header>

      <main className="stage" aria-label="Firefly garden">
        {fireflies.map((f) => (
          <span
            key={f.id}
            className="firefly"
            style={{
              left: `${f.x}%`,
              top: `${f.y}%`,
              width: `${f.size}px`,
              height: `${f.size}px`,
              animationDuration: `${f.flicker}s, ${f.wander}s, ${f.driftDur}s`,
              animationDelay: `${f.delay}s, ${f.delay}s, ${f.delay}s`,
              // per-firefly drift vector
              "--dx": `${f.dx}px`,
              "--dy": `${f.dy}px`
            }}
          />
        ))}

        <div className="panel">
          <button className="btn primary" onClick={releaseFirefly}>
            Release a Firefly
          </button>
          <button className="btn" onClick={resetGarden}>
            Reset
          </button>

          <div className="status">{status}</div>

          <div className="audio">
            <div className="audioRow">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={musicOn}
                  onChange={(e) => setMusicOn(e.target.checked)}
                />
                <span>Music</span>
              </label>
              <input
                className="slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={musicVol}
                onChange={(e) => setMusicVol(Number(e.target.value))}
              />
            </div>

            <div className="audioRow">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={forestOn}
                  onChange={(e) => setForestOn(e.target.checked)}
                />
                <span>Forest</span>
              </label>
              <input
                className="slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={forestVol}
                onChange={(e) => setForestVol(Number(e.target.value))}
              />
            </div>

            <div className="hint">
              Tip: if audio doesn’t start, click/tap anywhere once (browser autoplay rules).
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}