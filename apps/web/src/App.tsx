import type { VersionResponse } from "@annecto-grid/contracts";
import { LOCALES, translate, type Locale, type MessageKey } from "@annecto-grid/i18n";
import { useEffect, useState } from "react";
import { fetchVersion } from "./api.ts";
import { WEB_COMMIT, WEB_VERSION } from "./build-info.ts";
import { initialLocale, storeLocale } from "./i18n.ts";

type ApiStatus = { state: "checking" } | { state: "connected"; info: VersionResponse } | { state: "unreachable" };

/** First 7 characters of a commit hash, as Git shows it. */
function shortCommit(commit: string): string {
  return /^[0-9a-f]{8,}$/i.test(commit) ? commit.slice(0, 7) : commit;
}

const UNKNOWN_COMMIT = "unknown";

export function App() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [api, setApi] = useState<ApiStatus>({ state: "checking" });
  const t = (key: MessageKey) => translate(locale, key);

  useEffect(() => {
    document.documentElement.lang = locale;
    storeLocale(locale);
  }, [locale]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchVersion(fetch, ctrl.signal)
      .then((info) => setApi({ state: "connected", info }))
      .catch(() => {
        if (!ctrl.signal.aborted) setApi({ state: "unreachable" });
      });
    return () => ctrl.abort();
  }, []);

  return (
    <>
      <a className="skip" href="#main">
        {t("app.skip")}
      </a>
      <header className="hdr">
        <div className="hdr-in">
          <div className="brand">
            <span className="mark" aria-hidden="true">
              AG
            </span>
            <span className="wordmark">{t("app.product")}</span>
          </div>
          <div className="seg" role="group" aria-label={t("app.language")}>
            {LOCALES.map((l) => (
              <button key={l} type="button" lang={l} aria-pressed={l === locale} onClick={() => setLocale(l)}>
                {translate(l, `lang.${l}` as const)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main id="main" className="page" tabIndex={-1}>
        <h1>{t("status.title")}</h1>
        <section className="card" aria-labelledby="web-h">
          <h2 id="web-h">{t("status.web")}</h2>
          <dl className="kv">
            <dt>{t("status.version")}</dt>
            <dd className="mono" data-testid="web-version">
              {WEB_VERSION}
            </dd>
            <dt>{t("status.commit")}</dt>
            <dd className="mono">{WEB_COMMIT === UNKNOWN_COMMIT ? t("status.unknown") : shortCommit(WEB_COMMIT)}</dd>
          </dl>
        </section>

        <section className="card" aria-labelledby="api-h" aria-live="polite">
          <h2 id="api-h">{t("status.api")}</h2>
          <dl className="kv">
            <dt>{t("status.state")}</dt>
            <dd>
              {api.state === "checking" && <span className="pill">{t("status.checking")}</span>}
              {api.state === "connected" && <span className="pill ok">{t("status.connected")}</span>}
              {api.state === "unreachable" && <span className="pill bad">{t("status.unreachable")}</span>}
            </dd>
            <dt>{t("status.version")}</dt>
            <dd className="mono" data-testid="api-version">
              {api.state === "connected" ? api.info.version : t("status.unknown")}
            </dd>
            <dt>{t("status.commit")}</dt>
            <dd className="mono">
              {api.state === "connected" && api.info.commit !== UNKNOWN_COMMIT
                ? shortCommit(api.info.commit)
                : t("status.unknown")}
            </dd>
          </dl>
        </section>

        <p className="muted note">{t("app.skeletonNote")}</p>
      </main>
    </>
  );
}
