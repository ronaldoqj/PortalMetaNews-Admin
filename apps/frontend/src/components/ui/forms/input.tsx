"use client";

import { MultiSelect as MantineMultiSelect, Select as MantineSelect } from "@mantine/core";

export { TextInput, PasswordInput, Textarea, NumberInput, Switch, Checkbox, ColorInput, SegmentedControl, Radio } from "@mantine/core";
export type { TextInputProps, PasswordInputProps, TextareaProps, SelectProps, MultiSelectProps, NumberInputProps, SwitchProps, CheckboxProps, ColorInputProps, SegmentedControlProps, RadioProps } from "@mantine/core";

/** Comboboxes mark the chosen option with a check on the right, after its label. */
export const Select = MantineSelect.withProps({ checkIconPosition: "right" });
export const MultiSelect = MantineMultiSelect.withProps({ checkIconPosition: "right" });

export { RichTextInput } from "./rich-text-input";
export type { RichTextInputProps } from "./rich-text-input";
