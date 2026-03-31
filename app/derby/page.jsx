"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROOM_ID } from "@/lib/derbyConfig";
import { simulateDerbyRace } from "@/lib/derbyRace";

const SEGMENTS = ["START", "EARLY", "MID", "LATE", "FINAL"];

const HORSE_IMAGE_SRC = {
  "01": "/derby/horses/horse-01.png",
  "02": "/derby/horses/horse-02.png",
  "03": "/derby/horses/horse-03.png",
  "04": "/derby/horses/horse-04.png",
  "05": "/derby/horses/horse-05.png",
};

// レース全体を少し長くして観戦しやすくする
const RACE_DURATION_MS = 12500;

// ここから終盤の「全頭ゴール演出」に入る
const FINISH_PHASE_START = 0.72;

// ゴール後の静止時間
const RESULT_HOLD_MS = 650;

// ゴール後の順位表示を段階的に出す
const RANK_REVEAL_1_MS = 0;
const RANK_REVEAL_2_MS = 220;
const RANK_REVEAL_3PLUS_MS = 460;

// 最終ゴール配置
const FINISH_POSITIONS = [95, 92.5, 90, 88, 86];

function HorseIcon({ horseId, size = 96 }) {
  const src = HORSE_IMAGE_SRC[horseId] || HORSE_IMAGE_SRC["01"];

  return (
    <div
      style={{
        width: size,
        height: size * 0.7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <img
        src={src}
        alt={`horse-${horseId}`}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
}

function LaneBadge({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#111", fg: "#fff", bd: "#111" },
    event: { bg: "#fff6df", fg: "#6d5500", bd: "#ead9a8" },
    result: { bg: "#eef6ff", fg: "#174b86", bd: "#cfe2fb" },
    winner: { bg: "#111", fg: "#fff", bd: "#111" },
    spurt: { bg: "#111", fg: "#fff", bd: "#111" },
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
        fontWeight: 900,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function shortenOverlay(text) {
  if (!text) return null;
  if (text.includes("スタートダッシュ")) return "スタート";
  if (text.includes("気分屋")) return "気分";
  if (text.includes("怠け者")) return "怠け";
  if (text.includes("根性")) return "根性";
  return text;
}

function canRevealRank(rank, revealElapsedMs) {
  if (rank === 1) return revealElapsedMs >= RANK_REVEAL_1_MS;
  if (rank === 2) return revealElapsedMs >= RANK_REVEAL_2_MS;
  return revealElapsedMs >= RANK_REVEAL_3PLUS_MS;
}

function TrackLane({
  horse,
  percent,
  overlay,
  showResult,
  runningRace,
  progress,
  isFinishPhase,
  revealElapsedMs,
}) {
  const isWinner = showResult && horse.final_rank === 1;
  const shouldShowRank =
    showResult &&
    horse.final_rank &&
    canRevealRank(horse.final_rank, revealElapsedMs);

  const bobStrength = runningRace
    ? isFinishPhase
      ? 2.8
      : 2
    : 0;

  const bob = runningRace ? Math.sin(progress * 24) * bobStrength : 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "118px 1fr",
        gap: 8,
        alignItems: "center",
      }}
    >
      <div
        style={{
          border: "1px solid #ebe9df",
          borderRadius: 12,
          background: "#fff",
          padding: "8px 9px",
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
          height: 72,
          borderRadius: 999,
          border: "1px solid #dfdfd8",
          background: isFinishPhase
            ? "linear-gradient(to right, #fcfcfa, #f4f3ee)"
            : "linear-gradient(to right, #fbfbf8, #f2f2ec)",
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

        <div
          style={{
            position: "absolute",
            right: 20,
            top: 0,
            bottom: 0,
            width: 3,
            background: "#111",
            zIndex: 1,
            opacity: 0.92,
          }}
        />

        {overlay && runningRace && !isFinishPhase && (
          <div
            style={{
              position: "absolute",
              left: 8,
              top: 7,
              zIndex: 3,
              maxWidth: "48%",
              overflow: "hidden",
            }}
          >
            <LaneBadge tone="event">{shortenOverlay(overlay)}</LaneBadge>
          </div>
        )}

        {shouldShowRank && (
          <div
            style={{
              position: "absolute",
              right: 28,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3,
            }}
          >
            <LaneBadge tone={horse.final_rank === 1 ? "winner" : "result"}>
              {horse.final_rank}位
            </LaneBadge>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: `${percent}%`,
            top: "50%",
            transform: `translate(-42%, -50%) translateY(${bob}px) scale(${
              isWinner ? 1.05 : 1
            })`,
            zIndex: 2,
            willChange: "left, transform",
            transition: showResult ? "transform 220ms ease" : "none",
          }}
        >
          <HorseIcon horseId={horse.horse_id} size={96} />
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

function buildFallbackSnapshots(horses, ranking) {
  if (!horses.length) return [];

  const rankMap = Object.fromEntries(
    (ranking || []).map((r) => [r.horse_id, r])
  );

  const finals = horses.map((h) => {
    const ranked = rankMap[h.horse_id];
    const dist = ranked?.final_distance ?? h.final_distance ?? 0;

    return {
      horse_id: h.horse_id,
      total: Math.max(1, Number(dist) || 1),
    };
  });

  return SEGMENTS.map((label, index) => {
    const ratio = (index + 1) / SEGMENTS.length;
    return {
      segment: label,
      positions: finals.map((f) => ({
        horse_id: f.horse_id,
        total: f.total * ratio,
      })),
    };
  });
}

function getRankFinishPosition(rank) {
  return FINISH_POSITIONS[rank - 1] ?? 85;
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
  const [resultHoldDone, setResultHoldDone] = useState(false);
  const [revealElapsedMs, setRevealElapsedMs] = useState(0);

  const animationRef = useRef(null);
  const lastStartedKeyRef = useRef("");
  const holdTimerRef = useRef(null);
  const revealTimerRef = useRef(null);

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
      .subscribe();

    const fallbackId = setInterval(() => {
      load();
    }, 10000);

    return () => {
      clearInterval(fallbackId);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [load]);

  const allBetPlayers = useMemo(() => bets.map((b) => b.player_id), [bets]);

  const allBetsConfirmed = useMemo(() => {
    const playerCount = room?.player_count ?? 0;
    if (!playerCount) return false;
    const neededPlayers = Array.from(
      { length: playerCount },
      (_, i) => `P${i + 1}`
    );
    return neededPlayers.every((p) => allBetPlayers.includes(p));
  }, [room?.player_count, allBetPlayers]);

  const resultRanking = room?.result_payload?.ranking || [];
  const resultLogs = room?.result_payload?.logs || [];

  const usableSnapshots = useMemo(() => {
    const raw = room?.result_payload?.segmentSnapshots || [];
    if (raw.length) return raw;
    return buildFallbackSnapshots(horses, resultRanking);
  }, [room?.result_payload?.segmentSnapshots, horses, resultRanking]);

  useEffect(() => {
    const nextKey =
      room?.phase === "race" && room?.result_payload
        ? `${room.race_number}:${room.updated_at || ""}`
        : "";

    if (!nextKey) {
      setProgress(0);
      setActiveSegmentIndex(-1);
      setRunningRace(false);
      setPlayKey("");
      setResultHoldDone(false);
      setRevealElapsedMs(0);
      lastStartedKeyRef.current = "";

      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
      return;
    }

    if (lastStartedKeyRef.current === nextKey) return;
    lastStartedKeyRef.current = nextKey;

    setPlayKey(nextKey);
    setProgress(0);
    setActiveSegmentIndex(0);
    setRunningRace(true);
    setResultHoldDone(false);
    setRevealElapsedMs(0);

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (revealTimerRef.current) clearInterval(revealTimerRef.current);

    const startedAt = performance.now();

    const tick = (now) => {
      const elapsed = now - startedAt;
      const nextProgress = Math.min(1, elapsed / RACE_DURATION_MS);
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

        holdTimerRef.current = setTimeout(() => {
          setResultHoldDone(true);

          const revealStartedAt = performance.now();
          revealTimerRef.current = setInterval(() => {
            const revealElapsed = performance.now() - revealStartedAt;
            setRevealElapsedMs(revealElapsed);

            if (revealElapsed > RANK_REVEAL_3PLUS_MS + 400) {
              clearInterval(revealTimerRef.current);
            }
          }, 30);
        }, RESULT_HOLD_MS);
      }
    };

    animationRef.current = requestAnimationFrame(tick);
  }, [room]);

  const isFinishPhase = runningRace && progress >= FINISH_PHASE_START;

  const racePhasePositions = useMemo(() => {
    const base = Object.fromEntries(horses.map((h) => [h.horse_id, 12]));

    if (!usableSnapshots.length) {
      return base;
    }

    const effectiveProgress = Math.min(progress, FINISH_PHASE_START);
    const phaseNormalized =
      FINISH_PHASE_START > 0 ? effectiveProgress / FINISH_PHASE_START : 1;

    const segmentFloat = phaseNormalized * SEGMENTS.length;
    const segIndex = Math.min(SEGMENTS.length - 1, Math.floor(segmentFloat));
    const localT = Math.max(0, Math.min(1, segmentFloat - segIndex));

    const prevSnapshot = segIndex <= 0 ? null : usableSnapshots[segIndex - 1];
    const currentSnapshot = usableSnapshots[segIndex];

    if (!currentSnapshot?.positions?.length) return base;

    const currentMap = Object.fromEntries(
      currentSnapshot.positions.map((p) => [p.horse_id, p.total])
    );

    const prevMap = prevSnapshot?.positions?.length
      ? Object.fromEntries(
          prevSnapshot.positions.map((p) => [p.horse_id, p.total])
        )
      : {};

    const maxTotal = Math.max(
      ...usableSnapshots.flatMap((s) =>
        (s.positions || []).map((p) => Number(p.total) || 0)
      ),
      1
    );

    const result = {};
    horses.forEach((horse) => {
      const currentTotal = Number(currentMap[horse.horse_id] ?? 0);
      const previousTotal = Number(prevMap[horse.horse_id] ?? 0);
      const mixed = previousTotal + (currentTotal - previousTotal) * localT;

      const ratio = Math.max(0, Math.min(1, mixed / maxTotal));
      const compressed = Math.pow(ratio, 0.7);

      const minVisual = 12;
      const maxVisual = 95;

      result[horse.horse_id] =
        minVisual + compressed * (maxVisual - minVisual);
    });

    return result;
  }, [horses, usableSnapshots, progress]);

  const interpolatedPositions = useMemo(() => {
    const result = { ...racePhasePositions };

    if (!resultRanking.length) {
      return result;
    }

    if (runningRace && progress >= FINISH_PHASE_START) {
      const finishT = Math.max(
        0,
        Math.min(1, (progress - FINISH_PHASE_START) / (1 - FINISH_PHASE_START))
      );

      resultRanking.forEach((r) => {
        const from = racePhasePositions[r.horse_id] ?? 12;
        const to = getRankFinishPosition(r.final_rank);
        result[r.horse_id] = from + (to - from) * finishT;
      });

      return result;
    }

    if (!runningRace) {
      resultRanking.forEach((r) => {
        result[r.horse_id] = getRankFinishPosition(r.final_rank);
      });
    }

    return result;
  }, [racePhasePositions, resultRanking, runningRace, progress]);

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
      final_rank: rankMap[horse.horse_id] ?? horse.final_rank ?? null,
    }));
  }, [horses, resultRanking]);

  const headerLabel = useMemo(() => {
    if (runningRace && progress >= FINISH_PHASE_START) return "LAST SPURT";
    if (runningRace && activeSegmentIndex >= 0) {
      return SEGMENTS[activeSegmentIndex];
    }
    return room?.phase || "setup";
  }, [runningRace, progress, activeSegmentIndex, room?.phase]);

  const showResults = !runningRace && resultRanking.length > 0 && resultHoldDone;

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

          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <LaneBadge>{`RACE ${room?.race_number || 1}`}</LaneBadge>
            <LaneBadge tone={runningRace && progress >= FINISH_PHASE_START ? "spurt" : "neutral"}>
              {headerLabel}
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
              percent={interpolatedPositions[horse.horse_id] ?? 12}
              overlay={laneOverlays[horse.horse_id]}
              showResult={showResults}
              runningRace={runningRace}
              progress={progress}
              isFinishPhase={isFinishPhase}
              revealElapsedMs={revealElapsedMs}
            />
          ))}
        </section>
      </div>
    </main>
  );
}