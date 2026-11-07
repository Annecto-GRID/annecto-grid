/**
 * `pnpm i18n:check` – fails the build when a language is incomplete.
 * Runs directly with Node.js (type stripping), without a build step.
 */

import { checkMessages, DEFAULT_LOCALE, messages } from "./index.ts";

const issues = checkMessages(messages, DEFAULT_LOCALE);
const keys = Object.keys(messages[DEFAULT_LOCALE]).length;

if (issues.length) {
  for (const i of issues) console.error(`i18n: ${i.locale} ${i.key}: ${i.problem}${i.detail ? ` (${i.detail})` : ""}`);
  console.error(`i18n: ${issues.length} problem(s).`);
  process.exit(1);
}
console.log(`i18n: ${Object.keys(messages).join(", ")} complete (${keys} keys per language).`);
