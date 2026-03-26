"use client";

import { useMemo, useState } from "react";

const PLAYERS = ["P1", "P2", "P3"];
const HORSES = [
  { id: "01", name: "Horse 01", attached: 2 },
  { id: "02", name: "Horse 02", attached: 1 },
  { id: "03", name: "Horse 03", attached: 3 },
  { id: "04", name: "Horse 04", attached: 0 },
  { id: "05", name: "Horse 05", attached: 4 },
];

function getWinOdds(attachedCount) {
  if (attachedCount <= 0) return 7;
  if (attachedCount === 1) return 6;
  if (attachedCount === 2) return 5;
  if (attachedCount === 3) return 4;
  if (attachedCount === 4) return 3;
  if (attachedCount === 5) return 2;
  return 1;
}

function getTrifectaOdds(sumOfWinOdds) {
  if (sumOfWinOdds <= 5) return 3;
  if (sumOfWinOdds <= 8) return 4;
  if (sumOfWinOdds <= 11) return 5;
  if (sumOfWinOdds <= 14) return 7;
  return 10;
}

export default function DerbyPanelPage() {
  const [step, setStep] = useState("player");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [betType, setBetType] = useState(null);
  const [winHorse, setWinHorse] = useState(null);
  const [triFirst, setTriFirst] = useState(null);
  const [triSecond, setTriSecond] = useState(null);
  const [triThird, setTriThird] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const winSelection = useMemo(() => {
    if (!winHorse) return null;
    const horse = HORSES.find((h) => h.id === winHorse);
    const odds = getWinOdds(horse.attached);
    return {
      cost: 1,
      odds,
      back: 1 * odds,
    };
  }, [winHorse]);

  const trifectaSelection = useMemo(() => {
    if (!triFirst || !triSecond || !triThird) return null;

    const horseA = HORSES.find((h) => h.id === triFirst);
    const horseB = HORSES.find((h) => h.id === triSecond);
    const horseC = HORSES.find((h) => h.id === triThird);

    const sum =
      getWinOdds(horseA.attached) +
      getWinOdds(horseB.attached) +
      getWinOdds(horseC.attached);

    const odds = getTrifectaOdds(sum);

    return {
      cost: 2,
      odds,
      back: 2 * odds,
      sum,
    };
  }, [triFirst, triSecond, triThird]);

  const resetAll = () => {
    setStep("player");
    setSelectedPlayer(null);
    setBetType(null);
    setWinHorse(null);
    setTriFirst(null);
    setTriSecond(null);
    setTriThird(null);
    setConfirmed(false);
  };

  const nextFromPlayer = () => {
    if (!selectedPlayer) return;
    setStep("type");
  };

  const nextFromType = () => {
    if (!betType) return;
    setStep("bet");
  };

  const currentSummary =
    betType === "win"
      ? winSelection
      : betType === "trifecta"
      ? trifectaSelection
      : null;

  const canConfirm =
    (betType === "win" && !!winSelection) ||
    (betType === "trifecta" && !!trifectaSelection);

  return (
    <main style={{ minHeight: "100vh", background: "#fafafa", color: "#111", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>DERBY MARKET / PANEL</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>
          共用操作端末。ボタン選択のみで進行。
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          {["player", "type", "bet"].map((s) => (
            <div
              key={s}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid #ddd",
                background: step === s ? "#111" : "#fff",
                color: step === s ? "#fff" : "#111",
                fontSize: 14,
              }}
            >
              {s}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 20,
              padding: 20,
              background: "#fff",
            }}
          >
            {step === "player" && (
              <>
                <h2 style={{ marginBottom: 16 }}>プレイヤーを選択</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {PLAYERS.map((player) => (
                    <button
                      key={player}
                      onClick={() => setSelectedPlayer(player)}
                      style={{
                        padding: 18,
                        borderRadius: 16,
                        border: "1px solid #ddd",
                        background: selectedPlayer === player ? "#111" : "#fff",
                        color: selectedPlayer === player ? "#fff" : "#111",
                        cursor: "pointer",
                        fontSize: 18,
                      }}
                    >
                      {player}
                    </button>
                  ))}
                </div>

                <button
                  onClick={nextFromPlayer}
                  disabled={!selectedPlayer}
                  style={{
                    marginTop: 20,
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid #111",
                    background: selectedPlayer ? "#111" : "#eee",
                    color: selectedPlayer ? "#fff" : "#999",
                    cursor: selectedPlayer ? "pointer" : "not-allowed",
                  }}
                >
                  次へ
                </button>
              </>
            )}

            {step === "type" && (
              <>
                <h2 style={{ marginBottom: 16 }}>賭け種を選択</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <button
                    onClick={() => setBetType("win")}
                    style={{
                      padding: 24,
                      borderRadius: 16,
                      border: "1px solid #ddd",
                      background: betType === "win" ? "#111" : "#fff",
                      color: betType === "win" ? "#fff" : "#111",
                      cursor: "pointer",
                      fontSize: 20,
                    }}
                  >
                    単勝
                  </button>

                  <button
                    onClick={() => setBetType("trifecta")}
                    style={{
                      padding: 24,
                      borderRadius: 16,
                      border: "1px solid #ddd",
                      background: betType === "trifecta" ? "#111" : "#fff",
                      color: betType === "trifecta" ? "#fff" : "#111",
                      cursor: "pointer",
                      fontSize: 20,
                    }}
                  >
                    3連単
                  </button>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                  <button
                    onClick={() => setStep("player")}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: "1px solid #ddd",
                      background: "#fff",
                      color: "#111",
                      cursor: "pointer",
                    }}
                  >
                    戻る
                  </button>

                  <button
                    onClick={nextFromType}
                    disabled={!betType}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: "1px solid #111",
                      background: betType ? "#111" : "#eee",
                      color: betType ? "#fff" : "#999",
                      cursor: betType ? "pointer" : "not-allowed",
                    }}
                  >
                    次へ
                  </button>
                </div>
              </>
            )}

            {step === "bet" && betType === "win" && (
              <>
                <h2 style={{ marginBottom: 16 }}>単勝を選択</h2>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                  {HORSES.map((horse) => {
                    const odds = getWinOdds(horse.attached);
                    return (
                      <button
                        key={horse.id}
                        onClick={() => setWinHorse(horse.id)}
                        style={{
                          textAlign: "left",
                          padding: 16,
                          borderRadius: 16,
                          border: "1px solid #ddd",
                          background: winHorse === horse.id ? "#111" : "#fff",
                          color: winHorse === horse.id ? "#fff" : "#111",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>{horse.name}</div>
                        <div style={{ fontSize: 14, opacity: 0.8 }}>付与枚数: {horse.attached}</div>
                        <div style={{ fontSize: 14, opacity: 0.8 }}>単勝 x{odds}</div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === "bet" && betType === "trifecta" && (
              <>
                <h2 style={{ marginBottom: 16 }}>3連単を選択</h2>

                <div style={{ display: "grid", gap: 16 }}>
                  <div>
                    <div style={{ marginBottom: 8, color: "#666" }}>1着</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                      {HORSES.map((horse) => (
                        <button
                          key={`first-${horse.id}`}
                          onClick={() => {
                            setTriFirst(horse.id);
                            if (triSecond === horse.id) setTriSecond(null);
                            if (triThird === horse.id) setTriThird(null);
                          }}
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            background: triFirst === horse.id ? "#111" : "#fff",
                            color: triFirst === horse.id ? "#fff" : "#111",
                            cursor: "pointer",
                          }}
                        >
                          {horse.id}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ marginBottom: 8, color: "#666" }}>2着</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                      {HORSES.filter((h) => h.id !== triFirst).map((horse) => (
                        <button
                          key={`second-${horse.id}`}
                          onClick={() => {
                            setTriSecond(horse.id);
                            if (triThird === horse.id) setTriThird(null);
                          }}
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            background: triSecond === horse.id ? "#111" : "#fff",
                            color: triSecond === horse.id ? "#fff" : "#111",
                            cursor: "pointer",
                          }}
                        >
                          {horse.id}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ marginBottom: 8, color: "#666" }}>3着</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                      {HORSES.filter((h) => h.id !== triFirst && h.id !== triSecond).map((horse) => (
                        <button
                          key={`third-${horse.id}`}
                          onClick={() => setTriThird(horse.id)}
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            border: "1px solid #ddd",
                            background: triThird === horse.id ? "#111" : "#fff",
                            color: triThird === horse.id ? "#fff" : "#111",
                            cursor: "pointer",
                          }}
                        >
                          {horse.id}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          <aside
            style={{
              border: "1px solid #ddd",
              borderRadius: 20,
              padding: 20,
              background: "#fff",
            }}
          >
            <h2 style={{ marginBottom: 16 }}>現在の内容</h2>

            <div style={{ display: "grid", gap: 10, fontSize: 15 }}>
              <div>プレイヤー: {selectedPlayer || "-"}</div>
              <div>賭け種: {betType === "win" ? "単勝" : betType === "trifecta" ? "3連単" : "-"}</div>

              {betType === "win" && winHorse && <div>買い目: Horse {winHorse}</div>}

              {betType === "trifecta" && (
                <div>
                  買い目: {triFirst || "-"} → {triSecond || "-"} → {triThird || "-"}
                </div>
              )}

              <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid #eee" }}>
                コスト: {currentSummary ? currentSummary.cost : "-"}
              </div>
              <div>オッズ: {currentSummary ? `x${currentSummary.odds}` : "-"}</div>
              <div>バック: {currentSummary ? currentSummary.back : "-"}</div>
            </div>

            {step === "bet" && (
              <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
                <button
                  onClick={() => setStep("type")}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid #ddd",
                    background: "#fff",
                    color: "#111",
                    cursor: "pointer",
                  }}
                >
                  戻る
                </button>

                <button
                  onClick={() => setConfirmed(true)}
                  disabled={!canConfirm}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid #111",
                    background: canConfirm ? "#111" : "#eee",
                    color: canConfirm ? "#fff" : "#999",
                    cursor: canConfirm ? "pointer" : "not-allowed",
                  }}
                >
                  確定
                </button>
              </div>
            )}

            {confirmed && (
              <div
                style={{
                  marginTop: 20,
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid #ddd",
                  background: "#f6f6f6",
                  lineHeight: 1.6,
                }}
              >
                買い目を確定した。  
                <br />
                このコスト分のチップを支払ってください。
              </div>
            )}

            <button
              onClick={resetAll}
              style={{
                marginTop: 20,
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #ddd",
                background: "#fff",
                color: "#111",
                cursor: "pointer",
              }}
            >
              リセット
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
