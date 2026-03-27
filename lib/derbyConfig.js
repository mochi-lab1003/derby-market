export const ROOM_ID = "room-alpha";

export const HAND_SIZE_BY_COUNT = {
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 2,
};

export const HORSE_DEFS = [
  {
    id: "01",
    defaultName: "Horse 01",
    flavor: "スタートが速いかも",
    speedBias: 0.18,
    accelBias: 0.02,
    staminaBias: 0.0,
  },
  {
    id: "02",
    defaultName: "Horse 02",
    flavor: "スピードがあるかも",
    speedBias: 0.12,
    accelBias: 0.06,
    staminaBias: 0.0,
  },
  {
    id: "03",
    defaultName: "Horse 03",
    flavor: "加速しやすいかも",
    speedBias: 0.0,
    accelBias: 0.18,
    staminaBias: 0.02,
  },
  {
    id: "04",
    defaultName: "Horse 04",
    flavor: "スタミナがあるかも",
    speedBias: 0.0,
    accelBias: 0.03,
    staminaBias: 0.18,
  },
  {
    id: "05",
    defaultName: "Horse 05",
    flavor: "体が大きいかも",
    speedBias: -0.03,
    accelBias: 0.0,
    staminaBias: 0.14,
  },
];

export const DECK = [
  { id: "speed_p1", cardName: "スピード +1", statKind: "speed", statValue: 1, isTrait: false },
  { id: "speed_p2", cardName: "スピード +2", statKind: "speed", statValue: 2, isTrait: false },
  { id: "speed_p3", cardName: "スピード +3", statKind: "speed", statValue: 3, isTrait: false },
  { id: "speed_m3", cardName: "スピード -3", statKind: "speed", statValue: -3, isTrait: false },

  { id: "accel_p1", cardName: "加速 +1", statKind: "accel", statValue: 1, isTrait: false },
  { id: "accel_p2", cardName: "加速 +2", statKind: "accel", statValue: 2, isTrait: false },
  { id: "accel_p3", cardName: "加速 +3", statKind: "accel", statValue: 3, isTrait: false },
  { id: "accel_m3", cardName: "加速 -3", statKind: "accel", statValue: -3, isTrait: false },

  { id: "stamina_p1", cardName: "スタミナ +1", statKind: "stamina", statValue: 1, isTrait: false },
  { id: "stamina_p2", cardName: "スタミナ +2", statKind: "stamina", statValue: 2, isTrait: false },
  { id: "stamina_p3", cardName: "スタミナ +3", statKind: "stamina", statValue: 3, isTrait: false },
  { id: "stamina_m3", cardName: "スタミナ -3", statKind: "stamina", statValue: -3, isTrait: false },

  { id: "trait_dash", cardName: "スタートダッシュ", statKind: null, statValue: null, isTrait: true },
  { id: "trait_lazy", cardName: "怠け者", statKind: null, statValue: null, isTrait: true },
  { id: "trait_guts", cardName: "根性", statKind: null, statValue: null, isTrait: true },
  { id: "trait_moody", cardName: "気分屋", statKind: null, statValue: null, isTrait: true },
];

export function getPlayers(playerCount) {
  return Array.from({ length: playerCount }, (_, i) => `P${i + 1}`);
}

export function getHandSize(playerCount) {
  return HAND_SIZE_BY_COUNT[playerCount] ?? 5;
}

export function getWinOdds(attachedCount) {
  const count = Math.max(0, Math.min(6, attachedCount));
  return 7 - count;
}

export function getTrifectaOdds(sumOfWinOdds) {
  if (sumOfWinOdds <= 5) return 3;
  if (sumOfWinOdds <= 8) return 4;
  if (sumOfWinOdds <= 11) return 5;
  if (sumOfWinOdds <= 14) return 7;
  return 10;
}

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}