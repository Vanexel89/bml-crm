import { calcChain } from './calcChain.js';

/**
 * Compare proposal rateSnapshot with current best rates.
 * Returns per-variant status: "ok" | "cheaper" | "dearer" | "gone"
 * and aggregated proposal-level status.
 */
export function compareProposalRates(proposal, rateData) {
  if (!proposal.rateSnapshot || proposal.rateSnapshot.length === 0) return null;
  const { freight, boxes, drops, railway, autoMsk, customAuto, settings } = rateData;
  if (!freight || freight.length === 0) return null;

  const variants = [];
  let hasGone = false, hasCheaper = false, hasDearer = false;

  proposal.rateSnapshot.forEach(snap => {
    if (!snap.port || !snap.city) { variants.push({ snap, status: "ok" }); return; }
    const ctype = (snap.ctype || "40HC").includes("20") ? "20" : "40";
    const results = calcChain(
      { freight, boxes, drops, railway, autoMsk, customAuto, settings: settings || {} },
      { pol: snap.port, city: snap.city, ctype, weight: 22 }
    );

    if (results.length === 0) {
      hasGone = true;
      variants.push({ snap, status: "gone", detail: `${snap.port}→${snap.city} ${snap.ctype || ""}` });
      return;
    }

    const best = results[0];
    const oldFreight = snap.freightBase || 0;
    const oldRailway = snap.railwayBase || 0;
    const newFreight = best.isRubFreight ? 0 : (best.totalFreightUsd || 0);
    const newRailway = best.rwBase || 0;

    const changes = [];
    if (newFreight < oldFreight) changes.push(`фрахт $${oldFreight}→$${newFreight}`);
    if (newRailway < oldRailway) changes.push(`ЖД ${oldRailway.toLocaleString("ru")}→${newRailway.toLocaleString("ru")}₽`);
    const isCheaper = newFreight < oldFreight || newRailway < oldRailway;

    const dearer = [];
    if (newFreight > oldFreight && oldFreight > 0) dearer.push(`фрахт $${oldFreight}→$${newFreight}`);
    if (newRailway > oldRailway && oldRailway > 0) dearer.push(`ЖД ${oldRailway.toLocaleString("ru")}→${newRailway.toLocaleString("ru")}₽`);
    const isDearer = !isCheaper && (newFreight > oldFreight || newRailway > oldRailway);

    if (isCheaper) {
      hasCheaper = true;
      variants.push({ snap, status: "cheaper", detail: changes.join(", ") });
    } else if (isDearer) {
      hasDearer = true;
      variants.push({ snap, status: "dearer", detail: dearer.join(", ") });
    } else {
      variants.push({ snap, status: "ok" });
    }
  });

  // Priority: gone > cheaper > dearer > ok
  const overall = hasGone ? "gone" : hasCheaper ? "cheaper" : hasDearer ? "dearer" : "ok";
  return { overall, variants };
}
