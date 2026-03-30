"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ROOM_ID,
  DECK,
  HORSE_DEFS,
  getPlayers,
  getTrifectaOdds,
  getWinOdds,
} from "@/lib/derbyConfig";
import { simulateDerbyRace } from "@/lib/derbyRace";

function SelectCard({ active, onClick, children, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: 14,
        borderRadius: 14,
        border: "1px solid #ddd",
        background: disabled ? "#f2f2f2" : active ? "#111" : "#fff",
        color: disabled ? "#999" : active ? "#fff" : "#111",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
      }}
    >
      {children}
    </button>
  );
}

function judgeBet(bet, ranking) {
  if (!bet || !ranking?.length) return { hit: false, payout: 0 };

  if (bet.bet_type === "win") {
    const first = ranking.find((r) => r.final_rank === 1);
    const hit = first?.horse_id === bet.horse_1;
    return { hit, payout: hit ? bet.back : 0 };
  }

  if (bet.bet_type === "trifecta") {
    const first = ranking.find((r) => r.final_rank === 1)?.horse_id;
    const second = ranking.find((r) => r.final_rank === 2)?.horse_id;
    const third = ranking.find((r) => r.final_rank === 3)?.horse_id;

    const hit =
      first === bet.horse_1 &&
      second === bet.horse_2 &&
      third === bet.horse_3;

    return { hit, payout: hit ? bet.back : 0 };
  }

  return { hit: false, payout: 0 };
}

export default function DerbyPanelPage() {
  const [room, setRoom] = useState(null);
  const [horses, setHorses] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [bets, setBets] = useState([]);

  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [selectedAttachHorse, setSelectedAttachHorse] = useState(null);

  const [betType, setBetType] = useState(null);
  const [winHorse, setWinHorse] = useState(null);
  const [triFirst, setTriFirst] = useState(null);
  const [triSecond, setTriSecond] = useState(null);
  const [triThird, setTriThird] = useState(null);
  const [stake, setStake] = useState("1");

  const [horseNames, setHorseNames] = useState({
    "01": "",
    "02": "",
    "03": "",
    "04": "",
    "05": "",
  });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const { data: roomData, error: roomError } = await supabase
      .from("derby_rooms")
      .select("*")
      .eq("room_id", ROOM_ID)
      .maybeSingle();

    if (roomError) {
      console.error("load room error", roomError);
      setMessage(`load room error: ${roomError.message}`);
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

    const horseRows = horseData || [];
    setRoom(roomData || null);
    setHorses(horseRows);
    setAttachments(attachmentData || []);
    setBets(betData || []);

    if (horseRows.length) {
      setHorseNames(
        Object.fromEntries(
          horseRows.map((h) => [h.horse_id, h.display_name || ""])
        )
      );
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 1200);
    return () => clearInterval(id);
  }, []);

  const playerCount = room?.player_count ?? 3;
  const raceNumber = room?.race_number ?? 1;
  const players = getPlayers(playerCount);

  const cardsUsedBySelectedPlayer = useMemo(() => {
    if (!selectedPlayer) return new Set();
    return new Set(
      attachments
        .filter((a) => a.player_id === selectedPlayer)
        .map((a) => a.card_id)
    );
  }, [attachments, selectedPlayer]);

  const selectedPlayerVisibleCards = useMemo(() => {
    if (!selectedPlayer) return [];
    return DECK.map((card) => {
      const usedByMe = cardsUsedBySelectedPlayer.has(card.id);
      const myAttachment = attachments.find(
        (a) => a.player_id === selectedPlayer && a.card_id === card.id
      );
      return {
        ...card,
        usedByMe,
        myAttachment,
      };
    });
  }, [selectedPlayer, cardsUsedBySelectedPlayer, attachments]);

  const selectedCard = selectedPlayerVisibleCards.find(
    (c) => c.id === selectedCardId
  );

  const confirmedBetPlayers = bets.map((b) => b.player_id);
  const allBetsConfirmed = players.every((p) =>
    confirmedBetPlayers.includes(p)
  );

  const currentOdds = useMemo(() => {
    if (betType === "win" && winHorse) {
      const horse = horses.find((h) => h.horse_id === winHorse);
      return horse?.win_odds ?? null;
    }

    if (betType === "trifecta" && triFirst && triSecond && triThird) {
      const h1 = horses.find((h) => h.horse_id === triFirst);
      const h2 = horses.find((h) => h.horse_id === triSecond);
      const h3 = horses.find((h) => h.horse_id === triThird);
      if (!h1 || !h2 || !h3) return null;

      const sum = h1.win_odds + h2.win_odds + h3.win_odds;
      return getTrifectaOdds(sum);
    }

    return null;
  }, [betType, winHorse, triFirst, triSecond, triThird, horses]);

  const stakeValue = Math.max(1, Number(stake || 1));

  const currentBack = useMemo(() => {
    if (!currentOdds) return null;
    return currentOdds * stakeValue;
  }, [currentOdds, stakeValue]);

  const settlementRows = useMemo(() => {
    const ranking = room?.result_payload?.ranking || [];
    return players.map((player) => {
      const bet = bets.find((b) => b.player_id === player);
      const judged = judgeBet(bet, ranking);
      return {
        player,
        bet,
        ...judged,
      };
    });
  }, [players, bets, room?.result_payload]);

  async function initializeRoom(count) {
    setBusy(true);
    setMessage("");

    try {
      const playerCountValue = Number(count);

      const roomRes = await supabase.from("derby_rooms").upsert({
        room_id: ROOM_ID,
        phase: "attach",
        player_count: playerCountValue,
        race_number: 1,
        result_payload: null,
        updated_at: new Date().toISOString(),
      });
      if (roomRes.error) throw roomRes.error;

      const deleteHorsesRes = await supabase
        .from("derby_horses")
        .delete()
        .eq("room_id", ROOM_ID);
      if (deleteHorsesRes.error) throw deleteHorsesRes.error;

      const horseInsertRes = await supabase.from("derby_horses").insert(
        HORSE_DEFS.map((horse) => ({
          room_id: ROOM_ID,
          horse_id: horse.id,
          display_name:
            horseNames[horse.id]?.trim() || horse.defaultName,
          flavor_label: horse.flavor,
          attached_count: 0,
          has_trait: false,
          win_odds: getWinOdds(0),
        }))
      );
      if (horseInsertRes.error) throw horseInsertRes.error;

      const deleteAttachmentsRes = await supabase
        .from("derby_attachments")
        .delete()
        .eq("room_id", ROOM_ID);
      if (deleteAttachmentsRes.error) throw deleteAttachmentsRes.error;

      const deleteBetsRes = await supabase
        .from("derby_bets")
        .delete()
        .eq("room_id", ROOM_ID);
      if (deleteBetsRes.error) throw deleteBetsRes.error;

      setSelectedPlayer(null);
      setSelectedCardId(null);
      setSelectedAttachHorse(null);
      setBetType(null);
      setWinHorse(null);
      setTriFirst(null);
      setTriSecond(null);
      setTriThird(null);
      setStake("1");

      await load();
      setMessage("部屋を初期化した。");
    } catch (error) {
      console.error("initializeRoom error", error);
      setMessage(`初期化失敗: ${error.message || JSON.stringify(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveHorseNames() {
    if (!horses.length) {
      setMessage("先に部屋を初期化してください。");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      for (const horse of horses) {
        const nextName = horseNames[horse.horse_id]?.trim() || horse.display_name;
        const { error } = await supabase
          .from("derby_horses")
          .update({ display_name: nextName })
          .eq("room_id", ROOM_ID)
          .eq("horse_id", horse.horse_id);

        if (error) throw error;
      }

      await load();
      setMessage("馬名を保存した。");
    } catch (error) {
      console.error("saveHorseNames error", error);
      setMessage(`命名保存失敗: ${error.message || JSON.stringify(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function confirmAttach() {
    if (!selectedPlayer || !selectedCard || !selectedAttachHorse || busy) return;
    if (selectedCard.usedByMe) return;

    setBusy(true);
    setMessage("");

    try {
      const horse = horses.find((h) => h.horse_id === selectedAttachHorse);
      const nextCount = Math.min(6, (horse?.attached_count || 0) + 1);

      const insertAttachmentRes = await supabase.from("derby_attachments").insert({
        room_id: ROOM_ID,
        race_number: raceNumber,
        player_id: selectedPlayer,
        horse_id: selectedAttachHorse,
        card_id: selectedCard.id,
        card_name: selectedCard.cardName,
        stat_kind: selectedCard.statKind,
        stat_value: selectedCard.statValue,
        is_trait: selectedCard.isTrait,
        revealed: false,
      });
      if (insertAttachmentRes.error) throw insertAttachmentRes.error;

      const updateHorseRes = await supabase
        .from("derby_horses")
        .update({
          attached_count: nextCount,
          has_trait: (horse?.has_trait || false) || selectedCard.isTrait,
          win_odds: getWinOdds(nextCount),
        })
        .eq("room_id", ROOM_ID)
        .eq("horse_id", selectedAttachHorse);
      if (updateHorseRes.error) throw updateHorseRes.error;

      const totalUsed = attachments.length + 1;
      if (totalUsed >= DECK.length) {
        const roomUpdateRes = await supabase
          .from("derby_rooms")
          .update({
            phase: "bet",
            updated_at: new Date().toISOString(),
          })
          .eq("room_id", ROOM_ID);

        if (roomUpdateRes.error) throw roomUpdateRes.error;
      }

      setSelectedCardId(null);
      setSelectedAttachHorse(null);
      await load();
      setMessage("付与した。");
    } catch (error) {
      console.error("confirmAttach error", error);
      setMessage(`付与失敗: ${error.message || JSON.stringify(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function confirmBet() {
    if (!selectedPlayer || !betType || !currentOdds || !currentBack || busy) return;

    setBusy(true);
    setMessage("");

    try {
      const delRes = await supabase
        .from("derby_bets")
        .delete()
        .eq("room_id", ROOM_ID)
        .eq("race_number", raceNumber)
        .eq("player_id", selectedPlayer);

      if (delRes.error) throw delRes.error;

      const insertRes = await supabase.from("derby_bets").insert({
        room_id: ROOM_ID,
        race_number: raceNumber,
        player_id: selectedPlayer,
        bet_type: betType,
        horse_1: betType === "win" ? winHorse : triFirst,
        horse_2: betType === "trifecta" ? triSecond : null,
        horse_3: betType === "trifecta" ? triThird : null,
        cost: stakeValue,
        odds: currentOdds,
        back: currentBack,
        is_confirmed: true,
      });

      if (insertRes.error) throw insertRes.error;

      setBetType(null);
      setWinHorse(null);
      setTriFirst(null);
      setTriSecond(null);
      setTriThird(null);
      setStake("1");
      setSelectedPlayer(null);

      await load();
      setMessage("買い目を確定した。入力したチップ数を支払ってください。");
    } catch (error) {
      console.error("confirmBet error", error);
      setMessage(`賭け失敗: ${error.message || JSON.stringify(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function runRace() {
    if (busy || !allBetsConfirmed) return;
    setBusy(true);
    setMessage("");

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

      await load();
      setMessage("レース終了。共有画面で順位を確認してください。");
    } catch (error) {
      console.error("runRace error", error);
      setMessage(`レース失敗: ${error.message || JSON.stringify(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function openSettlement() {
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("derby_rooms")
        .update({
          phase: "settlement",
          updated_at: new Date().toISOString(),
        })
        .eq("room_id", ROOM_ID);

      if (error) throw error;

      await load();
      setMessage("精算画面を開いた。");
    } catch (error) {
      console.error("openSettlement error", error);
      setMessage(`精算遷移失敗: ${error.message || JSON.stringify(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function nextRace() {
    if (!room || busy) return;
    setBusy(true);
    setMessage("");

    try {
      const nextRaceNumber = room.race_number + 1;

      const delAttachments = await supabase
        .from("derby_attachments")
        .delete()
        .eq("room_id", ROOM_ID)
        .eq("race_number", room.race_number);
      if (delAttachments.error) throw delAttachments.error;

      const delBets = await supabase
        .from("derby_bets")
        .delete()
        .eq("room_id", ROOM_ID)
        .eq("race_number", room.race_number);
      if (delBets.error) throw delBets.error;

      const resetHorses = await supabase
        .from("derby_horses")
        .update({
          attached_count: 0,
          has_trait: false,
          win_odds: 7,
          final_rank: null,
          final_distance: null,
        })
        .eq("room_id", ROOM_ID);
      if (resetHorses.error) throw resetHorses.error;

      const roomUpdate = await supabase
        .from("derby_rooms")
        .update({
          phase: "attach",
          race_number: nextRaceNumber,
          result_payload: null,
          updated_at: new Date().toISOString(),
        })
        .eq("room_id", ROOM_ID);
      if (roomUpdate.error) throw roomUpdate.error;

      setSelectedPlayer(null);
      setSelectedCardId(null);
      setSelectedAttachHorse(null);
      setBetType(null);
      setWinHorse(null);
      setTriFirst(null);
      setTriSecond(null);
      setTriThird(null);
      setStake("1");

      await load();
      setMessage("次レースを準備した。");
    } catch (error) {
      console.error("nextRace error", error);
      setMessage(`次レース準備失敗: ${error.message || JSON.stringify(error)}`);
    } finally {
      setBusy(false);
    }
  }

  const attachEnabled = room?.phase === "attach";
  const betEnabled = room?.phase === "bet";
  const raceEnabled = room?.phase === "race";
  const settlementEnabled = room?.phase === "settlement";

  return (
    <main style={{ minHeight: "100vh", background: "#fafafa", color: "#111", padding: 16 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, marginBottom: 8 }}>DERBY MARKET / PANEL</h1>
          <div style={{ color: "#666" }}>操作・精算用画面</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ padding: "8px 14px", border: "1px solid #ddd", borderRadius: 999, background: "#fff" }}>
            Phase: {room?.phase || "setup"}
          </div>
          <div style={{ padding: "8px 14px", border: "1px solid #ddd", borderRadius: 999, background: "#fff" }}>
            Players: {room?.player_count || 3}
          </div>
          <div style={{ padding: "8px 14px", border: "1px solid #ddd", borderRadius: 999, background: "#fff" }}>
            Race: {room?.race_number || 1}
          </div>
        </div>

        <section style={{ border: "1px solid #ddd", borderRadius: 20, background: "#fff", padding: 16, display: "grid", gap: 14 }}>
          <div style={{ fontSize: 18 }}>セットアップ / 命名</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 10,
            }}
          >
            {HORSE_DEFS.map((horse) => (
              <div key={horse.id} style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Horse {horse.id}</div>
                <input
                  value={horseNames[horse.id] || ""}
                  onChange={(e) =>
                    setHorseNames((prev) => ({
                      ...prev,
                      [horse.id]: e.target.value,
                    }))
                  }
                  placeholder={horse.defaultName}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #ddd",
                    fontSize: 14,
                    background: "#fff",
                    color: "#111",
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[2, 3, 4, 5, 6, 7].map((count) => (
              <button
                key={count}
                onClick={() => initializeRoom(count)}
                disabled={busy}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: room?.player_count === count ? "#111" : "#fff",
                  color: room?.player_count === count ? "#fff" : "#111",
                  cursor: "pointer",
                }}
              >
                {count}人で開始
              </button>
            ))}

            <button
              onClick={saveHorseNames}
              disabled={busy || !horses.length}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: busy || !horses.length ? "#eee" : "#111",
                color: busy || !horses.length ? "#999" : "#fff",
                cursor: busy || !horses.length ? "not-allowed" : "pointer",
              }}
            >
              馬名を保存
            </button>

            {(settlementEnabled || raceEnabled) && (
              <button
                onClick={nextRace}
                disabled={busy}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                次レースへ
              </button>
            )}
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
          <section style={{ border: "1px solid #ddd", borderRadius: 20, background: "#fff", padding: 16 }}>
            <div style={{ fontSize: 18, marginBottom: 12 }}>
              {attachEnabled
                ? "付与フェーズ"
                : betEnabled
                ? "賭けフェーズ"
                : raceEnabled
                ? "クッション"
                : "精算フェーズ"}
            </div>

            {!room && <div style={{ color: "#888" }}>まず部屋を初期化してください。</div>}

            {room && (
              <>
                {!raceEnabled && !settlementEnabled && (
                  <div
                    style={{
                      marginBottom: 14,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {players.map((player) => (
                      <SelectCard
                        key={player}
                        active={selectedPlayer === player}
                        onClick={() => setSelectedPlayer(player)}
                      >
                        <div style={{ fontWeight: 700 }}>{player}</div>
                        <div style={{ fontSize: 12, color: selectedPlayer === player ? "#ddd" : "#666", marginTop: 4 }}>
                          {bets.some((b) => b.player_id === player) ? "賭け済み" : "待機中"}
                        </div>
                      </SelectCard>
                    ))}
                  </div>
                )}

                {attachEnabled && (
                  <div style={{ display: "grid", gap: 16 }}>
                    <div>
                      <div style={{ marginBottom: 10, color: "#666" }}>カード一覧</div>
                      {!selectedPlayer && (
                        <div style={{ color: "#888", marginBottom: 12 }}>
                          まずプレイヤーを選択してください。
                        </div>
                      )}

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 10,
                        }}
                      >
                        {selectedPlayerVisibleCards.map((card) => (
                          <SelectCard
                            key={card.id}
                            active={selectedCardId === card.id}
                            onClick={() => setSelectedCardId(card.id)}
                            disabled={card.usedByMe}
                          >
                            <div style={{ fontWeight: 700 }}>{card.cardName}</div>
                            <div
                              style={{
                                fontSize: 12,
                                color: card.usedByMe ? "#999" : selectedCardId === card.id ? "#ddd" : "#666",
                                marginTop: 4,
                              }}
                            >
                              {card.isTrait
                                ? "Trait"
                                : `${card.statKind} ${card.statValue > 0 ? "+" : ""}${card.statValue}`}
                            </div>
                            {card.usedByMe && (
                              <div style={{ fontSize: 11, marginTop: 6 }}>
                                USED → Horse {card.myAttachment?.horse_id}
                              </div>
                            )}
                          </SelectCard>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div style={{ marginBottom: 10, color: "#666" }}>付与先の馬</div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                          gap: 10,
                        }}
                      >
                        {horses.map((horse) => (
                          <SelectCard
                            key={horse.horse_id}
                            active={selectedAttachHorse === horse.horse_id}
                            onClick={() => setSelectedAttachHorse(horse.horse_id)}
                          >
                            <div style={{ fontWeight: 700 }}>{horse.display_name}</div>
                            <div style={{ fontSize: 12, color: selectedAttachHorse === horse.horse_id ? "#ddd" : "#666", marginTop: 4 }}>
                              枚数 {horse.attached_count} / x{horse.win_odds}
                            </div>
                          </SelectCard>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={confirmAttach}
                      disabled={!selectedPlayer || !selectedCard || !selectedAttachHorse || busy}
                      style={{
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: "1px solid #111",
                        background:
                          !selectedPlayer || !selectedCard || !selectedAttachHorse || busy ? "#eee" : "#111",
                        color:
                          !selectedPlayer || !selectedCard || !selectedAttachHorse || busy ? "#999" : "#fff",
                        cursor:
                          !selectedPlayer || !selectedCard || !selectedAttachHorse || busy ? "not-allowed" : "pointer",
                      }}
                    >
                      付与を確定
                    </button>
                  </div>
                )}

                {betEnabled && (
                  <div style={{ display: "grid", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <SelectCard active={betType === "win"} onClick={() => setBetType("win")}>
                        <div style={{ fontWeight: 700 }}>単勝</div>
                      </SelectCard>
                      <SelectCard active={betType === "trifecta"} onClick={() => setBetType("trifecta")}>
                        <div style={{ fontWeight: 700 }}>3連単</div>
                      </SelectCard>
                    </div>

                    {betType === "win" && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                          gap: 10,
                        }}
                      >
                        {horses.map((horse) => (
                          <SelectCard
                            key={horse.horse_id}
                            active={winHorse === horse.horse_id}
                            onClick={() => setWinHorse(horse.horse_id)}
                          >
                            <div style={{ fontWeight: 700 }}>{horse.display_name}</div>
                            <div style={{ fontSize: 12, color: winHorse === horse.horse_id ? "#ddd" : "#666", marginTop: 4 }}>
                              単勝 x{horse.win_odds}
                            </div>
                          </SelectCard>
                        ))}
                      </div>
                    )}

                    {betType === "trifecta" && (
                      <div style={{ display: "grid", gap: 12 }}>
                        <div>
                          <div style={{ marginBottom: 8, color: "#666" }}>1着</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                            {horses.map((horse) => (
                              <button
                                key={`f-${horse.horse_id}`}
                                onClick={() => {
                                  setTriFirst(horse.horse_id);
                                  if (triSecond === horse.horse_id) setTriSecond(null);
                                  if (triThird === horse.horse_id) setTriThird(null);
                                }}
                                style={{
                                  padding: 10,
                                  borderRadius: 12,
                                  border: "1px solid #ddd",
                                  background: triFirst === horse.horse_id ? "#111" : "#fff",
                                  color: triFirst === horse.horse_id ? "#fff" : "#111",
                                  cursor: "pointer",
                                }}
                              >
                                {horse.horse_id}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div style={{ marginBottom: 8, color: "#666" }}>2着</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                            {horses
                              .filter((horse) => horse.horse_id !== triFirst)
                              .map((horse) => (
                                <button
                                  key={`s-${horse.horse_id}`}
                                  onClick={() => {
                                    setTriSecond(horse.horse_id);
                                    if (triThird === horse.horse_id) setTriThird(null);
                                  }}
                                  style={{
                                    padding: 10,
                                    borderRadius: 12,
                                    border: "1px solid #ddd",
                                    background: triSecond === horse.horse_id ? "#111" : "#fff",
                                    color: triSecond === horse.horse_id ? "#fff" : "#111",
                                    cursor: "pointer",
                                  }}
                                >
                                  {horse.horse_id}
                                </button>
                              ))}
                          </div>
                        </div>

                        <div>
                          <div style={{ marginBottom: 8, color: "#666" }}>3着</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                            {horses
                              .filter(
                                (horse) =>
                                  horse.horse_id !== triFirst && horse.horse_id !== triSecond
                              )
                              .map((horse) => (
                                <button
                                  key={`t-${horse.horse_id}`}
                                  onClick={() => setTriThird(horse.horse_id)}
                                  style={{
                                    padding: 10,
                                    borderRadius: 12,
                                    border: "1px solid #ddd",
                                    background: triThird === horse.horse_id ? "#111" : "#fff",
                                    color: triThird === horse.horse_id ? "#fff" : "#111",
                                    cursor: "pointer",
                                  }}
                                >
                                  {horse.horse_id}
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={{ marginBottom: 8, color: "#666" }}>賭けるチップ数</div>
                      <input
                        type="number"
                        min="1"
                        value={stake}
                        onChange={(e) => setStake(e.target.value)}
                        style={{
                          width: 180,
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: "1px solid #ddd",
                          fontSize: 16,
                          background: "#fff",
                          color: "#111",
                        }}
                      />
                    </div>

                    <button
                      onClick={confirmBet}
                      disabled={!selectedPlayer || !betType || !currentOdds || !stakeValue || busy}
                      style={{
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: "1px solid #111",
                        background:
                          !selectedPlayer || !betType || !currentOdds || !stakeValue || busy ? "#eee" : "#111",
                        color:
                          !selectedPlayer || !betType || !currentOdds || !stakeValue || busy ? "#999" : "#fff",
                        cursor:
                          !selectedPlayer || !betType || !currentOdds || !stakeValue || busy
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      買い目を確定
                    </button>
                  </div>
                )}

                {raceEnabled && (
                  <div
                    style={{
                      display: "grid",
                      gap: 14,
                      border: "1px solid #ecece6",
                      borderRadius: 16,
                      padding: 16,
                      background: "#fafaf7",
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      レース終了
                    </div>
                    <div style={{ color: "#666", lineHeight: 1.6 }}>
                      共有画面で順位を確認してください。
                      <br />
                      確認後に精算へ進みます。
                    </div>

                    <button
                      onClick={openSettlement}
                      disabled={busy}
                      style={{
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: "1px solid #111",
                        background: busy ? "#eee" : "#111",
                        color: busy ? "#999" : "#fff",
                        cursor: busy ? "not-allowed" : "pointer",
                      }}
                    >
                      精算へ進む
                    </button>
                  </div>
                )}

                {settlementEnabled && (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>精算</div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {settlementRows.map((row) => (
                        <div
                          key={row.player}
                          style={{
                            border: "1px solid #ecece6",
                            borderRadius: 14,
                            padding: 12,
                            background: row.hit ? "#f7fbf7" : "#fafaf7",
                            display: "grid",
                            gap: 6,
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>{row.player}</div>
                          <div style={{ fontSize: 13, color: "#666" }}>
                            {row.bet
                              ? row.bet.bet_type === "win"
                                ? `単勝 / Horse ${row.bet.horse_1}`
                                : `3連単 / ${row.bet.horse_1} → ${row.bet.horse_2} → ${row.bet.horse_3}`
                              : "未購入"}
                          </div>
                          <div style={{ fontSize: 13 }}>
                            {row.hit ? "的中" : "不的中"} / 受け取り {row.payout}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <aside
            style={{
              border: "1px solid #ddd",
              borderRadius: 20,
              background: "#fff",
              padding: 16,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 18 }}>現在の内容</div>

            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
              <div>プレイヤー: {selectedPlayer || "-"}</div>
              <div>フェーズ: {room?.phase || "-"}</div>
              <div>賭け種: {betType === "win" ? "単勝" : betType === "trifecta" ? "3連単" : "-"}</div>
              <div>
                買い目:{" "}
                {betType === "win"
                  ? winHorse || "-"
                  : betType === "trifecta"
                  ? `${triFirst || "-"} → ${triSecond || "-"} → ${triThird || "-"}`
                  : "-"}
              </div>
              <div>チップ数: {stakeValue || "-"}</div>
              <div>オッズ: {currentOdds ? `x${currentOdds}` : "-"}</div>
              <div>バック: {currentBack ?? "-"}</div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {players.map((player) => {
                const bet = bets.find((b) => b.player_id === player);
                return (
                  <div key={player} style={{ border: "1px solid #f0f0f0", borderRadius: 14, padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>{player}</div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                      {bet ? `${bet.bet_type === "win" ? "単勝" : "3連単"} / ${bet.cost}枚 / 確定済み` : "未確定"}
                    </div>
                  </div>
                );
              })}
            </div>

            {betEnabled && (
              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: 14,
                  padding: 12,
                  background: "#fafafa",
                  lineHeight: 1.5,
                  fontSize: 13,
                }}
              >
                買い目確定後、入力したチップ数を支払ってください。
              </div>
            )}

            {betEnabled && (
              <button
                onClick={runRace}
                disabled={!allBetsConfirmed || busy}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid #111",
                  background: !allBetsConfirmed || busy ? "#eee" : "#111",
                  color: !allBetsConfirmed || busy ? "#999" : "#fff",
                  cursor: !allBetsConfirmed || busy ? "not-allowed" : "pointer",
                }}
              >
                レース開始
              </button>
            )}

            {message && (
              <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 12, background: "#fafafa" }}>
                {message}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}