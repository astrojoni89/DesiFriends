// calcUtils.ts
import type { HopSchedule } from "@/context/RecipeContext";

/** Convert Plato (P) to specific gravity (SG) using a 3rd order polynomial */
export function platoToSG(plato: number): number {
  // Approximation from ASBC table
  return (
    1.00001 +
    3.8661e-3 * plato +
    1.3488e-5 * plato ** 2 +
    4.3074e-8 * plato ** 3
  );
}

/** Convert SG to Plato using polynomial approximation */
export function sgToPlato(sg: number): number {
  return -668.962 + 1262.45 * sg - 776.43 * sg ** 2 + 182.94 * sg ** 3;
}

/** Convert Plato to Brix using a linear approximation */
export function platoToBrix(plato: number): number {
  return plato / 0.962;
}

/** Convert Brix to Plato using a linear approximation */
export function brixToPlato(brix: number): number {
  return brix * 0.962;
}

/** Calculate ABV using Balling formula */
export function calculateAlcPlato(og: number, fg: number): string {
  var realExtract = (1 - (0.81 * (og - fg) / og)) * og;
  var alcWeight = (realExtract - og) / ((1.0665 * og / 100) - 2.0665);
  var alcVol = alcWeight / 0.795;
  // return ((76.08 * (og - fg)) / (1.775 - og)) * (fg / 0.794);
  return alcVol.toFixed(2);
}

/** Calculate ABV using Sean Terrill formula */
export function calculateAlcBrix(og: number, fg: number, correction: number = 1.02): string {
  var og_corr = og / correction;
  var fg_corr = fg / correction;
  var sg = 1.0000 - 0.00085683 * og_corr + 0.0034941 * fg_corr;
  var apparentExtract = - 463.37 + 668.72 * sg - 205.347 * sg ** 2;
  var realExtract = 0.1808 * og_corr + 0.8192 * apparentExtract;
  var alcWeight = (realExtract - og_corr) / ((1.0665 * og_corr / 100) - 2.0665);
  var alcVol = alcWeight / 0.795;
  return alcVol.toFixed(2);
}

/** Calculate ABV using Balling formula and specific gravity */
export function calculateAlcGravity(og: number, fg: number): string {
  var og_plato = sgToPlato(og);
  var fg_plato = sgToPlato(fg);

  var realExtract = (1 - (0.81 * (og_plato - fg_plato) / og_plato)) * og_plato;
  var alcWeight = (realExtract - og_plato) / ((1.0665 * og_plato / 100) - 2.0665);
  var alcVol = alcWeight / 0.795;
  // return ((76.08 * (og - fg)) / (1.775 - og)) * (fg / 0.794);
  return alcVol.toFixed(2);
}

/** Calculate ABV wrapper  */
export function calculateAlc(og: number, fg: number, unit: string): string {
  if (unit === "plato") {
    return calculateAlcPlato(og, fg);
  } else if (unit === "brix") {
    return calculateAlcBrix(og, fg);
  } else if (unit === "gravity") {
    return calculateAlcGravity(og, fg);
  }
  else {
    throw new Error("Invalid unit. Use 'plato', 'brix', or 'gravity'.");
  }
}

/** Convert unit wrapper  */
export function convertUnit(
  value: number,
  from: "brix" | "plato" | "gravity",
  to: "brix" | "plato" | "gravity"
): string {
  if (from === to) return String(value);

  // Convert to Plato as intermediate
  let plato: number;
  switch (from) {
    case "brix":
      plato = brixToPlato(value);
      break;
    case "plato":
      plato = value;
      break;
    case "gravity":
      plato = sgToPlato(value);
      break;
    default:
      throw new Error("Invalid source unit");
  }

  // Convert from Plato to target unit
  switch (to) {
    case "brix":
      return (platoToBrix(plato)).toFixed(2);
    case "plato":
      return plato.toFixed(2);
    case "gravity":
      return (platoToSG(plato)).toFixed(3);
    default:
      throw new Error("Invalid target unit");
  }
}


/** Calculate adjusted hop amount based on AA% */
export function adjustHopAmount(
  originalAmount: number,
  originalAA: number,
  actualAA: number
): string {
  return ((originalAmount * originalAA) / actualAA).toFixed(1);
}

/** Correct measured Plato based on temperature */
export function correctPlatoTemp(
  measuredPlato: number,
  calTemp: number,
  measTemp: number
): string {
  const sgObs = platoToSG(measuredPlato);
  const sgCorr = sgObs + 0.000303 * (measTemp - calTemp);
  return (sgToPlato(sgCorr)).toFixed(2);
}

/** Calculate how much water to add to dilute wort to desired gravity */
export function calculateDilutionVolume(
  originalGravity: number,
  originalVolume: number,
  targetGravity: number
): string {
  return ((originalGravity * originalVolume) / targetGravity - originalVolume).toFixed(2);
}

type EnrichedHopSchedule = {
  name: string;
  amount: string;
  time: string;
  alphaAcid: number;
};

/** Estimate IBU based on hops and boil time */
export function estimateIBU(hops: EnrichedHopSchedule[], volume: number, og: number = 1.05) {
  return hops.reduce((total, hop) => {
    const time = parseFloat(hop.time);
    const amount = parseFloat(hop.amount);
    const alphaAcid = hop.alphaAcid;

    if (isNaN(time) || isNaN(amount) || isNaN(alphaAcid)) return total;

    const utilization =
      (1.65 * Math.pow(0.000125, og - 1)) *
      ((1 - Math.exp(-0.04 * time)) / 4.15);

    const ibu = (alphaAcid / 100) * amount * utilization * 1000 / volume;
    return total + ibu;
  }, 0);
}

