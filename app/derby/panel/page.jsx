"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ROOM_ID,
  DECK,
  HORSE_DEFS,
  getHandSize,
  getPlayers,
  getTrifectaOdds,
  getWinOdds,
  shuffle,
} from "@/lib/derbyConfig";
import { simulateDerbyRace } from "@/lib/derbyRace";

function ButtonCard({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid #ddd",
        background: active ? "#111" : "#fff",
        color: active ? "#fff" : "#111",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {children}
    </button>
  );
}

export default function DerbyPanelPage() {
  const [room, setRoom] = useState(null);
  const [horses, setHorses] = useState([]);
  const [hands, setHands] = useState([]);
  const [bets, setBets] = useState([]);
  const [attachments, setAttachments] = useState([]);

  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [selectedAttachHorse, setSelectedAttachHorse] = useState(null);

  const [betType, setBetType] = useState(null);
  const [winHorse, setWinHorse] = useState(null);
  const [triFirst, setTriFirst] = useState(null);
  const [triSecond, setTriSecond] = useState(null);
  const [triThird, setTriThird] = useState(null);

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
      { data: handData, error: handError },
      { data: betData, error: betError },
      { data: attachmentData, error: attachmentError },
    ] = await Promise.all([
      supabase
        .from("derby_horses")
        .select("*")
        .eq("room_id", ROOM_ID)
        .order("horse_id", { ascending: true }),
      supabase
        .from("derby_hands")
        .select("*")
        .eq("room_id", ROOM_ID)
        .eq("race_number", raceNumber)
        .order("sort_order", { ascending: true }),
      supabase
        .from("derby_bets")
        .select("*")
        .eq("room_id", ROOM_ID)
        .eq("race_number", raceNumber),
      supabase
        .from("derby_attachments")
        .select("*")
        .eq("room_id", ROOM_ID)
        .eq("race_number", raceNumber),
    ]);

    if (horseError) console.error("load horses error", horseError);
    if (handError) console.error("load hands error", handError);
    if (betError) console.error("load bets error", betError);
    if (attachmentError) console.error("load attachments error", attachmentError);

    setRoom(roomData || null);
    setHorses(horseData || []);
    setHands(handData || []);
    setBets(betData || []);
    setAttachments(attachmentData || []);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 1200);
    return () => clearInterval(id);
  }, []);

  const playerCount = room?.player_count ?? 3;
  const raceNumber = room?.race_number ?? 1;
  const players = getPlayers(playerCount);

  const selectedHand = useMemo(() => {
    if (!selectedPlayer) return [];
    return hands.filter((h) => h.player_id === selectedPlayer && !h.used);
  }, [hands, selectedPlayer]);

  const selectedCard = selectedHand.find((c) => c.card_id === selectedCardId) || null;

  const remainingAttachCount = hands.filter((h) => !h.used).length;
  const confirmedBetPlayers = bets.map((b) => b.player_id);
  const allBetsConfirmed = players.every((p) => confirmedBetPlayers.includes(p));

  const currentSummary = useMemo(() => {
    if (betType === "win" && winHorse) {
      const horse = horses.find((h) => h.horse_id === winHorse);
      if (!horse) return null;
      return {
        cost: 1,
        odds: horse.win_odds,
        back: horse.win_odds,
      };
    }

    if (betType === "trifecta" && triFirst && triSecond && triThird) {
      const h1 = horses.find((h) => h.horse_id === triFirst);
      const h2 = horses.find((h) => h.horse_id === triSecond);
      const h3 = horses.find((h) => h.horse_id === triThird);
      if (!h1 || !h2 || !h3) return null;

      const sum = h1.win_odds + h2.win_odds + h3.win_odds;
      const odds = getTrifectaOdds(sum);

      return {
        cost: 2,
        odds,
        back: odds * 2,
      };
    }

    return null;
  }, [betType, winHorse, triFirst, triSecond, triThird, horses]);

  async function dealHands(roomId, raceNo, count) {
    const handSize = getHandSize(count);
    const playersForDeal = getPlayers(count);
    const deck = shuffle(DECK);
    const usedCount = handSize * playersForDeal.length;
    const picked = deck.slice(0, usedCount);

    const rows = [];
    playersForDeal.forEach((playerId, playerIndex) => {
      for (let i = 0; i < handSize; i += 1) {
        const card = picked[playerIndex * handSize + i];
        rows.push({
          room_id: roomId,
          race_number: raceNo,
          player_id: playerId,
          card_id: card.id,
          card_name: card.cardName,
          stat_kind: card.statKind,
          stat_value: card.statValue,
          is_trait: card.isTrait,
          used: false,
          sort_order: i,
        });
      }
    });

    console.log("dealHands rows", rows);

    if (rows.length) {
      const { error } = await supabase.from("derby_hands").insert(rows);
      if (error) {
        console.error("dealHands insert error", error);
        throw error;
      }
    }
  }

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

      if (roomRes.error) {
        console.error("derby_rooms upsert error", roomRes.error);
        throw roomRes.error;
      }

      const deleteHorsesRes = await supabase
        .from("derby_horses")
        .delete()
        .eq("room_id", ROOM_ID);

      if (deleteHorsesRes.error) {
        console.error("derby_horses delete error", deleteHorsesRes.error);
        throw deleteHorsesRes.error;
      }

      const horseInsertRes = await supabase.from("derby_horses").insert(
        HORSE_DEFS.map((horse) => ({
          room_id: ROOM_ID,
          horse_id: horse.id,
          display_name: horse.defaultName,
          flavor_label: horse.flavor,
          attached_count: 0,
          has_trait: false,
          win_odds: getWinOdds(0),
        }))
      );

      if (horseInsertRes.error) {
        console.error("derby_horses insert error", horseInsertRes.error);
        throw horseInsertRes.error;
      }

      const deleteHandsRes = await supabase
        .from("derby_hands")
        .delete()
        .eq("room_id", ROOM_ID);

      if (deleteHandsRes.error) {
        console.error("derby_hands delete error", deleteHandsRes.error);
        throw deleteHandsRes.error;
      }

      const deleteAttachmentsRes = await supabase
        .from("derby_attachments")
        .delete()
        .eq("room_id", ROOM_ID);

      if (deleteAttachmentsRes.error) {
        console.error("derby_attachments delete error", deleteAttachmentsRes.error);
        throw deleteAttachmentsRes.error;
      }

      const deleteBetsRes = await supabase
        .from("derby_bets")
        .delete()
        .eq("room_id", ROOM_ID);

      if (deleteBetsRes.error) {
        console.error("derby_bets delete error", deleteBetsRes.error);
        throw deleteBetsRes.error;
      }

      await dealHands(ROOM_ID, 1, playerCountValue);
      await load();

      setSelectedPlayer(null);
      setSelectedCardId(null);
      setSelectedAttachHorse(null);
      setBetType(null);
      setWinHorse(null);
      setTriFirst(null);
      setTriSecond(null);
      setTriThird(null);

      setMessage("部屋を初期化した。");
    } catch (error) {
      console.error("initializeRoom error", error);
      setMessage(`初期化失敗: ${error.message || JSON.stringify(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function confirmAttach() {
    if (!selectedPlayer || !selectedCard || !selectedAttachHorse || busy) return;
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
        card_id: selectedCard.card_id,
        card_name: selectedCard.card_name,
        stat_kind: selectedCard.stat_kind,
        stat_value: selectedCard.stat_value,
        is_trait: selectedCard.is_trait,
        revealed: false,
      });

      if (insertAttachmentRes.error) {
        console.error("insert attachment error", insertAttachmentRes.error);
        throw insertAttachmentRes.error;
      }

      const updateHandRes = await supabase
        .from("derby_hands")
        .update({ used: true })
        .eq("room_id", ROOM_ID)
        .eq("race_number", raceNumber)
        .eq("player_id", selectedPlayer)
        .eq("card_id", selectedCard.card_id);

      if (updateHandRes.error) {
        console.error("update hand error", updateHandRes.error);
        throw updateHandRes.error;
      }

      const updateHorseRes = await supabase
        .from("derby_horses")
        .update({
          attached_count: nextCount,
          has_trait: (horse?.has_trait || false) || selectedCard.is_trait,
          win_odds: getWinOdds(nextCount),
        })
        .eq("room_id", ROOM_ID)
        .eq("horse_id", selectedAttachHorse);

      if (updateHorseRes.error) {
        console.error("update horse error", updateHorseRes.error);
        throw updateHorseRes.error;
      }

      const unusedCountAfter = hands.filter((h) => !h.used).length - 1;
      if (unusedCountAfter <= 0) {
        const roomUpdateRes = await supabase
          .from("derby_rooms")
          .update({
            phase: "bet",
            updated_at: new Date().toISOString(),
          })
          .eq("room_id", ROOM_ID);

        if (roomUpdateRes.error) {
          console.error("room phase update error", roomUpdateRes.error);
          throw roomUpdateRes.error;
        }
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
    if (!selectedPlayer || !betType || !currentSummary || busy) return;
    setBusy(true);
    setMessage("");

    try {
      const { error } = await supabase.from("derby_bets").upsert(
        {
          room_id: ROOM_ID,
          race_number: raceNumber,
          player_id: selectedPlayer,
          bet_type: betType,
          horse_1: betType === "win" ? winHorse : triFirst,
          horse_2: betType === "trifecta" ? triSecond : null,
          horse_3: betType === "trifecta" ? triThird : null,
          cost: currentSummary.cost,
          odds: currentSummary.odds,
          back: currentSummary.back,
          is_confirmed: true,
        },
        { onConflict: "room_id,race_number,player_id" }
      );

      if (error) {
        console.error("confirmBet error", error);
        throw error;
      }

      setBetType(null);
      setWinHorse(null);
      setTriFirst(null);
      setTriSecond(null);
      setTriThird(null);
      setSelectedPlayer(null);

      await load();
      setMessage("買い目を確定した。チップを支払ってください。");
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

        if (error) {
          console.error("runRace horse update error", error);
          throw error;
        }
      }

      const roomUpdateRes = await supabase
        .from("derby_rooms")
        .update({
          phase: "race",
          result_payload: result,
          updated_at: new Date().toISOString(),
        })
        .eq("room_id", ROOM_ID);

      if (roomUpdateRes.error) {
        console.error("runRace room update error", roomUpdateRes.error);
        throw roomUpdateRes.error;
      }

      await load();
      setMessage("レースを開始した。");
    } catch (error) {
      console.error("runRace error", error);
      setMessage(`レース失敗: ${error.message || JSON.stringify(error)}`);
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

      const delHands = await supabase
        .from("derby_hands")
        .delete()
        .eq("room_id", ROOM_ID)
        .eq("race_number", room.race_number);
      if (delHands.error) throw delHands.error;

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

      await dealHands(ROOM_ID, nextRaceNumber, room.player_count);

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

  return (
    <main style={{ minHeight: "100vh", background: "#fafafa", color: "#111", padding: 24 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 34, marginBottom: 8 }}>DERBY MARKET / PANEL</h1>
          <div style={{ color: "#666" }}>共用操作端末 / ボタン式のみ</div>
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

        <section style={{ border: "1px solid #ddd", borderRadius: 24, background: "#fff", padding: 20 }}>
          <div style={{ fontSize: 20, marginBottom: 16 }}>セットアップ</div>
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
                {count}人
              </button>
            ))}
            {room?.phase === "race" && (
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
          <section style={{ border: "1px solid #ddd", borderRadius: 24, background: "#fff", padding: 20 }}>
            <div style={{ fontSize: 20, marginBottom: 16 }}>
              {attachEnabled ? "付与フェーズ" : betEnabled ? "賭けフェーズ" : "レース中"}
            </div>

            {!room && <div style={{ color: "#888" }}>まず部屋を初期化してください。</div>}

            {room && (
              <>
                <div
                  style={{
                    marginBottom: 16,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: 10,
                  }}
                >
                  {players.map((player) => (
                    <ButtonCard
                      key={player}
                      active={selectedPlayer === player}
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <div style={{ fontWeight: 700 }}>{player}</div>
                      <div
                        style={{
                          fontSize: 13,
                          color: selectedPlayer === player ? "#ddd" : "#666",
                          marginTop: 4,
                        }}
                      >
                        {bets.some((b) => b.player_id === player) ? "賭け済み" : "未入力"}
                      </div>
                    </ButtonCard>
                  ))}
                </div>

                {attachEnabled && (
                  <div style={{ display: "grid", gap: 18 }}>
                    <div>
                      <div style={{ marginBottom: 10, color: "#666" }}>手札</div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 12,
                        }}
                      >
                        {selectedHand.map((card) => (
                          <ButtonCard
                            key={card.card_id}
                            active={selectedCardId === card.card_id}
                            onClick={() => setSelectedCardId(card.card_id)}
                          >
                            <div style={{ fontWeight: 700 }}>{card.card_name}</div>
                            <div
                              style={{
                                fontSize: 13,
                                color: selectedCardId === card.card_id ? "#ddd" : "#666",
                                marginTop: 4,
                              }}
                            >
                              {card.is_trait
                                ? "Trait"
                                : `${card.stat_kind} ${card.stat_value > 0 ? "+" : ""}${card.stat_value}`}
                            </div>
                          </ButtonCard>
                        ))}
                        {!selectedPlayer && <div style={{ color: "#888" }}>プレイヤーを選択してください。</div>}
                      </div>
                    </div>

                    <div>
                      <div style={{ marginBottom: 10, color: "#666" }}>付与先の馬</div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 12,
                        }}
                      >
                        {horses.map((horse) => (
                          <ButtonCard
                            key={horse.horse_id}
                            active={selectedAttachHorse === horse.horse_id}
                            onClick={() => setSelectedAttachHorse(horse.horse_id)}
                          >
                            <div style={{ fontWeight: 700 }}>{horse.display_name}</div>
                            <div
                              style={{
                                fontSize: 13,
                                color: selectedAttachHorse === horse.horse_id ? "#ddd" : "#666",
                                marginTop: 4,
                              }}
                            >
                              枚数 {horse.attached_count} / x{horse.win_odds}
                            </div>
                          </ButtonCard>
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
                          !selectedPlayer || !selectedCard || !selectedAttachHorse || busy
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      付与を確定
                    </button>
                  </div>
                )}

                {betEnabled && (
                  <div style={{ display: "grid", gap: 18 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <ButtonCard active={betType === "win"} onClick={() => setBetType("win")}>
                        <div style={{ fontWeight: 700 }}>単勝</div>
                        <div style={{ fontSize: 13, color: betType === "win" ? "#ddd" : "#666", marginTop: 4 }}>
                          コスト 1
                        </div>
                      </ButtonCard>

                      <ButtonCard active={betType === "trifecta"} onClick={() => setBetType("trifecta")}>
                        <div style={{ fontWeight: 700 }}>3連単</div>
                        <div
                          style={{
                            fontSize: 13,
                            color: betType === "trifecta" ? "#ddd" : "#666",
                            marginTop: 4,
                          }}
                        >
                          コスト 2
                        </div>
                      </ButtonCard>
                    </div>

                    {betType === "win" && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 12,
                        }}
                      >
                        {horses.map((horse) => (
                          <ButtonCard
                            key={horse.horse_id}
                            active={winHorse === horse.horse_id}
                            onClick={() => setWinHorse(horse.horse_id)}
                          >
                            <div style={{ fontWeight: 700 }}>{horse.display_name}</div>
                            <div style={{ fontSize: 13, color: winHorse === horse.horse_id ? "#ddd" : "#666", marginTop: 4 }}>
                              単勝 x{horse.win_odds}
                            </div>
                          </ButtonCard>
                        ))}
                      </div>
                    )}

                    {betType === "trifecta" && (
                      <div style={{ display: "grid", gap: 14 }}>
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

                    <button
                      onClick={confirmBet}
                      disabled={!selectedPlayer || !betType || !currentSummary || busy}
                      style={{
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: "1px solid #111",
                        background: !selectedPlayer || !betType || !currentSummary || busy ? "#eee" : "#111",
                        color: !selectedPlayer || !betType || !currentSummary || busy ? "#999" : "#fff",
                        cursor: !selectedPlayer || !betType || !currentSummary || busy ? "not-allowed" : "pointer",
                      }}
                    >
                      買い目を確定
                    </button>
                  </div>
                )}

                {raceEnabled && <div style={{ color: "#666" }}>中央画面でレースを確認してください。</div>}
              </>
            )}
          </section>

          <aside
            style={{
              border: "1px solid #ddd",
              borderRadius: 24,
              background: "#fff",
              padding: 20,
              display: "grid",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 20 }}>現在の内容</div>

            <div style={{ display: "grid", gap: 8, fontSize: 15 }}>
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
              <div>コスト: {currentSummary?.cost ?? "-"}</div>
              <div>オッズ: {currentSummary ? `x${currentSummary.odds}` : "-"}</div>
              <div>バック: {currentSummary?.back ?? "-"}</div>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
              <div>phase: {String(room?.phase)}</div>
              <div>selectedPlayer: {String(selectedPlayer)}</div>
              <div>selectedCardId: {String(selectedCardId)}</div>
              <div>selectedAttachHorse: {String(selectedAttachHorse)}</div>
              <div>selectedHandCount: {selectedHand.length}</div>
              <div>handsCount: {hands.length}</div>
              <div>horsesCount: {horses.length}</div>
              <div>betsCount: {bets.length}</div>
              <div>attachmentsCount: {attachments.length}</div>
            </div>

            {betEnabled && (
              <div
                style={{
                  border: "1px solid #eee",
                  borderRadius: 16,
                  padding: 14,
                  background: "#fafafa",
                  lineHeight: 1.6,
                }}
              >
                買い目確定後、表示されたコスト分のチップを支払ってください。
              </div>
            )}

            <div style={{ display: "grid", gap: 8 }}>
              {players.map((player) => {
                const bet = bets.find((b) => b.player_id === player);
                return (
                  <div key={player} style={{ border: "1px solid #f0f0f0", borderRadius: 14, padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>{player}</div>
                    <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                      {bet ? `${bet.bet_type === "win" ? "単勝" : "3連単"} / 確定済み` : "未確定"}
                    </div>
                  </div>
                );
              })}
            </div>

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
              <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 14, background: "#fafafa" }}>
                {message}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}