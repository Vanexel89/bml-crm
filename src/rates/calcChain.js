import { uid } from '../utils.js';
import { parseValidity, dateInRange } from './parseRateExcel.js';
import { calcWeightSurcharge } from './weightSurcharge.js';

const DROP_LINE_ALIASES = { "new new shipping": "new new / torgmoll", "new new": "new new / torgmoll" };

export function calcChain({ freight, boxes, drops, railway, autoMsk, customAuto, settings }, params) {
  const { pol, city, ctype, weight } = params;
  const is20 = ctype === "20";
  const usdRate = settings?.usdRate || 90;
  const marginUsd = settings?.marginUsd || 0;
  const marginRub = settings?.marginRub || 0;

  const polNorm = (pol || "").trim().toUpperCase();
  const cityNorm = (city || "").trim();

  const matchFreight = freight.filter(f => {
    const fp = (f.pol || "").trim().toUpperCase();
    return fp === polNorm || fp.includes(polNorm) || polNorm.includes(fp);
  });

  const results = [];
  matchFreight.forEach(fr => {
    const isTranscontainer = fr.service.toLowerCase().includes("трансконтейнер");

    // === ТРАНСКОНТЕЙНЕР special case ===
    if (isTranscontainer) {
      const freightRaw = is20 ? (fr.soc20 || fr.coc20) : (fr.soc40 || fr.coc40);
      if (!freightRaw || freightRaw <= 0) return;

      const rwMatches = railway.filter(r => {
        const rt = r.terminal.toLowerCase();
        const rc = r.city.trim().toLowerCase();
        const qc = cityNorm.toLowerCase();
        return rc === qc && rt.includes("трансконтейнер");
      });
      if (rwMatches.length === 0) return;

      const rwPrices = rwMatches.map(r => {
        let p = is20 ? (weight >= 28 ? (r.p20_28t || r.p20_24t || r.p20base) : weight >= 24 ? (r.p20_24t || r.p20base) : r.p20base) : (weight >= 28 ? (r.p40_28t || r.p40base) : r.p40base);
        const nds = r.nds > 0 ? p * r.nds : 0;
        const guard = is20 ? r.guard20 : r.guard40;
        const guardNds = r.guardNds > 0 ? guard * r.guardNds : 0;
        return { base: p, total: Math.round(p + nds), guard: Math.round(guard + guardNds), terminal: r.terminal, validity: r.validity };
      }).filter(p => p.base > 0);
      if (rwPrices.length === 0) return;

      let avg = [...rwPrices].sort((a, b) => a.total - b.total);
      if (avg.length > 2) avg = avg.slice(1, -1);
      const avgRw = Math.round(avg.reduce((s, p) => s + p.total, 0) / avg.length);
      const avgGuard = Math.round(avg.reduce((s, p) => s + p.guard, 0) / avg.length);

      const wsTC = calcWeightSurcharge(fr.comment, is20, weight);
      const freightRub = freightRaw;
      const freightWithMarginRub = freightRub + Math.round((marginUsd + wsTC.surcharge) * usdRate);

      let autoRub = 0, autoLabel = "";
      const cityLower = cityNorm.toLowerCase();
      if (cityLower.includes("москва")) {
        const ap = autoMsk.map(a => is20 ? a.p20 : a.p40).filter(v => v > 0);
        if (ap.length > 0) { let s = [...ap].sort((a,b)=>a-b); if(s.length>2) s=s.slice(1,-1); autoRub = Math.round(s.reduce((a,v)=>a+v,0)/s.length); autoLabel = "Авто Мск (средн.)"; }
      } else {
        const ca = (customAuto || []).find(a => a.city.toLowerCase() === cityLower);
        if (ca) { autoRub = is20 ? ca.p20 : ca.p40; autoLabel = `Авто ${cityNorm}`; }
      }

      const rwWithMargin = avgRw + marginRub;
      const totalRub = freightWithMarginRub + rwWithMargin + avgGuard + autoRub;

      results.push({
        id: uid(), line: fr.line, service: fr.service, pol: fr.pol, transship: fr.transship,
        terminal: fr.terminal, departure: fr.departure, validity: fr.validity, comment: fr.comment,
        ownerType: "COC (вшит)", freightUsd: 0, boxDropUsd: 0,
        boxDropLabel: "Дроп вкл. в ЖД", totalFreightUsd: 0,
        freightWithMargin: 0, freightRub: freightWithMarginRub,
        freightRubRaw: freightRub, isRubFreight: true,
        rwBase: avgRw, rwGuard: avgGuard, rwWithMargin, rwTerminal: rwPrices[0]?.terminal, rwValidity: rwPrices[0]?.validity,
        autoRub, autoLabel, marginUsd, marginRub,
        marginTotalRub: Math.round(marginUsd * usdRate) + marginRub,
        weightSurcharge: wsTC.surcharge, weightNote: wsTC.note,
        totalRub,
      });
      return;
    }

    // === STANDARD case ===
    const servLower = fr.service.toLowerCase();
    const lineLower = fr.line.toLowerCase();
    const termLower = (fr.terminal || "").toLowerCase();
    const isSquoznoy = servLower.includes("сквозной");
    const isPortovoy = servLower.includes("портовый");
    const isPanda = lineLower === "panda";

    let autoRub = 0, autoLabel = "";
    const cityLower = cityNorm.toLowerCase();
    if (cityLower.includes("москва")) {
      const ap = autoMsk.map(a => is20 ? a.p20 : a.p40).filter(v => v > 0);
      if (ap.length > 0) { let sorted = [...ap].sort((a,b)=>a-b); if(sorted.length>2) sorted=sorted.slice(1,-1); autoRub = Math.round(sorted.reduce((s,v)=>s+v,0)/sorted.length); autoLabel = "Авто Мск (средн.)"; }
    } else {
      const ca = (customAuto || []).find(a => a.city.toLowerCase() === cityLower);
      if (ca) { autoRub = is20 ? ca.p20 : ca.p40; autoLabel = `Авто ${cityNorm}`; }
    }

    const findRw = (searchTerm) => {
      return railway.filter(r => {
        const rt = r.terminal.toLowerCase();
        const rc = r.city.trim().toLowerCase();
        const qc = cityNorm.toLowerCase();
        if (rc !== qc) return false;
        return rt.includes(searchTerm) || searchTerm.includes(rt);
      });
    };

    const getRailway = (ownerType) => {
      let rwMatches;
      if (isPanda && isSquoznoy) {
        if (ownerType === "SOC") {
          rwMatches = findRw("логопер сквозной soc");
        } else {
          if (servLower.includes("импортер")) {
            rwMatches = findRw("логопер сквозной (импортеры)");
          } else {
            rwMatches = findRw("логопер сквозной coc");
          }
        }
      } else if (isSquoznoy) {
        rwMatches = findRw(servLower);
      } else if (isPortovoy) {
        rwMatches = railway.filter(r => {
          const rt = r.terminal.toLowerCase();
          const rc = r.city.trim().toLowerCase();
          const qc = cityNorm.toLowerCase();
          if (rc !== qc) return false;
          if (termLower.includes(rt) || rt.includes(termLower)) return true;
          const parts = termLower.split(/[\/,]/);
          return parts.some(tp => tp.trim() && (rt.includes(tp.trim()) || tp.trim().includes(rt)));
        });
      } else {
        rwMatches = findRw(servLower);
        if (rwMatches.length === 0) rwMatches = findRw(termLower);
      }
      if (rwMatches.length === 0) return null;
      const rwPrices = rwMatches.map(r => {
        let p = is20 ? (weight >= 28 ? (r.p20_28t || r.p20_24t || r.p20base) : weight >= 24 ? (r.p20_24t || r.p20base) : r.p20base) : (weight >= 28 ? (r.p40_28t || r.p40base) : r.p40base);
        const nds = r.nds > 0 ? p * r.nds : 0;
        const guard = is20 ? r.guard20 : r.guard40;
        const guardNds = r.guardNds > 0 ? guard * r.guardNds : 0;
        return { base: p, total: Math.round(p + nds), guard: Math.round(guard + guardNds), terminal: r.terminal, validity: r.validity };
      }).filter(p => p.base > 0);
      if (rwPrices.length === 0) return null;
      let avg = [...rwPrices].sort((a, b) => a.total - b.total);
      if (avg.length > 2) avg = avg.slice(1, -1);
      return {
        base: Math.round(avg.reduce((s, p) => s + p.total, 0) / avg.length),
        guard: Math.round(avg.reduce((s, p) => s + p.guard, 0) / avg.length),
        terminal: rwPrices[0].terminal,
        validity: rwPrices[0].validity,
      };
    };

    const pushResult = (opt, rw, dateWarnings) => {
      const ws = calcWeightSurcharge(fr.comment, is20, weight);
      const totalFreightUsd = Math.round(opt.totalFreightUsd * 100) / 100;
      const freightWithMargin = Math.round((totalFreightUsd + marginUsd + ws.surcharge) * 100) / 100;
      const rwWithMargin = rw.base + marginRub;
      const freightRub = Math.round(freightWithMargin * usdRate);
      const totalRub = freightRub + rwWithMargin + rw.guard + autoRub;
      const marginTotalRub = Math.round(marginUsd * usdRate) + marginRub;
      results.push({
        id: uid(), line: fr.line, service: fr.service, pol: fr.pol, transship: fr.transship,
        terminal: fr.terminal, departure: fr.departure, validity: fr.validity, comment: fr.comment,
        ownerType: opt.type, freightUsd: Math.round(opt.freightUsd * 100) / 100,
        boxDropUsd: Math.round(opt.boxDropUsd * 100) / 100,
        boxDropLabel: opt.boxDropLabel, totalFreightUsd,
        freightWithMargin, freightRub, isRubFreight: false,
        rwBase: rw.base, rwGuard: rw.guard, rwWithMargin, rwTerminal: rw.terminal, rwValidity: rw.validity,
        autoRub, autoLabel, marginUsd, marginRub, marginTotalRub, totalRub,
        weightSurcharge: ws.surcharge, weightNote: ws.note,
        dateWarnings: dateWarnings || [],
        dropValidity: opt.dropValidity || "",
      });
    };

    const frVal = parseValidity(fr.validity);
    const frDepOk = dateInRange(fr.departure, frVal);

    // SOC
    if ((is20 && fr.soc20 > 0) || (!is20 && fr.soc40 > 0)) {
      const freightUsd = is20 ? fr.soc20 : fr.soc40;
      const box = boxes.find(b => {
        const bp = b.pol.toUpperCase(); const pp = polNorm;
        return (bp === pp || bp.includes(pp) || pp.includes(bp)) && b.city.trim().toLowerCase() === cityNorm.toLowerCase();
      });
      if (box) {
        const boxUsd = is20 ? box.p20 : box.p40;
        const socOpt = { type: "SOC", freightUsd, boxDropUsd: boxUsd, totalFreightUsd: freightUsd + boxUsd, boxDropLabel: "Ящик SOC" };
        const rw = getRailway("SOC");
        const warns = [];
        if (!frDepOk && fr.departure) warns.push("Дата выхода вне валидности фрахта");
        if (rw) pushResult(socOpt, rw, warns);
      }
    }

    // COC
    if ((is20 && fr.coc20 > 0) || (!is20 && fr.coc40 > 0)) {
      const freightUsd = is20 ? fr.coc20 : fr.coc40;
      const aliasLine = DROP_LINE_ALIASES[lineLower] || lineLower;

      const matchingDrops = drops.filter(d => {
        const dl = d.line.toLowerCase();
        const cityMatch = d.city.trim().toLowerCase() === cityNorm.toLowerCase();
        if (!cityMatch) return false;
        return dl.includes(aliasLine) || aliasLine.includes(dl) || dl.includes(lineLower) || lineLower.includes(dl) || dl.includes(servLower) || servLower.includes(dl);
      });
      if (matchingDrops.length === 0) {
        const anyDrop = drops.find(d => d.line === "Любая" && d.city.trim().toLowerCase() === cityNorm.toLowerCase());
        if (anyDrop) matchingDrops.push(anyDrop);
      }

      let bestDrop = null;
      let dropDateOk = true;
      if (matchingDrops.length > 0) {
        if (fr.departure) {
          const validDrop = matchingDrops.find(d => {
            const dv = parseValidity(d.validity);
            return dateInRange(fr.departure, dv);
          });
          if (validDrop) { bestDrop = validDrop; dropDateOk = true; }
          else { bestDrop = matchingDrops[0]; dropDateOk = false; }
        } else {
          bestDrop = matchingDrops[0];
        }
      }

      if (bestDrop) {
        const dropP = is20 ? bestDrop.p20 : bestDrop.p40;
        if (typeof dropP === 'number' && dropP !== -1) {
          const totalFreight = freightUsd + dropP;
          const dropLabel = dropP < 0 ? `Возврат ${Math.abs(dropP)}$` : "Дроп COC";
          const cocOpt = { type: "COC", freightUsd, boxDropUsd: dropP, totalFreightUsd: totalFreight, boxDropLabel: dropLabel, dropValidity: bestDrop.validity || "" };
          const rw = getRailway("COC");
          const warns = [];
          if (!frDepOk && fr.departure) warns.push("Выход вне валидности фрахта");
          if (!dropDateOk) warns.push("Выход вне валидности дропа");
          if (rw) pushResult(cocOpt, rw, warns);
        }
      }
    }
  });

  return results.sort((a, b) => a.totalRub - b.totalRub);
}
