import { formatAdditionalAmount, recipeExtrasHtml, recipeExtrasText, scaleAdditionalIngredients } from "../recipeExtras";

const recipe = {
  name: "Mango Weizen", batchSize: 20,
  notes: "Nach der Hauptgärung zugeben.\nKalt lagern.",
  additionalIngredients: [{ name: "Mango", amount: 1.5, unit: "kg" }],
};

test("only ingredient amounts scale; the saved recipe remains unchanged", () => {
  const original = JSON.stringify(recipe);
  expect(scaleAdditionalIngredients(recipe.additionalIngredients, 30 / recipe.batchSize))
    .toEqual([{ name: "Mango", amount: 2.25, unit: "kg" }]);
  expect(recipeExtrasText(recipe, 1.5)).toContain("Mango: 2.25 kg");
  expect(recipeExtrasText(recipe, 1.5)).toContain(recipe.notes);
  expect(recipeExtrasHtml(recipe, 1.5)).toContain("Mango: 2.25 kg");
  expect(JSON.stringify(recipe)).toBe(original);
});

test("legacy recipes and empty extras produce no export sections", () => {
  for (const value of [{}, { notes: "  ", additionalIngredients: [] }]) {
    expect(recipeExtrasText(value)).toBe("");
    expect(recipeExtrasHtml(value)).toBe("");
  }
  expect(scaleAdditionalIngredients()).toEqual([]);
});

test("PDF content escapes free text and keeps note line breaks", () => {
  const html = recipeExtrasHtml({ notes: "<b>Fruit & honey</b>\nSecond line", additionalIngredients: [{ name: "<mango>", amount: 1, unit: "<kg>" }] });
  expect(html).toContain("&lt;mango&gt;");
  expect(html).toContain("&lt;kg&gt;");
  expect(html).toContain("&lt;b&gt;Fruit &amp; honey&lt;/b&gt;\nSecond line");
});

test("quantities display exactly two decimal places", () => {
  expect(formatAdditionalAmount(1.5)).toBe("1.50");
  expect(formatAdditionalAmount(2 / 3)).toBe("0.67");
  expect(formatAdditionalAmount(0.1 * 3)).toBe("0.30");
});

test("PDF extras share one two-column row with a dotted separator", () => {
  const html = recipeExtrasHtml(recipe);
  expect(html.match(/class="row"/g)).toHaveLength(1);
  expect(html.match(/class="col"/g)).toHaveLength(2);
  expect(html).toContain("border-top: 1pt dotted #999");
  expect(recipeExtrasHtml({ notes: "Only notes" }).match(/class="col"/g)).toHaveLength(1);
});
