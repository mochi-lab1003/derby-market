"use client";

import { useMemo, useState } from "react";

const HORSES = ["01", "02", "03", "04", "05"];
const PLAYERS = ["P1", "P2", "P3"];

const SAMPLE_PUBLIC = [
  { horse: "01", count: 2, hasTrait: false },
  { horse: "02", count: 1, hasTrait: true },
  { horse: "03", count: 3, hasTrait: false },
  { horse: "04", count: 0, hasTrait: false },
  { horse: "05", count: 1, hasTrait: false },
];

const ODDS_BY_RANK = [2.0, 2.8, 3.6, 4.8, 6.0];

function average(arr) {
  return arr.reduce((sum, n) => sum + n, 0) / arr.length;
}

function computeOdds(entries) {
  const withPopularity = entries.map((entry) => ({
    ...entry,
    popularity: entry.count + (entry.hasTrait ? 1 : 0),
  }));

  const sorted = [...withPopularity].sort((a, b) => b.popularity - a.popularity);

  let currentRank = 1;
  const rankMap = {};

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].popularity < sorted[i - 1].popularity) {
      currentRank = i + 1;
    }
    rankMap[sorted[i].horse] = currentRank;
  }

  const ranked = withPopularity.map((entry) => ({
    ...entry,
    rank: rankMap[entry.horse],
  }));

  const grouped = {};
  ranked.forEach((entry, index) => {
    if (!grouped[entry.rank]) grouped[entry.rank] = [];
    grouped[entry.rank].push(index);
  });

  const odds = new Array(ranked.length).fill(0);

  Object.entries(grouped).forEach(([rankText, indexes]) => {
    const rank = Number(rankText);
    const slice = ODDS_BY_RANK.slice(rank - 1, rank - 1 + indexes.length);
    const value = Number(average(slice).toFixed(1));
    indexes.forEach((idx) => {
      odds[idx] = value;
    });
  });

  return ranked.map((entry, i) => ({
    ...entry,
    odds: odds[i],
  }));
}

function simulateRace(entries) {
  const horses = entries.map((entry) => {
    const base = 8;
    const hiddenBoost = Math.random() * 4;
    const traitBoost = entry.hasTrait ? Math.random() * 2.5 : 0;
    const countEffect = entry.count * 1.2;
    const final = Number((base + hiddenBoost + traitBoost + countEffect).toFixed(1));
    return {
      horse: entry.horse,
      final,
      count: entry.count,
      hasTrait: entry.hasTrait,
    };
  });

  const ranking = [...horses].sort((a, b) => b.final - a.final);

  const logs = [];
  ranking.forEach((h, index) => {
    logs.push(`${index + 1}位: Horse ${h.horse} (${h.final})`);
  });

  return { ranking, logs };
}

export default function DerbyHostPage() {
  const [phase, setPhase] = useState("assign");
  const [publicEntries, setPublicEntries] = useState(SAMPLE_PUBLIC);
  const [readyMap, setReadyMap] = useState({
    P1: false,
    P2: false,
    P3: false,
  });
  const [result, setResult] = useState(null);

  const entriesWithOdds = useMemo(() => computeOdds(publicEntries), [publicEntries]);

  const allReady = PLAYERS.every((p) => readyMap[p]);

  const toggleReady = (player) => {
    if (phase !== "bet") return;
    setReadyMap((prev) => ({
      ...prev,
      [player]: !prev[player],
    }));
  };

  const goToBet = () => {
    setPhase("bet");
    setResult(null);
    setReadyMap({
      P1: false,
      P2: false,
      P3: false,
    });
  };

  const runRace = () => {
    if (!allReady) return;
    const sim = simulateRace(entriesWithOdds);
    setResult(sim);
    setPhase("result");
  };

  const resetHost = () => {
    setPhase("assign");
    setPublicEntries(SAMPLE_PUBLIC);
    setReadyMap({
      P1: false,
      P2: false,
      P3: false,
    });
    setResult(null);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#f5f5f5", padding: 24 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 32, marginBottom: 8 }}>DERBY MARKET / HOST</h1>
          <p style={{ color: "#a3a3a3" }}>
            中央画面。公開情報とレース進行だけを表示する。
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid #2a2a2a",
              background: "#111",
            }}
          >
            Phase: <strong>{phase}</strong>
          </div>

          <div
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid #2a2a2a",
              background: "#111",
              color: allReady ? "#d4ffd4" : "#d4d4d4",
            }}
          >
            Ready: {PLAYERS.filter((p) => readyMap[p]).length}/{PLAYERS.length}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 24,
            alignItems: "start",
          }}
        >
          <section
            style={{
              border: "1px solid #262626",
              borderRadius: 18,
              padding: 18,
              background: "#080808",
            }}
          >
            <div style={{ marginBottom: 14, fontSize: 20 }}>Public Market</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              {entriesWithOdds.map((entry) => (
                <div
                  key={entry.horse}
                  style={{
                    border: "1px solid #232323",
                    borderRadius: 16,
                    padding: 16,
                    background: "#0f0f0f",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <strong>Horse {entry.horse}</strong>
                    <span>x{entry.odds}</span>
                  </div>

                  <div style={{ fontSize: 14, color: "#b4b4b4", lineHeight: 1.8 }}>
                    <div>付与枚数: {entry.count}</div>
                    <div>特性: {entry.hasTrait ? "あり" : "なし"}</div>
                    <div>人気順位: {entry.rank}</div>
                  </div>
                </div>
              ))}
            </div>

            {phase === "result" && result && (
              <div style={{ marginTop: 24 }}>
                <div style={{ marginBottom: 10, fontSize: 20 }}>Race View</div>

                <div style={{ display: "grid", gap: 12 }}>
                  {result.ranking.map((h, index) => (
                    <div key={h.horse}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 6,
                          fontSize: 14,
                        }}
                      >
                        <span>
                          {index + 1}. Horse {h.horse}
                        </span>
                        <span>{h.final}</span>
                      </div>

                      <div
                        style={{
                          height: 14,
                          background: "#262626",
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, h.final * 6)}%`,
                            height: "100%",
                            background: "#f5f5f5",
                            transition: "width 1s ease",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside
            style={{
              border: "1px solid #262626",
              borderRadius: 18,
              padding: 18,
              background: "#080808",
            }}
          >
            <div style={{ marginBottom: 14, fontSize: 20 }}>Control</div>

            {phase === "assign" && (
              <>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid #232323",
                    background: "#111",
                    color: "#cfcfcf",
                    lineHeight: 1.7,
                    fontSize: 14,
                  }}
                >
                  個室で付与が終わった想定で、中央画面を bet フェーズへ進める。
                </div>

                <button
                  onClick={goToBet}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #404040",
                    background: "#fafafa",
                    color: "#111",
                    cursor: "pointer",
                  }}
                >
                  BET フェーズへ
                </button>
              </>
            )}

            {phase === "bet" && (
              <>
                <div style={{ display: "grid", gap: 10 }}>
                  {PLAYERS.map((p) => (
                    <button
                      key={p}
                      onClick={() => toggleReady(p)}
                      style={{
                        width: "100%",
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid #404040",
                        background: readyMap[p] ? "#f5f5f5" : "#171717",
                        color: readyMap[p] ? "#111" : "#fafafa",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {p} {readyMap[p] ? "READY" : "WAITING"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={runRace}
                  disabled={!allReady}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #404040",
                    background: allReady ? "#fafafa" : "#222",
                    color: allReady ? "#111" : "#666",
                    cursor: allReady ? "pointer" : "not-allowed",
                  }}
                >
                  レース開始
                </button>
              </>
            )}

            {phase === "result" && (
              <>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid #232323",
                    background: "#111",
                    color: "#cfcfcf",
                    lineHeight: 1.7,
                    fontSize: 14,
                  }}
                >
                  レース終了。結果を確認して次のラウンドへ進める。
                </div>

                <button
                  onClick={resetHost}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #404040",
                    background: "#fafafa",
                    color: "#111",
                    cursor: "pointer",
                  }}
                >
                  リセット
                </button>
              </>
            )}

            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 14,
                border: "1px solid #232323",
                background: "#111",
              }}
            >
              <div style={{ marginBottom: 10, fontSize: 15 }}>Player Rooms</div>
              <div style={{ color: "#bdbdbd", lineHeight: 1.8, fontSize: 14 }}>
                <div>/derby/player/p1</div>
                <div>/derby/player/p2</div>
                <div>/derby/player/p3</div>
              </div>
            </div>

            {phase === "result" && result && (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid #232323",
                  background: "#111",
                }}
              >
                <div style={{ marginBottom: 10, fontSize: 15 }}>Log</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {result.logs.map((log, index) => (
                    <div
                      key={index}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid #262626",
                        background: "#0b0b0b",
                        color: "#d4d4d4",
                        fontSize: 13,
                      }}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}