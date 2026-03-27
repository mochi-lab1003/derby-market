import { HORSE_DEFS } from "@/lib/derbyConfig";

function clampStat(n) {
  return Math.max(0, n);
}

export function simulateDerbyRace(attachments) {
  const horses = HORSE_DEFS.map((def) => {
    const attached = attachments.filter((a) => a.horse_id === def.id);

    let speed = 3 + def.speedBias;
    let accel = 3 + def.accelBias;
    let stamina = 3 + def.staminaBias;

    const traits = [];

    attached.forEach((card) => {
      if (card.is_trait) {
        traits.push(card.card_name);
      } else if (card.stat_kind === "speed") {
        speed += card.stat_value;
      } else if (card.stat_kind === "accel") {
        accel += card.stat_value;
      } else if (card.stat_kind === "stamina") {
        stamina += card.stat_value;
      }
    });

    speed = clampStat(speed);
    accel = clampStat(accel);
    stamina = clampStat(stamina);

    let moody = 0;
    let moodyLabel = null;
    if (traits.includes("気分屋")) {
      moody = Math.random() < 0.5 ? 1 : -1;
      moodyLabel = moody > 0 ? "好調" : "不調";
    }

    const lazySegment = traits.includes("怠け者")
      ? ["START", "EARLY", "MID", "LATE"][Math.floor(Math.random() * 4)]
      : null;

    return {
      horse_id: def.id,
      display_name: def.defaultName,
      flavor_label: def.flavor,
      speed,
      accel,
      stamina,
      traits,
      moody,
      moodyLabel,
      lazySegment,
      total: 0,
      segments: [],
      logs: [],
    };
  });

  const segmentOrder = ["START", "EARLY", "MID", "LATE", "FINAL"];

  segmentOrder.forEach((segment) => {
    horses.forEach((horse) => {
      let move = 0;

      if (segment === "START") move = 3 + horse.speed;
      if (segment === "EARLY") move = 2 + horse.speed;
      if (segment === "MID") move = 2 + horse.accel;
      if (segment === "LATE") move = 1 + horse.accel + Math.floor(horse.stamina / 2);
      if (segment === "FINAL") move = 1 + horse.stamina + Math.floor(horse.accel / 2);

      if (horse.traits.includes("気分屋")) {
        move += horse.moody;
        if (segment === "START" && horse.moodyLabel) {
          horse.logs.push(`${horse.display_name} / 気分屋: ${horse.moodyLabel}`);
        }
      }

      if (horse.traits.includes("スタートダッシュ") && segment === "START") {
        move += 4;
        horse.logs.push(`${horse.display_name} / スタートダッシュ`);
      }

      if (horse.traits.includes("根性") && segment === "FINAL") {
        move += 5;
        horse.logs.push(`${horse.display_name} / 根性`);
      }

      if (horse.traits.includes("怠け者") && horse.lazySegment === segment) {
        move = 0;
        horse.logs.push(`${horse.display_name} / 怠け者`);
      }

      move = Math.max(0, move);
      horse.total += move;
      horse.segments.push({
        segment,
        move,
        total: horse.total,
      });
    });
  });

  const ranked = [...horses].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.horse_id.localeCompare(b.horse_id);
  });

  ranked.forEach((horse, index) => {
    horse.rank = index + 1;
  });

  const logs = [];
  ranked.forEach((horse) => {
    horse.logs.forEach((l) => logs.push(l));
  });
  ranked.forEach((horse) => {
    logs.push(`${horse.rank}位: ${horse.display_name} (${horse.total.toFixed(2)})`);
  });

  const segmentSnapshots = segmentOrder.map((segment, idx) => ({
    segment,
    positions: ranked.map((horse) => ({
      horse_id: horse.horse_id,
      total: horse.segments[idx].total,
      move: horse.segments[idx].move,
      rankPreview: null,
    })),
  }));

  return {
    segmentOrder,
    segmentSnapshots,
    ranking: ranked.map((horse) => ({
      horse_id: horse.horse_id,
      display_name: horse.display_name,
      flavor_label: horse.flavor_label,
      final_distance: horse.total,
      final_rank: horse.rank,
    })),
    logs,
  }; 
}