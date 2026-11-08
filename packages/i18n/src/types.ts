import type { sv } from "./locales/sv.ts";

/** Every text key. Defined by the Swedish texts, the default language. */
export type MessageKey = keyof typeof sv;

/** A complete set of texts for one language. Missing or extra keys are type errors. */
export type Messages = Record<MessageKey, string>;
