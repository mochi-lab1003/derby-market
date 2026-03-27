"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ROOM_ID } from "@/lib/derbyConfig";

function HorseChip({ horse, widthPercent }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        gap: 16,
        alignItems: "center",
      }}
    >
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 16,
          padding: 14,
          background: "#fff",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18 }}>{horse.display_name}</div>
        <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{horse.flavor_label}</div>
        <div style={{ fontSize: 13, color: "#444", marginTop: 10 }}>
          付与枚数: {horse.attached_count} / 単勝 x{horse.win_odds}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          height: 52,
          borderRadius: 999,
          background: "linear-gradient(to right, #f0f0f0, #fafafa)",
          border: "1px solid #ddd",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${widthPercent}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 28,
            transition: "left 800ms ease",
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
    if (!room?.result_payload?.segmentSnapshots?.length) {
      setCurrentSegmentIndex(-1);
      return;
    }

    let index = -1;
    const timer = setInterval(() => {
      index += 1;
      if (index >= room.result_payload.segmentSnapshots.length) {
        clearInterval(timer);
        return;
      }
      setCurrentSegmentIndex(index);
    }, 1200);

    return () => clearInterval(timer);
  }, [room?.race_number, room?.phase]);

  const animatedPositions = useMemo(() => {
    if (!room?.result_payload?.segmentSnapshots?.length || currentSegmentIndex < 0) {
      return {};
    }

    const snapshot = room.result_payload.segmentSnapshots[currentSegmentIndex];
    const max = Math.max(...snapshot.positions.map((p) => p.total), 1);

    return Object.fromEntries(
      snapshot.positions.map((p) => [p.horse_id, Math.max(3, (p.total / max) * 92)])
    );
  }, [room?.result_payload, currentSegmentIndex]);

  const currentSegment =
    currentSegmentIndex >= 0 && room?.result_payload?.segmentSnapshots?.[currentSegmentIndex]
      ? room.result_payload.segmentSnapshots[currentSegmentIndex].segment
      : null;

  return (
    <main style={{ minHeight: "100vh", background: "#fbfbf8", color: "#111", padding: 24 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 34, marginBottom: 8 }}>DERBY MARKET</h1>
          <div style={{ color: "#666" }}>白い試験走路 / 公開情報のみ表示</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ padding: "8px 14px", border: "1px solid #ddd", borderRadius: 999, background: "#fff" }}>
            Room: {ROOM_ID}
          </div>
          <div style={{ padding: "8px 14px", border: "1px solid #ddd", borderRadius: 999, background: "#fff" }}>
            Phase: {room?.phase || "setup"}
          </div>
          <div style={{ padding: "8px 14px", border: "1px solid #ddd", borderRadius: 999, background: "#fff" }}>
            Race: {room?.race_number || 1}
          </div>
          {currentSegment && (
            <div style={{ padding: "8px 14px", border: "1px solid #111", borderRadius: 999, background: "#111", color: "#fff" }}>
              Segment: {currentSegment}
            </div>
          )}
        </div>

        <section style={{ border: "1px solid #ddd", borderRadius: 24, background: "#fff", padding: 20 }}>
          <div style={{ fontSize: 20, marginBottom: 16 }}>出走情報</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {horses.map((horse) => (
              <div key={horse.horse_id} style={{ border: "1px solid #eee", borderRadius: 18, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{horse.display_name}</div>
                <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>{horse.flavor_label}</div>
                <div style={{ marginTop: 12, fontSize: 14 }}>付与枚数: {horse.attached_count}</div>
                <div style={{ marginTop: 4, fontSize: 14 }}>特性: {horse.has_trait ? "あり" : "なし"}</div>
                <div style={{ marginTop: 4, fontSize: 14 }}>単勝: x{horse.win_odds}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ border: "1px solid #ddd", borderRadius: 24, background: "#fff", padding: 20 }}>
          <div style={{ fontSize: 20, marginBottom: 16 }}>レース</div>
          <div style={{ display: "grid", gap: 16 }}>
            {horses.map((horse) => (
              <HorseChip
                key={horse.horse_id}
                horse={horse}
                widthPercent={animatedPositions[horse.horse_id] ?? 3}
              />
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ border: "1px solid #ddd", borderRadius: 24, background: "#fff", padding: 20 }}>
            <div style={{ fontSize: 20, marginBottom: 16 }}>最終順位</div>
            <div style={{ display: "grid", gap: 12 }}>
              {[...(room?.result_payload?.ranking || [])].map((row) => (
                <div key={row.horse_id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f0f0f0", paddingBottom: 8 }}>
                  <span>{row.final_rank}位 / {row.display_name}</span>
                  <span>{Number(row.final_distance).toFixed(2)}</span>
                </div>
              ))}
              {!room?.result_payload?.ranking?.length && <div style={{ color: "#888" }}>まだ結果はありません。</div>}
            </div>
          </div>

          <div style={{ border: "1px solid #ddd", borderRadius: 24, background: "#fff", padding: 20 }}>
            <div style={{ fontSize: 20, marginBottom: 16 }}>ログ</div>
            <div style={{ display: "grid", gap: 8, maxHeight: 360, overflow: "auto" }}>
              {(room?.result_payload?.logs || []).map((log, i) => (
                <div key={i} style={{ border: "1px solid #f0f0f0", borderRadius: 14, padding: 12, background: "#fafafa" }}>
                  {log}
                </div>
              ))}
              {!room?.result_payload?.logs?.length && <div style={{ color: "#888" }}>ログはまだありません。</div>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}