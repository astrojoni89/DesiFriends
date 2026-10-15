import React from "react";
import renderer, { act } from "react-test-renderer";
import { Pressable, Text, TextInput } from "react-native";
import { RecipeForm } from "../RecipeForm";

jest.mock("@/hooks/useBrewBarOffset", () => ({ useBrewBarOffset: () => 0 }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
const initialValues = {
  name: "Weizen", batchSize: "20", hauptguss: "15", nachguss: "10",
  malz: [{ name: "Weizenmalz", amount: "4" }],
  hopfen: [{ name: "Hopfen", amount: "20", alphaAcid: "5" }],
  hefe: [{ name: "Hefe", amount: "10" }],
};

// Paper dialog subcomponents are not relevant to these form interactions.
jest.mock("react-native-paper", () => {
  const Dialog = ({ children }) => children;
  Dialog.Title = "DialogTitle";
  Dialog.Content = "DialogContent";
  Dialog.Actions = "DialogActions";
  return { useTheme: () => ({ colors: {} }), Snackbar: "Snackbar", Tooltip: "Tooltip", Portal: "Portal", Dialog };
});

const saveButton = tree => tree.root.findAllByType(Pressable).find(button =>
  button.findAllByType(Text).some(text => text.props.children === "Änderungen speichern"));

test("editing can clear optional extras without requiring them", () => {
  const onSave = jest.fn();
  let tree;
  act(() => { tree = renderer.create(<RecipeForm title="Edit" initialValues={{ ...initialValues, notes: "Old note" }} onSave={onSave} />); });
  act(() => tree.root.findAllByType(TextInput).find(input => input.props.placeholder === "Notizen zum Rezept").props.onChangeText(""));
  act(() => saveButton(tree).props.onPress());
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ notes: undefined, additionalIngredients: undefined }));
  act(() => tree.unmount());
});

test("new ingredients save numeric amounts and preserve a separate unit", () => {
  const onSave = jest.fn();
  let tree;
  act(() => { tree = renderer.create(<RecipeForm title="Edit" initialValues={initialValues} onSave={onSave} />); });
  const input = placeholder => tree.root.findAllByType(TextInput).filter(node => node.props.placeholder === placeholder).at(-1);
  act(() => input("Name").props.onChangeText("Mango"));
  act(() => input("Menge").props.onChangeText("1,5"));
  act(() => input("Einheit").props.onChangeText("kg"));
  act(() => saveButton(tree).props.onPress());
  expect(onSave).not.toHaveBeenCalled();
  const add = tree.root.findAllByType(Pressable).filter(button => button.findAll(node => node.type === "Icon" && node.props.name === "add").length).at(-1);
  act(() => add.props.onPress());
  act(() => saveButton(tree).props.onPress());
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ additionalIngredients: [{ name: "Mango", amount: 1.5, unit: "kg" }] }));
  act(() => tree.unmount());
});
