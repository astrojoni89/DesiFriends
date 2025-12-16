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
export function calculateAlcPlato(og: number, fg: number): [string, string, string, string, string] {
  var appExtract = fg;
  
  var fermRate_real = 100 * (0.81 * (og - fg) / og);
  var fermRate_app = 100 * (1 - (fg / og));
  
  var realExtract = (1 - (fermRate_real/100)) * og;
  
  var alcWeight = (realExtract - og) / ((1.0665 * og / 100) - 2.0665);
  var alcVol = alcWeight / 0.795;
  // return ((76.08 * (og - fg)) / (1.775 - og)) * (fg / 0.794);
  return [alcVol.toFixed(2), fermRate_app.toFixed(2), fermRate_real.toFixed(2), appExtract.toFixed(2), realExtract.toFixed(2)];
}

/** Calculate ABV using Sean Terrill formula */
export function calculateAlcBrix(og: number, fg: number, correction: number = 1.04): [string, string, string, string, string] {
  var og_corr = og / correction;
  var fg_corr = fg / correction;
  var sg = 1.0000 - 0.00085683 * og_corr + 0.0034941 * fg_corr;
  
  var [alcVol, fermRate_app, fermRate_real, appExtract, realExtract] = calculateAlcPlato(brixToPlato(og_corr), sgToPlato(sg)); /** As in Fabier/biercalcs */

  /** Might replace this with standard computation */
  // var apparentExtract = - 463.37 + 668.72 * sg - 205.347 * sg ** 2;
  // var realExtract = 0.1808 * og_corr + 0.8192 * apparentExtract;

  // var fermRate_real = 100 * (0.81 * (og_corr - sgToPlato(sg)) / og_corr);
  // var fermRate_app = 100 * (1 - (sgToPlato(sg) / og_corr));

  // var alcWeight = (realExtract - og_corr) / ((1.0665 * og_corr / 100) - 2.0665);
  // var alcVol = alcWeight / 0.795;
  // return [alcVol.toFixed(2), fermRate_app.toFixed(2), fermRate_real.toFixed(2), apparentExtract.toFixed(2), realExtract.toFixed(2)];
  return [alcVol, fermRate_app, fermRate_real, appExtract, realExtract];
}

/** Calculate ABV using Balling formula and specific gravity */
export function calculateAlcGravity(og: number, fg: number): [string, string, string, string, string] {
  var og_plato = sgToPlato(og);
  var fg_plato = sgToPlato(fg);

  var [alcVol, fermRate_app, fermRate_real, appExtract, realExtract] = calculateAlcPlato(og_plato, fg_plato);

  // var realExtract = (1 - (0.81 * (og_plato - fg_plato) / og_plato)) * og_plato;
  // var alcWeight = (realExtract - og_plato) / ((1.0665 * og_plato / 100) - 2.0665);
  // var alcVol = alcWeight / 0.795;
  // return ((76.08 * (og - fg)) / (1.775 - og)) * (fg / 0.794);
  return [alcVol, fermRate_app, fermRate_real, appExtract, realExtract];
}

/** Calculate ABV wrapper  */
export function calculateAlc(og: number, fg: number, unit: string): [string, string, string, string, string] {
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


export function calculateSugarSaccharose(co2Difference: number): [number, number] {
  var neededSugar = co2Difference/0.468;
  var addedAlcohol = neededSugar * 0.488/10 * 1.267;
  return [neededSugar, addedAlcohol];
}

export function calculateSugarWort(co2Difference: number, og: number, fg: number): [number, number] {
  var fermentableSugar = (0.8192 * (og - fg)) * 10;
  var neededSugar = co2Difference/0.468*(1000/fermentableSugar);
  var neededSugarNormalized = neededSugar * (1000/(1000-neededSugar));
  var addedAlcohol = neededSugar * 0.488/10 * 1.267/10;
  return [neededSugar, addedAlcohol];
}

export function calculateSugarGlucose(co2Difference: number): [number, number] {
  var neededSugar = co2Difference/0.468*1.09;
  var addedAlcohol = neededSugar * 0.488/10 * 1.267;
  return [neededSugar, addedAlcohol];
}

/** Calculate priming sugar wrapper */
/** Taken from https://www.maischemalzundmehr.de/index.php?inhaltmitte=toolsspeiserechner */
export function calculateSugar(ftemp: number, carb: number, sunit: string, og?: number, fg?: number): [string, string, string, string] {
  var co2Pressure = 3.1557*Math.exp(-0.032*ftemp);
  var co2Difference = carb - co2Pressure;

  if (sunit === "sugar") {
    var [neededSugar, addedAlcohol] = calculateSugarSaccharose(co2Difference);
  } else if (sunit === "wort") {
    if (og == null || fg == null) {
      throw new Error("OG and FG are required when unit is 'wort'");
    }
    var [neededSugar, addedAlcohol] = calculateSugarWort(co2Difference, og, fg);
  } else if (sunit === "glucose") {
    var [neededSugar, addedAlcohol] = calculateSugarGlucose(co2Difference);
  }
  else {
    throw new Error("Invalid unit. Use 'sugar', 'wort', or 'glucose'.");
  }
  return [co2Pressure.toFixed(1), co2Difference.toFixed(1), neededSugar.toFixed(1), addedAlcohol.toFixed(1)];
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

