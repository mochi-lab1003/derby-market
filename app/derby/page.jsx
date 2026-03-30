"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROOM_ID } from "@/lib/derbyConfig";
import { simulateDerbyRace } from "@/lib/derbyRace";

const SEGMENTS = ["START", "EARLY", "MID", "LATE", "FINAL"];

const HORSE_COLORS = {
  "01": "#d84d4d",
  "02": "#3972f6",
  "03": "#33a25a",
  "04": "#d6a114",
  "05": "#8756de",
};

function HorseIcon({ horseId, number, size = 76 }) {
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
      <svg viewBox="0 0 220 130" width={size} height={h} aria-hidden="true">
        <g>
          <path
            d="M34 80
               C34 57, 53 43, 80 43
               L128 43
               C154 43, 171 55, 178 73
               L191 73
               C199 73, 204 77, 204 83
               C204 89, 199 93, 191 93
               L178 93
               C171 107, 156 115, 132 115
               L77 115
               C50 115, 34 101, 34 80 Z"
            fill="#fff"
            stroke="#1b1b1b"
            strokeWidth="5"
          />
          <path
            d="M118 43
               C118 20, 137 9, 157 9
               C172 9, 185 16, 193 29
               L176 35
               C169 26, 161 22, 151 22
               C138 22, 126 30, 126 43 Z"
            fill="#fff"
            stroke="#1b1b1b"
            strokeWidth="5"
          />
          <path d="M177 28 L197 14" stroke="#1b1b1b" strokeWidth="5" strokeLinecap="round" />
          <path d="M57 115 L51 129" stroke="#1b1b1b" strokeWidth="6" strokeLinecap="round" />
          <path d="M88 115 L82 129" stroke="#1b1b1b" strokeWidth="6" strokeLinecap="round" />
          <path d="M129 115 L123 129" stroke="#1b1b1b" strokeWidth="6" strokeLinecap="round" />
          <path d="M160 114 L166 129" stroke="#1b1b1b" strokeWidth="6" strokeLinecap="round" />
          <path d="M34 73 L18 59" stroke={color} strokeWidth="10" strokeLinecap="round" />
          <rect
            x="90"
            y="57"
            rx="8"
            ry="8"
            width="38"
            height="24"
            fill={color}
            stroke="#1b1b1b"
            strokeWidth="4"
          />
          <circle cx="160" cy="34" r="4" fill="#1b1b1b" />
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
        gridTemplateColumns: "112px 1fr",
        gap: 8,
        alignItems: "center",
      }}
    >
      <div
        style={{
          border: "1px solid #ebe9df",
          borderRadius: 12,
          background: "#fff",
          padding: "7px 8px",
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
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
          height: 58,
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
              left: 8,
              top: 6,
              zIndex: 3,
              maxWidth: "48%",
              overflow: "hidden",
            }}
          >
            <LaneBadge tone="event">{overlay}</LaneBadge>
          </div>
        )}

        {showResult && horse.final_rank && (
          <div
            style={{
              position: "absolute",
              right: 8,
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
            zIndex: 2,
          }}
        >
          <HorseIcon horseId={horse.horse_id} number={horse.horse_id} size={68} />
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

  const load = useCallback(async () => {
    const { data: roomData, error: roomError } = await supabase
      .from("derby_rooms")
      .select("*")
      .eq("room_id", ROOM_ID)
      .maybeSingle();

    if (roomError) {
      console.error("load room error", roomError);
      return;
    }

    const raceNumber = roomData?.race_number ?? 1;

    const [
      { data: horseData, error: horseError },
      { data: attachmentData, error: attachmentError },
      { data: betData, error: betError },
    ] = await Promise.all([
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

    if (horseError) console.error("load horses error", horseError);
    if (attachmentError) console.error("load attachments error", attachmentError);
    if (betError) console.error("load bets error", betError);

    setRoom(roomData || null);
    setHorses(horseData || []);
    setAttachments(attachmentData || []);
    setBets(betData || []);
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`derby-host-${ROOM_ID}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "derby_rooms",
          filter: `room_id=eq.${ROOM_ID}`,
        },
        () => load()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "derby_horses",
          filter: `room_id=eq.${ROOM_ID}`,
        },
        () => load()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "derby_attachments",
          filter: `room_id=eq.${ROOM_ID}`,
        },
        () => load()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "derby_bets",
          filter: `room_id=eq.${ROOM_ID}`,
        },
        () => load()
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("realtime subscribe error");
        }
      });

    const fallbackId = setInterval(() => {
      load();
    }, 10000);

    return () => {
      clearInterval(fallbackId);
      supabase.removeChannel(channel);
    };
  }, [load]);

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
        ? `${room.race_number}:${room.updated_at || ""}:${JSON.stringify(
            room.result_payload.ranking || []
          )}`
        : "";

    if (!nextKey) {
      setProgress(0);
      setActiveSegmentIndex(-1);
      setRunningRace(false);
      setPlayKey("");
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
  }, [room, playKey]);

  const interpolatedPositions = useMemo(() => {
    const base = Object.fromEntries(horses.map((h) => [h.horse_id, 3]));

    if (!resultSnapshots.length) {
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
  }, [horses, resultSnapshots, progress]);

  const logsByHorse = useMemo(
    () => normalizeLogsByHorse(resultLogs, horses),
    [resultLogs, horses]
  );

  const laneOverlays = useMemo(() => {
    const map = {};

    horses.forEach((horse) => {
      const horseLogs = logsByHorse[horse.horse_id] || [];
      if (!horseLogs.length || activeSegmentIndex < 0 || !runningRace) {
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
  }, [horses, logsByHorse, activeSegmentIndex, runningRace]);

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
    } catch (error) {
      console.error("runRaceFromHost error", error);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fbfbf8",
        color: "#111",
        padding: 8,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gap: 8,
        }}
      >
        <section
          style={{
            border: "1px solid #e5e5df",
            borderRadius: 16,
            background: "#fff",
            padding: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              DERBY MARKET
            </div>
            <div style={{ color: "#777", fontSize: 11, marginTop: 2 }}>
              TRACK VIEW
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <LaneBadge>{`RACE ${room?.race_number || 1}`}</LaneBadge>
            <LaneBadge>
              {runningRace && activeSegmentIndex >= 0
                ? SEGMENTS[activeSegmentIndex]
                : room?.phase || "setup"}
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
        </section>

        <section
          style={{
            border: "1px solid #e5e5df",
            borderRadius: 16,
            background: "#fff",
            padding: 10,
            display: "grid",
            gap: 8,
          }}
        >
          {displayHorses.map((horse) => (
            <TrackLane
              key={`${horse.horse_id}-${playKey || "idle"}`}
              horse={horse}
              percent={interpolatedPositions[horse.horse_id] ?? 3}
              overlay={laneOverlays[horse.horse_id]}
              showResult={!!resultRanking.length && !runningRace}
            />
          ))}
        </section>
      </div>
    </main>
  );
}