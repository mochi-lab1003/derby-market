"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROOM_ID } from "@/lib/derbyConfig";
import { simulateDerbyRace } from "@/lib/derbyRace";

const SEGMENTS = ["START", "EARLY", "MID", "LATE", "FINAL"];

const HORSE_COLORS = {
  "01": "#e35d5d",
  "02": "#4f83ff",
  "03": "#41a85f",
  "04": "#d9aa1f",
  "05": "#8b62d9",
};

function HorseIcon({ horseId, number, size = 56 }) {
  const color = HORSE_COLORS[horseId] || "#888";
  const badgeSize = Math.round(size * 0.3);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: Math.round(size * 0.68),
        display: "inline-block",
      }}
    >
      <svg
        viewBox="0 0 120 80"
        width={size}
        height={Math.round(size * 0.68)}
        aria-hidden="true"
      >
        <g>
          <path
            d="M26 48 C26 36, 38 28, 53 28 L79 28 C92 28, 101 34, 103 44 L107 43 C111 42, 114 43, 115 46 C116 49, 114 51, 110 52 L104 53 C102 62, 93 67, 80 67 L49 67 C35 67, 26 60, 26 48 Z"
            fill="#ffffff"
            stroke="#1a1a1a"
            strokeWidth="3"
          />
          <path
            d="M71 28 C71 16, 80 8, 92 8 C100 8, 106 12, 109 18 L99 21 C96 18, 92 17, 88 17 C82 17, 78 21, 78 28 Z"
            fill="#ffffff"
            stroke="#1a1a1a"
            strokeWidth="3"
          />
          <path
            d="M100 20 L111 13"
            stroke="#1a1a1a"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M40 67 L37 77"
            stroke="#1a1a1a"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M56 67 L54 77"
            stroke="#1a1a1a"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M78 67 L76 77"
            stroke="#1a1a1a"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M94 66 L96 77"
            stroke="#1a1a1a"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M27 45 L18 38"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <rect
            x="54"
            y="37"
            rx="6"
            ry="6"
            width="22"
            height="16"
            fill={color}
            stroke="#1a1a1a"
            strokeWidth="2"
          />
          <circle cx="95" cy="23" r="2.4" fill="#1a1a1a" />
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          right: -2,
          top: -4,
          width: badgeSize,
          height: badgeSize,
          borderRadius: "50%",
          background: color,
          color: "#fff",
          border: "2px solid #fff",
          display: "grid",
          placeItems: "center",
          fontSize: Math.max(10, Math.round(size * 0.16)),
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {number}
      </div>
    </div>
  );
}

function TrackLane({ horse, percent }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "170px 1fr",
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
          display: "grid",
          gridTemplateColumns: "56px 1fr",
          gap: 8,
          alignItems: "center",
        }}
      >
        <HorseIcon horseId={horse.horse_id} number={horse.horse_id} size={56} />

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {horse.display_name}
          </div>
          <div
            style={{
              marginTop: 3,
              fontSize: 10,
              color: "#777",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {horse.flavor_label}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          height: 54,
          borderRadius: 999,
          border: "1px solid #dfdfd8",
          background: "linear-gradient(to right, #fbfbf8, #f3f3ee)",
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
            left: `${percent}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            transition: "left 1500ms ease",
            display: "grid",
            placeItems: "center",
          }}
        >
          <HorseIcon horseId={horse.horse_id} number={horse.horse_id} size={62} />
        </div>
      </div>
    </div>
  );
}

export default function DerbyHostPage() {
  const [room, setRoom] = useState(null);
  const [horses, setHorses] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [bets, setBets] = useState([]);

  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [liveLogs, setLiveLogs] = useState([]);
  const [playNonce, setPlayNonce] = useState(0);
  const [runningRace, setRunningRace] = useState(false);

  const timerRef = useRef(null);

  async function load() {
    const { data: roomData } = await supabase
      .from("derby_rooms")
      .select("*")
      .eq("room_id", ROOM_ID)
      .maybeSingle();

    const raceNumber = roomData?.race_number ?? 1;

    const [
      { data: horseData },
      { data: attachmentData },
      { data: betData },
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

  useEffect(() => {
    const playKey = `${room?.race_number || 0}-${room?.phase || ""}-${
      room?.updated_at || ""
    }`;

    if (
      room?.phase !== "race" ||
      !room?.result_payload?.segmentSnapshots?.length
    ) {
      setCurrentSegmentIndex(-1);
      setLiveLogs([]);
      setRunningRace(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    setPlayNonce((n) => n + 1);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setCurrentSegmentIndex(-1);
    setLiveLogs([]);
    setRunningRace(true);

    let index = -1;
    timerRef.current = setInterval(() => {
      index += 1;

      if (index >= room.result_payload.segmentSnapshots.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setRunningRace(false);
        return;
      }

      setCurrentSegmentIndex(index);

      const maxLogs = Math.min(
        2 + index * 2,
        room?.result_payload?.logs?.length || 0
      );
      setLiveLogs((room?.result_payload?.logs || []).slice(0, maxLogs));
    }, 1700);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room?.race_number, room?.phase, room?.updated_at, room?.result_payload]);

  const currentSegment =
    currentSegmentIndex >= 0 ? SEGMENTS[currentSegmentIndex] : null;

  const animatedPositions = useMemo(() => {
    const base = Object.fromEntries(horses.map((h) => [h.horse_id, 3]));

    if (
      room?.phase !== "race" ||
      !room?.result_payload?.segmentSnapshots?.length ||
      currentSegmentIndex < 0
    ) {
      return base;
    }

    const snapshot = room.result_payload.segmentSnapshots[currentSegmentIndex];
    const max = Math.max(...snapshot.positions.map((p) => p.total), 1);

    return Object.fromEntries(
      snapshot.positions.map((p) => [
        p.horse_id,
        Math.max(3, Math.min(95, (p.total / max) * 95)),
      ])
    );
  }, [horses, room?.phase, room?.result_payload, currentSegmentIndex, playNonce]);

  async function runRaceFromHost() {
    if (!allBetsConfirmed || runningRace) return;

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

            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "#111",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              ROOM {ROOM_ID}
            </div>

            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "#111",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              RACE {room?.race_number || 1}
            </div>

            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: currentSegment ? "#111" : "#f3f3ee",
                color: currentSegment ? "#fff" : "#555",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {currentSegment || room?.phase || "setup"}
            </div>

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
              const active =
                currentSegmentIndex >= idx && room?.phase === "race";
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
            {horses.map((horse) => (
              <TrackLane
                key={`${horse.horse_id}-${playNonce}`}
                horse={horse}
                percent={animatedPositions[horse.horse_id] ?? 3}
              />
            ))}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.25fr 1fr 1fr",
            gap: 10,
          }}
        >
          <div
            style={{
              border: "1px solid #e5e5df",
              borderRadius: 18,
              background: "#fff",
              padding: 12,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700 }}>出走表</div>

            <div style={{ display: "grid", gap: 8 }}>
              {horses.map((horse) => (
                <div
                  key={horse.horse_id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "50px 1fr auto auto",
                    gap: 8,
                    alignItems: "center",
                    border: "1px solid #f1f1eb",
                    borderRadius: 12,
                    padding: "8px 10px",
                    background: "#fafaf7",
                  }}
                >
                  <HorseIcon horseId={horse.horse_id} number={horse.horse_id} size={42} />

                  <div style={{ minWidth: 0 }}>
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
                    <div
                      style={{
                        fontSize: 10,
                        color: "#777",
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {horse.flavor_label}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: "#444" }}>
                    {horse.attached_count}枚
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>
                    x{horse.win_odds}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #e5e5df",
              borderRadius: 18,
              background: "#fff",
              padding: 12,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700 }}>ログ</div>

            <div
              style={{
                display: "grid",
                gap: 8,
                maxHeight: 210,
                overflow: "auto",
              }}
            >
              {(room?.phase === "race" ? liveLogs : room?.result_payload?.logs || [])
                .slice(-6)
                .map((log, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid #f1f1eb",
                      borderRadius: 12,
                      padding: "8px 10px",
                      background: "#fafaf7",
                      fontSize: 11,
                      lineHeight: 1.35,
                    }}
                  >
                    {log}
                  </div>
                ))}

              {!room?.result_payload?.logs?.length && room?.phase !== "race" && (
                <div style={{ color: "#888", fontSize: 11 }}>
                  まだログはありません。
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #e5e5df",
              borderRadius: 18,
              background: "#fff",
              padding: 12,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700 }}>結果</div>

            <div style={{ display: "grid", gap: 8 }}>
              {[...(room?.result_payload?.ranking || [])].map((row) => (
                <div
                  key={row.horse_id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "34px 40px 1fr auto",
                    gap: 8,
                    alignItems: "center",
                    border: "1px solid #f1f1eb",
                    borderRadius: 12,
                    padding: "8px 10px",
                    background: "#fafaf7",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800 }}>
                    {row.final_rank}
                  </div>
                  <HorseIcon horseId={row.horse_id} number={row.horse_id} size={36} />
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.display_name}
                  </div>
                  <div style={{ fontSize: 11, color: "#666" }}>
                    {Number(row.final_distance).toFixed(2)}
                  </div>
                </div>
              ))}

              {!room?.result_payload?.ranking?.length && (
                <div style={{ color: "#888", fontSize: 11 }}>
                  まだ結果はありません。
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}