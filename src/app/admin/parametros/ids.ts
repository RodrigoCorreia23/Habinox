import type { EditableSetting } from "@/server/settings-form";

/** Id do campo de cada parâmetro: o rótulo da coluna da esquerda aponta para ele. */
export const settingInputId = (key: EditableSetting) => `setting-${key}`;
