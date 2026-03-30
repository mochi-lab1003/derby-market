"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROOM_ID } from "@/lib/derbyConfig";

const SEGMENTS = ["START", "EARLY", "MID", "LATE", "FINAL"];

function TrackLane({ horse, percent }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
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

      <div
        style={{
          position: "relative",
          height: 42,
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
            transition: "left 1400ms ease",
            fontSize: 24,
            lineHeight: 1,
          }}
        >
          ♞
        </div>
      </div>
    </div>
  );
}

export default function DerbyHostPage() {
  const [room, setRoom] = useState(null);
  const [horses, setHorses] = useState([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [liveLogs, setLiveLogs] = useState([]);
  const timerRef = useRef(null);

  async function load() {
    const { data: roomData } = await supabase
      .from("derby_rooms")
      .select("*")
      .eq("room_id", ROOM_ID)
      .maybeSingle();

    const { data: horseData } = await supabase
      .from("derby_horses")
      .select("*")
      .eq("room_id", ROOM_ID)
      .order("horse_id", { ascending: true });

    setRoom(roomData || null);
    setHorses(horseData || []);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      room?.phase !== "race" ||
      !room?.result_payload?.segmentSnapshots?.length
    ) {
      setCurrentSegmentIndex(-1);
      setLiveLogs([]);
      return;
    }

    setCurrentSegmentIndex(-1);
    setLiveLogs([]);

    let index = -1;
    timerRef.current = setInterval(() => {
      index += 1;

      if (index >= room.result_payload.segmentSnapshots.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
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
  }, [room?.phase, room?.race_number, room?.result_payload]);

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
  }, [horses, room?.phase, room?.result_payload, currentSegmentIndex]);

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
          maxWidth: 1200,
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
              gridTemplateColumns: "1fr auto auto auto",
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
                key={horse.horse_id}
                horse={horse}
                percent={animatedPositions[horse.horse_id] ?? 3}
              />
            ))}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr 1fr",
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
                    gridTemplateColumns: "1fr auto auto",
                    gap: 8,
                    alignItems: "center",
                    border: "1px solid #f1f1eb",
                    borderRadius: 12,
                    padding: "8px 10px",
                    background: "#fafaf7",
                  }}
                >
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
                maxHeight: 190,
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
                    gridTemplateColumns: "40px 1fr auto",
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