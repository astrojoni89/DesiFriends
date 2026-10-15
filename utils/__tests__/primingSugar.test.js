import { calculateSugar, calculateSugarFabier } from "../calcUtils";

test("Fabier reproduces the supplied sugar examples", () => {
  expect(calculateSugarFabier(20, 5.5, "sugar").slice(0, 3)).toEqual(["1.7", "3.8", "7.5"]);
  expect(calculateSugarFabier(20, 5.5, "glucose")[2]).toBe("8.7");
});

test("Speise preserves both volume bases without intermediate rounding", () => {
  const mixtureAmount = Number(calculateSugarFabier(20, 5.5, "wort", 11.7, 3)[2]);
  const addition = mixtureAmount * 1000 / (1000 - mixtureAmount);
  expect(addition).toBeCloseTo(109.0420151, 6);
  expect(mixtureAmount.toFixed(0)).toBe("98");
  expect((1000 - mixtureAmount).toFixed(0)).toBe("902");
  expect(addition.toFixed(0)).toBe("109");
});

test("original calculation remains available with its original results", () => {
  expect(calculateSugar(20, 5.5, "sugar")[2]).toBe("8.2");
  expect(calculateSugar(20, 5.5, "glucose")[2]).toBe("8.9");
  expect(calculateSugar(20, 5.5, "wort", 11.7, 3)[2]).toBe("115.0");
});

test("Fabier rejects missing Speise inputs and unknown sugar types", () => {
  expect(() => calculateSugarFabier(20, 5.5, "wort")).toThrow("OG and FG");
  expect(() => calculateSugarFabier(20, 5.5, "unknown")).toThrow("Invalid unit");
});
