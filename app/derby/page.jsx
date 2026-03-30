"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROOM_ID } from "@/lib/derbyConfig";
import { simulateDerbyRace } from "@/lib/derbyRace";

const SEGMENTS = ["START", "EARLY", "MID", "LATE", "FINAL"];

const HORSE_COLORS = {
  "01": "#df5a5a",
  "02": "#4b7fff",
  "03": "#3fa45b",
  "04": "#d7a620",
  "05": "#8b63db",
};

function HorseIcon({ horseId, number, size = 74 }) {
  const color = HORSE_COLORS[horseId] || "#777";
  const h = Math.round(size * 0.62);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: h,
        display: "inline-block",
      }}
    >
      <svg viewBox="0 0 180 110" width={size} height={h} aria-hidden="true">
        <g>
          <path
            d="M36 66 C36 48, 52 38, 76 38 L118 38 C140 38, 154 49, 160 64 L169 63 C175 62, 178 64, 179 68 C180 72, 177 75, 171 77 L161 79 C156 90, 143 98, 123 98 L70 98 C49 98, 36 87, 36 66 Z"
            fill="#ffffff"
            stroke="#1a1a1a"
            strokeWidth="4"
          />
          <path
            d="M108 38 C108 20, 123 9, 141 9 C152 9, 163 14, 169 24 L154 29 C149 23, 142 20, 135 20 C124 20, 115 27, 115 38 Z"
            fill="#ffffff"
            stroke="#1a1a1a"
            strokeWidth="4"
          />
          <path
            d="M157 24 L173 13"
            stroke="#1a1a1a"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M58 98 L54 108"
            stroke="#1a1a1a"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M82 98 L78 108"
            stroke="#1a1a1a"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M116 98 L112 108"
            stroke="#1a1a1a"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M142 97 L146 108"
            stroke="#1a1a1a"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M36 62 L20 50"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <rect
            x="82"
            y="50"
            rx="7"
            ry="7"
            width="34"
            height="22"
            fill={color}
            stroke="#1a1a1a"
            strokeWidth="3"
          />
          <circle cx="144" cy="31" r="3.3" fill="#1a1a1a" />
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          right: -2,
          top: -4,
          width: Math.round(size * 0.27),
          height: Math.round(size * 0.27),
          borderRadius: "50%",
          background: color,
          color: "#fff",
          border: "2px solid #fff",
          display: "grid",
          placeItems: "center",
          fontSize: Math.max(10, Math.round(size * 0.15)),
          fontWeight: 800,
          lineHeight: 1,
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      >
        {number}
      </div>
    </div>
  );
}

function LaneBadge({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#111", fg: "#fff", bd: "#111" },
    event: { bg: "#fff6df", fg: "#6d5500", bd: "#ead9a8" },
    result: { bg: "#eef6ff", fg: "#174b86", bd: "#cfe2fb" },
  };
  const c = tones[tone] || tones.neutral;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 9px",
        borderRadius: 999,
        border: `1px solid ${c.bd}`,
        background: c.bg,
        color: c.fg,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function TrackLane({ horse, percent, overlay, showResult }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div
        style={{
          border: "1px solid #e8e8e0",
          borderRadius: 14,
          background: "#fff",
          padding: "8px 10px",
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {horse.display_name}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          height: 64,
          borderRadius: 999,
          border: "1px solid #dfdfd8",
          background: "linear-gradient(to right, #fbfbf8, #f2f2ec)",
          overflow: "hidden",
        }}
      >
        {[20, 40, 60, 80].map((x) => (
          <div
            key={x}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: "#e7e7e2",
            }}
          />
        ))}

        {overlay && (
          <div
            style={{
              position: "absolute",
              left: 10,
              top: 8,
              zIndex: 3,
            }}
          >
            <LaneBadge tone="event">{overlay}</LaneBadge>
          </div>
        )}

        {showResult && horse.final_rank && (
          <div
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3,
            }}
          >
            <LaneBadge tone="result">{horse.final_rank}位</LaneBadge>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: `${percent}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            transition: "left 160ms linear",
            zIndex: 2,
          }}
        >
          <HorseIcon horseId={horse.horse_id} number={horse.horse_id} size={74} />
        </div>
      </div>
    </div>
  );
}

function normalizeLogsByHorse(logs, horses) {
  const map = {};
  horses.forEach((horse) => {
    map[horse.horse_id] = (logs || []).filter((log) =>
      log.includes(horse.display_name)
    );
  });
  return map;
}

export default function DerbyHostPage() {
  const [room, setRoom] = useState(null);
  const [horses, setHorses] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [bets, setBets] = useState([]);

  const [progress, setProgress] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const [runningRace, setRunningRace] = useState(false);
  const [playKey, setPlayKey] = useState("");

  const animationRef = useRef(null);

  async function load() {
    const { data: roomData } = await supabase
      .from("derby_rooms")
      .select("*")
      .eq("room_id", ROOM_ID)
      .maybeSingle();

    const raceNumber = roomData?.race_number ?? 1;

    const [{ data: horseData }, { data: attachmentData }, { data: betData }] =
      await Promise.all([
        supabase
          .from("derby_horses")
          .select("*")
          .eq("room_id", ROOM_ID)
          .order("horse_id", { ascending: true }),
        supabase
          .from("derby_attachments")
          .select("*")
          .eq("room_id", ROOM_ID)
          .eq("race_number", raceNumber),
        supabase
          .from("derby_bets")
          .select("*")
          .eq("room_id", ROOM_ID)
          .eq("race_number", raceNumber),
      ]);

    setRoom(roomData || null);
    setHorses(horseData || []);
    setAttachments(attachmentData || []);
    setBets(betData || []);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 1400);
    return () => clearInterval(id);
  }, []);

  const allBetPlayers = useMemo(() => bets.map((b) => b.player_id), [bets]);

  const allBetsConfirmed = useMemo(() => {
    const playerCount = room?.player_count ?? 0;
    if (!playerCount) return false;
    const neededPlayers = Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
    return neededPlayers.every((p) => allBetPlayers.includes(p));
  }, [room?.player_count, allBetPlayers]);

  const resultSnapshots = room?.result_payload?.segmentSnapshots || [];
  const resultRanking = room?.result_payload?.ranking || [];
  const resultLogs = room?.result_payload?.logs || [];

  useEffect(() => {
    const nextKey =
      room?.phase === "race" && room?.result_payload
        ? `${room.race_number}-${room.updated_at || ""}`
        : "";

    if (!nextKey) {
      setProgress(0);
      setActiveSegmentIndex(-1);
      setRunningRace(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    if (nextKey === playKey) return;

    setPlayKey(nextKey);
    setProgress(0);
    setActiveSegmentIndex(0);
    setRunningRace(true);

    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const duration = 9000;
    const startedAt = performance.now();

    const tick = (now) => {
      const elapsed = now - startedAt;
      const nextProgress = Math.min(1, elapsed / duration);
      setProgress(nextProgress);

      const seg = Math.min(
        SEGMENTS.length - 1,
        Math.floor(nextProgress * SEGMENTS.length)
      );
      setActiveSegmentIndex(seg);

      if (nextProgress < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        setRunningRace(false);
      }
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [room?.phase, room?.result_payload, room?.race_number, room?.updated_at, playKey]);

  const interpolatedPositions = useMemo(() => {
    const base = Object.fromEntries(horses.map((h) => [h.horse_id, 3]));

    if (room?.phase !== "race" || !resultSnapshots.length) {
      return base;
    }

    const segmentFloat = progress * SEGMENTS.length;
    const segIndex = Math.min(SEGMENTS.length - 1, Math.floor(segmentFloat));
    const localT = Math.max(0, Math.min(1, segmentFloat - segIndex));

    const prevSnapshot = segIndex <= 0 ? null : resultSnapshots[segIndex - 1];
    const currentSnapshot = resultSnapshots[segIndex];

    if (!currentSnapshot) return base;

    const currentMap = Object.fromEntries(
      currentSnapshot.positions.map((p) => [p.horse_id, p.total])
    );
    const prevMap = prevSnapshot
      ? Object.fromEntries(prevSnapshot.positions.map((p) => [p.horse_id, p.total]))
      : {};

    const maxTotal = Math.max(
      ...resultSnapshots.flatMap((s) => s.positions.map((p) => p.total)),
      1
    );

    const result = {};
    horses.forEach((horse) => {
      const currentTotal = currentMap[horse.horse_id] ?? 0;
      const previousTotal = prevSnapshot ? prevMap[horse.horse_id] ?? 0 : 0;
      const mixed = previousTotal + (currentTotal - previousTotal) * localT;
      result[horse.horse_id] = Math.max(3, Math.min(95, (mixed / maxTotal) * 95));
    });

    return result;
  }, [horses, room?.phase, resultSnapshots, progress]);

  const logsByHorse = useMemo(
    () => normalizeLogsByHorse(resultLogs, horses),
    [resultLogs, horses]
  );

  const laneOverlays = useMemo(() => {
    const map = {};

    horses.forEach((horse) => {
      if (room?.phase !== "race") {
        map[horse.horse_id] = null;
        return;
      }

      const horseLogs = logsByHorse[horse.horse_id] || [];
      if (!horseLogs.length || activeSegmentIndex < 0) {
        map[horse.horse_id] = null;
        return;
      }

      let matched = null;

      if (activeSegmentIndex === 0) {
        matched = horseLogs.find(
          (l) => l.includes("スタートダッシュ") || l.includes("気分屋")
        );
      } else if (activeSegmentIndex === 3) {
        matched = horseLogs.find((l) => l.includes("怠け者"));
      } else if (activeSegmentIndex === 4) {
        matched = horseLogs.find((l) => l.includes("根性"));
      }

      map[horse.horse_id] = matched
        ? matched.replace(`${horse.display_name} / `, "")
        : null;
    });

    return map;
  }, [horses, room?.phase, logsByHorse, activeSegmentIndex]);

  const displayHorses = useMemo(() => {
    const rankMap = Object.fromEntries(
      resultRanking.map((r) => [r.horse_id, r.final_rank])
    );

    return horses.map((horse) => ({
      ...horse,
      final_rank: rankMap[horse.horse_id] ?? null,
    }));
  }, [horses, resultRanking]);

  async function runRaceFromHost() {
    if (!allBetsConfirmed || runningRace || room?.phase !== "bet") return;

    try {
      setRunningRace(true);
      const result = simulateDerbyRace(attachments);

      for (const row of result.ranking) {
        const { error } = await supabase
          .from("derby_horses")
          .update({
            final_rank: row.final_rank,
            final_distance: row.final_distance,
          })
          .eq("room_id", ROOM_ID)
          .eq("horse_id", row.horse_id);

        if (error) throw error;
      }

      const roomUpdateRes = await supabase
        .from("derby_rooms")
        .update({
          phase: "race",
          result_payload: result,
          updated_at: new Date().toISOString(),
        })
        .eq("room_id", ROOM_ID);

      if (roomUpdateRes.error) throw roomUpdateRes.error;

      await load();
    } catch (error) {
      console.error("runRaceFromHost error", error);
      setRunningRace(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fbfbf8",
        color: "#111",
        padding: 10,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gap: 10,
        }}
      >
        <section
          style={{
            border: "1px solid #e5e5df",
            borderRadius: 18,
            background: "#fff",
            padding: 12,
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                DERBY MARKET / TRACK VIEW
              </div>
              <div style={{ color: "#777", fontSize: 11, marginTop: 2 }}>
                白い試験走路 / 観戦専用
              </div>
            </div>

            <LaneBadge>{`ROOM ${ROOM_ID}`}</LaneBadge>
            <LaneBadge>{`RACE ${room?.race_number || 1}`}</LaneBadge>
            <LaneBadge>
              {activeSegmentIndex >= 0 ? SEGMENTS[activeSegmentIndex] : room?.phase || "setup"}
            </LaneBadge>

            <button
              onClick={runRaceFromHost}
              disabled={!allBetsConfirmed || room?.phase !== "bet" || runningRace}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid #111",
                background:
                  !allBetsConfirmed || room?.phase !== "bet" || runningRace
                    ? "#eee"
                    : "#111",
                color:
                  !allBetsConfirmed || room?.phase !== "bet" || runningRace
                    ? "#999"
                    : "#fff",
                cursor:
                  !allBetsConfirmed || room?.phase !== "bet" || runningRace
                    ? "not-allowed"
                    : "pointer",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              レース開始
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 8,
            }}
          >
            {SEGMENTS.map((label, idx) => {
              const active = activeSegmentIndex >= idx && room?.phase === "race";
              return (
                <div
                  key={label}
                  style={{
                    border: "1px solid #ecece6",
                    borderRadius: 12,
                    padding: "8px 6px",
                    textAlign: "center",
                    background: active ? "#111" : "#fafaf7",
                    color: active ? "#fff" : "#666",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </section>

        <section
          style={{
            border: "1px solid #e5e5df",
            borderRadius: 18,
            background: "#fff",
            padding: 12,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>
            CONTINUOUS TRACK
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {displayHorses.map((horse) => (
              <TrackLane
                key={`${horse.horse_id}-${playKey}`}
                horse={horse}
                percent={interpolatedPositions[horse.horse_id] ?? 3}
                overlay={laneOverlays[horse.horse_id]}
                showResult={room?.phase === "race" && !runningRace}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}