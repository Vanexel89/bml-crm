export function calcWeightSurcharge(comment, is20, weightTons) {
  if (!comment || !weightTons || weightTons <= 0) return { surcharge: 0, note: "" };
  const text = comment.toLowerCase().replace(/\s+/g, " ");
  let surcharge = 0;
  const notes = [];
  const parseNum = s => Number(String(s).replace(",", "."));
  let matched = false;

  if (is20) {
    const t1 = text;
    const range20 = /20\s*(?:фт|фут|'|dc)\s*[-–]?\s*(\d+[,.]?\d*)\s*[-–]\s*(\d+[,.]?\d*)\s*\+\s*(\d+)\s*(?:usd|\$)/i.exec(t1);
    if (range20) {
      const lo = parseNum(range20[1]), hi = parseNum(range20[2]), add = Number(range20[3]);
      if (weightTons >= lo && weightTons <= hi) { surcharge = add; notes.push(`вес ${weightTons}т (${lo}-${hi}т +$${add})`); matched = true; }
    }
    const parts20 = text.split("/")[0] || text;
    const over20matches = [...parts20.matchAll(/свыше\s*(\d+[,.]?\d*)\s*т?\s*\+\s*(\d+)\s*(?:usd|\$)/gi)];
    for (const om of over20matches) {
      const thresh = parseNum(om[1]), add = Number(om[2]);
      if (weightTons >= thresh && add > surcharge) { surcharge = add; notes.length = 0; notes.push(`вес ${weightTons}т (свыше ${thresh}т +$${add})`); matched = true; }
    }
  } else {
    const parts40 = text.includes("/") ? text.split("/").slice(1).join("/") : text;
    const range40 = /40\s*(?:фт|фут|'|hc|dc)\s*[-–]?\s*(\d+[,.]?\d*)\s*[-–]\s*(\d+[,.]?\d*)\s*\+\s*(\d+)\s*(?:usd|\$)/i.exec(parts40);
    if (range40) {
      const lo = parseNum(range40[1]), hi = parseNum(range40[2]), add = Number(range40[3]);
      if (weightTons >= lo && weightTons <= hi) { surcharge = add; notes.push(`вес ${weightTons}т (${lo}-${hi}т +$${add})`); matched = true; }
    }
    const over40matches = [...parts40.matchAll(/свыше\s*(\d+[,.]?\d*)\s*т?\s*\+\s*(\d+)\s*(?:usd|\$)/gi)];
    for (const om of over40matches) {
      const thresh = parseNum(om[1]), add = Number(om[2]);
      if (weightTons >= thresh && add > surcharge) { surcharge = add; notes.length = 0; notes.push(`вес ${weightTons}т (свыше ${thresh}т +$${add})`); matched = true; }
    }
  }

  if (!matched) {
    let fm;
    const forRx = /свыше\s*(\d+[,.]?\d*)\s*т?\s*\+\s*(\d+)\s*(?:usd|\$)\s*(?:для\s*)?(\d{2})\s*(?:фт|фут|')/gi;
    while ((fm = forRx.exec(text)) !== null) {
      const thresh = parseNum(fm[1]), add = Number(fm[2]), ct = fm[3];
      const applies = (is20 && ct === "20") || (!is20 && ct === "40");
      if (applies && weightTons >= thresh && add > surcharge) {
        surcharge = add; notes.length = 0; notes.push(`вес ${weightTons}т (свыше ${thresh}т +$${add})`); matched = true;
      }
    }
  }

  if (!matched) {
    let gm;
    const genRx = /свыше\s*(\d+[,.]?\d*)\s*т?\s*\+\s*(\d+)\s*(?:usd|\$)/gi;
    while ((gm = genRx.exec(text)) !== null) {
      const thresh = parseNum(gm[1]), add = Number(gm[2]);
      if (weightTons >= thresh && add > surcharge) {
        surcharge = add; notes.length = 0; notes.push(`вес ${weightTons}т (свыше ${thresh}т +$${add})`);
      }
    }
  }

  return { surcharge, note: notes.join("; ") };
}
