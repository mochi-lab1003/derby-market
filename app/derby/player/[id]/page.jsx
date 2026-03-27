"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const SAMPLE_HANDS = {
  p1: [
    { id: "p1-1", label: "SPD +2", type: "stat" },
    { id: "p1-2", label: "STA +2", type: "stat" },
    { id: "p1-3", label: "ACC -1", type: "stat" },
    { id: "p1-4", label: "瞬発", type: "trait" },
    { id: "p1-5", label: "SPD -1", type: "stat" },
  ],
  p2: [
    { id: "p2-1", label: "SPD +1", type: "stat" },
    { id: "p2-2", label: "STA -2", type: "stat" },
    { id: "p2-3", label: "ACC +2", type: "stat" },
    { id: "p2-4", label: "粘走", type: "trait" },
    { id: "p2-5", label: "ACC +1", type: "stat" },
  ],
  p3: [
    { id: "p3-1", label: "SPD -2", type: "stat" },
    { id: "p3-2", label: "STA +1", type: "stat" },
    { id: "p3-3", label: "ACC +2", type: "stat" },
    { id: "p3-4", label: "気分屋", type: "trait" },
    { id: "p3-5", label: "STA +2", type: "stat" },
  ],
};

const SAMPLE_PUBLIC = [
  { horse: "01", count: 2, hasTrait: false, odds: 2.8 },
  { horse: "02", count: 1, hasTrait: true, odds: 3.6 },
  { horse: "03", count: 3, hasTrait: false, odds: 2.0 },
  { horse: "04", count: 0, hasTrait: false, odds: 6.0 },
  { horse: "05", count: 1, hasTrait: false, odds: 4.8 },
];

const ROOM_ID = "room-alpha";

export default function DerbyPlayerPage() {
  const params = useParams();
  const playerId = String(params.id || "").toLowerCase();

  const hand = SAMPLE_HANDS[playerId] || [];
  const [selectedHorse, setSelectedHorse] = useState("01");
  const [betAmount, setBetAmount] = useState(3);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleConfirm = async () => {
    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("derby_bets").upsert(
      {
        room_id: ROOM_ID,
        player_id: playerId,
        selected_horse: selectedHorse,
        bet_amount: betAmount,
        is_ready: true,
      },
      { onConflict: "room_id,player_id" }
    );

    setSaving(false);

    if (error) {
      setConfirmed(false);
      setMessage(`保存失敗: ${error.message}`);
      return;
    }

    setConfirmed(true);
    setMessage("賭けを確定した。");
  };

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#f5f5f5", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>DERBY MARKET / PLAYER ROOM</h1>
        <p style={{ color: "#aaa", marginBottom: 24 }}>
          Player: <strong>{playerId.toUpperCase()}</strong>
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>
          <section style={{ border: "1px solid #262626", borderRadius: 16, padding: 16 }}>
            <h2 style={{ marginBottom: 12 }}>Your Hand</h2>

            <div style={{ display: "grid", gap: 8 }}>
              {hand.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 12,
                    border: selectedCardId === card.id ? "1px solid #fafafa" : "1px solid #333",
                    background: selectedCardId === card.id ? "#262626" : "#111",
                    color: "#fafafa",
                    cursor: "pointer",
                  }}
                >
                  <div>{card.label}</div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                    {card.type === "trait" ? "Trait" : "Stat"}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section style={{ border: "1px solid #262626", borderRadius: 16, padding: 16 }}>
            <h2 style={{ marginBottom: 12 }}>Public Market</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              {SAMPLE_PUBLIC.map((entry) => (
                <button
                  key={entry.horse}
                  onClick={() => setSelectedHorse(entry.horse)}
                  style={{
                    textAlign: "left",
                    border: selectedHorse === entry.horse ? "1px solid #fafafa" : "1px solid #262626",
                    borderRadius: 16,
                    padding: 16,
                    background: selectedHorse === entry.horse ? "#151515" : "#0b0b0b",
                    color: "#f5f5f5",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <strong>Horse {entry.horse}</strong>
                    <span>x{entry.odds}</span>
                  </div>

                  <div style={{ fontSize: 14, color: "#aaa", lineHeight: 1.7 }}>
                    <div>付与枚数: {entry.count}</div>
                    <div>特性: {entry.hasTrait ? "あり" : "なし"}</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 160px 180px", gap: 12, alignItems: "end" }}>
              <div>
                <div style={{ fontSize: 13, color: "#999", marginBottom: 6 }}>選択中の賭け先</div>
                <div style={{ padding: 12, borderRadius: 12, border: "1px solid #333", background: "#111" }}>
                  Horse {selectedHorse}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, color: "#999", marginBottom: 6 }}>賭け額</div>
                <input
                  type="number"
                  min="1"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value || 1)))}
                  style={{
                    width: "100%",
                    padding: "12px 10px",
                    borderRadius: 12,
                    border: "1px solid #404040",
                    background: "#0a0a0a",
                    color: "#fafafa",
                  }}
                />
              </div>

              <button
                onClick={handleConfirm}
                disabled={saving}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #404040",
                  background: "#fafafa",
                  color: "#111",
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "保存中..." : "賭けを確定"}
              </button>
            </div>

            {confirmed && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: "1px solid #2f2f2f", background: "#111", color: "#d4d4d4" }}>
                {playerId.toUpperCase()} は Horse {selectedHorse} に {betAmount}c 賭けた。
              </div>
            )}

            {message && (
              <div style={{ marginTop: 12, color: "#cfcfcf", fontSize: 14 }}>
                {message}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}