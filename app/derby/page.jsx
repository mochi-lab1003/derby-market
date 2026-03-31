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

const RACE_DURATION_MS = 30000;
const START_OVERLAY_MS = 1800;
const RESULT_HOLD_MS = 1000;
const FINISH_PHASE_START = 0.82;

const RANK_REVEAL_MS = {
  1: 0,
  2: 350,
  3: 700,
  4: 900,
  5: 1100,
};

const FINISH_POSITIONS = [99.2, 98.1, 97.0, 95.9, 94.8];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function HorseIcon({ horseId, size = 100 }) {
  const src = HORSE_IMAGE_SRC[horseId] || HORSE_IMAGE_SRC["01"];

  return (
    <div
      style={{
        width: size,
        height: size * 0.72,
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
  return revealElapsedMs >= (RANK_REVEAL_MS[rank] ?? 0);
}

function BackgroundStage({ isFinishPhase, isPhotoFinish }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isPhotoFinish
            ? "radial-gradient(circle at center, rgba(255,255,255,0.99) 0%, rgba(246,245,240,0.98) 58%, rgba(240,239,234,0.98) 100%)"
            : isFinishPhase
            ? "radial-gradient(circle at center, rgba(255,255,255,0.98) 0%, rgba(247,247,243,0.96) 58%, rgba(241,241,236,0.98) 100%)"
            : "radial-gradient(circle at center, rgba(255,255,255,0.98) 0%, rgba(248,248,244,0.96) 60%, rgba(242,242,238,0.98) 100%)",
          transition: "background 260ms ease",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "-12%",
          left: "-6%",
          width: "112%",
          height: "140%",
          background:
            "repeating-linear-gradient(180deg, rgba(0,0,0,0.018) 0px, rgba(0,0,0,0.018) 1px, transparent 1px, transparent 84px)",
          opacity: isPhotoFinish ? 0.44 : isFinishPhase ? 0.36 : 0.22,
          transition: "opacity 260ms ease",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.02) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.03) 100%)",
        }}
      />
    </div>
  );
}

function StartOverlay({ show, elapsedMs }) {
  if (!show) return null;

  const t = clamp(elapsedMs / START_OVERLAY_MS, 0, 1);
  const scale = 1.18 - 0.18 * easeOutCubic(t);
  const opacity = 1 - easeOutCubic(t);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "clamp(42px, 8vw, 96px)",
            fontWeight: 900,
            lineHeight: 0.92,
            letterSpacing: "0.06em",
            color: "#111",
          }}
        >
          START
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: "clamp(12px, 1.6vw, 18px)",
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: "rgba(17,17,17,0.65)",
          }}
        >
          GATES OPEN
        </div>
      </div>
    </div>
  );
}

function RaceTicker({ text, phase }) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        marginTop: 8,
        border: "1px solid #e5e5df",
        borderRadius: 12,
        background: "#fff",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <LaneBadge tone={phase === "PHOTO FINISH" ? "spurt" : "neutral"}>
        {phase}
      </LaneBadge>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#222",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {text}
      </div>
    </div>
  );
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
  laneIndex,
}) {
  const shouldShowRank =
    showResult &&
    horse.final_rank &&
    canRevealRank(horse.final_rank, revealElapsedMs);

  const isWinner = shouldShowRank && horse.final_rank === 1;

  const phaseBoost = isFinishPhase ? 1.5 : 1;
  const strideSpeed = isFinishPhase ? 34 : 24;
  const bob =
    runningRace
      ? Math.sin(progress * strideSpeed + laneIndex * 0.85) * 2.1 * phaseBoost
      : 0;

  const lean = runningRace
    ? isFinishPhase
      ? -3.3
      : -1.4
    : 0;

  return (
    <div
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "118px 1fr",
        gap: 8,
        alignItems: "center",
        zIndex: 1,
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
          height: 76,
          borderRadius: 999,
          border: "1px solid #dfdfd8",
          background: isFinishPhase
            ? "linear-gradient(to right, rgba(255,255,255,0.92), rgba(245,244,239,0.96))"
            : "linear-gradient(to right, rgba(255,255,255,0.88), rgba(244,244,240,0.94))",
          overflow: "hidden",
          transition: "background 260ms ease",
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
            right: 0,
            top: 0,
            bottom: 0,
            width: 120,
            background:
              "linear-gradient(to left, rgba(0,0,0,0.04), rgba(0,0,0,0))",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        <div
          style={{
            position: "absolute",
            right: 14,
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
              top: 8,
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
              right: 22,
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
            transform: `translate(-42%, -50%) translateY(${bob}px) rotate(${lean}deg) scale(${
              isWinner ? 1.06 : isFinishPhase ? 1.02 : 1
            })`,
            zIndex: 2,
            willChange: "left, transform",
            transition: showResult ? "transform 220ms ease" : "none",
            filter: isWinner ? "drop-shadow(0 4px 10px rgba(0,0,0,0.08))" : "none",
          }}
        >
          <HorseIcon horseId={horse.horse_id} size={100} />
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
  return FINISH_POSITIONS[rank - 1] ?? 94;
}

function getPlayerLabel(room, playerId) {
  return room?.player_names?.[playerId]?.trim() || playerId;
}

function buildHorseAttachmentSummary(attachments, horses) {
  const grouped = {};
  horses.forEach((horse) => {
    grouped[horse.horse_id] = attachments.filter(
      (a) => a.horse_id === horse.horse_id
    );
  });
  return grouped;
}

function buildTickerText({
  room,
  horses,
  positions,
  progress,
  runningRace,
  resultRanking,
  logsByHorse,
  attachments,
}) {
  if (!runningRace) {
    if (resultRanking.length) {
      const first = resultRanking.find((r) => r.final_rank === 1);
      const second = resultRanking.find((r) => r.final_rank === 2);
      const third = resultRanking.find((r) => r.final_rank === 3);

      const h1 = horses.find((h) => h.horse_id === first?.horse_id);
      const h2 = horses.find((h) => h.horse_id === second?.horse_id);
      const h3 = horses.find((h) => h.horse_id === third?.horse_id);

      return `全頭ゴール。1着 ${h1?.display_name || "-"}、2着 ${h2?.display_name || "-"}、3着 ${h3?.display_name || "-"}。`;
    }
    return "レース待機中。";
  }

  const sorted = [...horses]
    .map((horse) => ({
      horse,
      pos: positions[horse.horse_id] ?? 0,
    }))
    .sort((a, b) => b.pos - a.pos);

  const first = sorted[0]?.horse;
  const second = sorted[1]?.horse;
  const third = sorted[2]?.horse;

  const horseAttachmentMap = buildHorseAttachmentSummary(attachments, horses);

  if (progress < 0.18) {
    const leadAttachments = horseAttachmentMap[first?.horse_id] || [];
    const starter = leadAttachments.find(
      (a) =>
        a.is_trait ||
        (a.stat_kind || "").toLowerCase().includes("speed")
    );

    if (starter) {
      return `${first?.display_name || "-"} が前へ。${getPlayerLabel(
        room,
        starter.player_id
      )} の付与が序盤から効いている。`;
    }

    return `各馬きれいなスタート。先頭は ${first?.display_name || "-"}。`;
  }

  if (progress < 0.5) {
    const accelHorse = sorted[0]?.horse;
    const accelAttachments = horseAttachmentMap[accelHorse?.horse_id] || [];
    const accelCard =
      accelAttachments.find((a) =>
        (a.stat_kind || "").toLowerCase().includes("accel")
      ) || accelAttachments[0];

    if (accelCard) {
      return `中盤、最も加速が乗るのは ${accelHorse?.display_name || "-"}。${getPlayerLabel(
        room,
        accelCard.player_id
      )} の ${accelCard.card_name || "付与"} が効いている。`;
    }

    return `中盤の先頭は ${first?.display_name || "-"}。2番手に ${second?.display_name || "-"}、3番手 ${third?.display_name || "-"}。`;
  }

  if (progress < FINISH_PHASE_START) {
    const specialHorse = horses.find((horse) => {
      const logs = logsByHorse[horse.horse_id] || [];
      return logs.some((l) =>
        ["根性", "怠け者", "気分屋", "スタートダッシュ"].some((k) =>
          l.includes(k)
        )
      );
    });

    if (specialHorse) {
      const specialAttachments = horseAttachmentMap[specialHorse.horse_id] || [];
      const specialCard =
        specialAttachments.find((a) => a.is_trait) || specialAttachments[0];

      if (specialCard) {
        return `${specialHorse.display_name} に ${shortenOverlay(
          specialCard.card_name || "特殊効果"
        )} の気配。付与したのは ${getPlayerLabel(room, specialCard.player_id)}。`;
      }
    }

    return `${first?.display_name || "-"} が前。${second?.display_name || "-"} と ${third?.display_name || "-"} が追う。`;
  }

  if (progress < 0.92) {
    const secondAttachments = horseAttachmentMap[second?.horse_id] || [];
    const thirdAttachments = horseAttachmentMap[third?.horse_id] || [];
    const chaseCard = secondAttachments[0] || thirdAttachments[0];

    if (chaseCard) {
      return `LAST SPURT。2着争いは ${second?.display_name || "-"} と ${third?.display_name || "-"}。${getPlayerLabel(
        room,
        chaseCard.player_id
      )} の付与が着順に絡む。`;
    }

    return `LAST SPURT。${first?.display_name || "-"} 先頭、2着争いは ${second?.display_name || "-"} と ${third?.display_name || "-"}。`;
  }

  return "PHOTO FINISH。最後まで目が離せない。";
}

export default function DerbyHostPage() {
  const [room, setRoom] = useState(null);
  const [horses, setHorses] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [bets, setBets] = useState([]);

  const [progress, setProgress] = useState(0);
  const [raceElapsedMs, setRaceElapsedMs] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const [runningRace, setRunningRace] = useState(false);
  const [playKey, setPlayKey] = useState("");
  const [resultHoldDone, setResultHoldDone] = useState(false);
  const [revealElapsedMs, setRevealElapsedMs] = useState(0);

  const animationRef = useRef(null);
  const holdTimerRef = useRef(null);
  const revealTimerRef = useRef(null);
  const lastStartedKeyRef = useRef("");

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
      setRaceElapsedMs(0);
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
    setRaceElapsedMs(0);
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
      const rawT = clamp(elapsed / RACE_DURATION_MS, 0, 1);

      setRaceElapsedMs(elapsed);

      let visualT = rawT;
      if (rawT < FINISH_PHASE_START) {
        const local = rawT / FINISH_PHASE_START;
        visualT = easeInOutCubic(local) * FINISH_PHASE_START;
      } else {
        const finishLocal = (rawT - FINISH_PHASE_START) / (1 - FINISH_PHASE_START);
        visualT =
          FINISH_PHASE_START + easeInOutCubic(finishLocal) * (1 - FINISH_PHASE_START);
      }

      setProgress(visualT);

      const seg = Math.min(
        SEGMENTS.length - 1,
        Math.floor(visualT * SEGMENTS.length)
      );
      setActiveSegmentIndex(seg);

      if (rawT < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        setRunningRace(false);

        holdTimerRef.current = setTimeout(() => {
          setResultHoldDone(true);

          const revealStartedAt = performance.now();
          revealTimerRef.current = setInterval(() => {
            const revealElapsed = performance.now() - revealStartedAt;
            setRevealElapsedMs(revealElapsed);

            if (revealElapsed > RANK_REVEAL_MS[5] + 400) {
              clearInterval(revealTimerRef.current);
            }
          }, 30);
        }, RESULT_HOLD_MS);
      }
    };

    animationRef.current = requestAnimationFrame(tick);
  }, [room]);

  const isFinishPhase = runningRace && progress >= FINISH_PHASE_START;
  const isPhotoFinish = runningRace && progress >= 0.92;
  const showStartOverlay = runningRace && raceElapsedMs <= START_OVERLAY_MS;

  const racePhasePositions = useMemo(() => {
    const base = Object.fromEntries(horses.map((h) => [h.horse_id, 12]));

    if (!usableSnapshots.length) return base;

    const effectiveProgress = Math.min(progress, FINISH_PHASE_START);
    const phaseNormalized =
      FINISH_PHASE_START > 0 ? effectiveProgress / FINISH_PHASE_START : 1;

    const segmentFloat = phaseNormalized * SEGMENTS.length;
    const segIndex = Math.min(SEGMENTS.length - 1, Math.floor(segmentFloat));
    const localT = clamp(segmentFloat - segIndex, 0, 1);

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
    horses.forEach((horse, index) => {
      const currentTotal = Number(currentMap[horse.horse_id] ?? 0);
      const previousTotal = Number(prevMap[horse.horse_id] ?? 0);
      const mixed = previousTotal + (currentTotal - previousTotal) * localT;

      const ratio = clamp(mixed / maxTotal, 0, 1);
      const compressed = Math.pow(ratio, 0.7);

      const microVariance = Math.sin(progress * 18 + index * 0.9) * 0.18;
      const minVisual = 12;
      const maxVisual = 95;

      result[horse.horse_id] =
        minVisual + compressed * (maxVisual - minVisual) + microVariance;
    });

    return result;
  }, [horses, usableSnapshots, progress]);

  const interpolatedPositions = useMemo(() => {
    const result = { ...racePhasePositions };

    if (!resultRanking.length) return result;

    if (runningRace && progress >= FINISH_PHASE_START) {
      const finishT = clamp(
        (progress - FINISH_PHASE_START) / (1 - FINISH_PHASE_START),
        0,
        1
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
    if (runningRace && progress >= 0.92) return "PHOTO FINISH";
    if (runningRace && progress >= FINISH_PHASE_START) return "LAST SPURT";
    if (runningRace && progress >= 0.3) return "MID RACE";
    if (runningRace) return "START";
    return room?.phase || "setup";
  }, [runningRace, progress, room?.phase]);

  const showResults = !runningRace && resultRanking.length > 0 && resultHoldDone;

  const tickerText = useMemo(() => {
    return buildTickerText({
      room,
      horses,
      positions: interpolatedPositions,
      progress,
      runningRace,
      resultRanking,
      logsByHorse,
      attachments,
    });
  }, [
    room,
    horses,
    interpolatedPositions,
    progress,
    runningRace,
    resultRanking,
    logsByHorse,
    attachments,
  ]);

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
            position: "relative",
            border: "1px solid #e5e5df",
            borderRadius: 16,
            background: "#fff",
            padding: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          <BackgroundStage isFinishPhase={isFinishPhase} isPhotoFinish={isPhotoFinish} />

          <div style={{ minWidth: 0, position: "relative", zIndex: 1 }}>
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
              position: "relative",
              zIndex: 1,
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

          <StartOverlay show={showStartOverlay} elapsedMs={raceElapsedMs} />
        </section>

        <section
          style={{
            position: "relative",
            border: "1px solid #e5e5df",
            borderRadius: 16,
            background: "#fff",
            padding: 10,
            display: "grid",
            gap: 8,
            overflow: "hidden",
          }}
        >
          <BackgroundStage isFinishPhase={isFinishPhase} isPhotoFinish={isPhotoFinish} />

          {displayHorses.map((horse, index) => (
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
              laneIndex={index}
            />
          ))}

          <RaceTicker text={tickerText} phase={headerLabel} />
        </section>
      </div>
    </main>
  );
}