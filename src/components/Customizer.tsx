import {
  useState,
  useEffect,
  useRef,
  lazy,
  Suspense,
  type ChangeEvent,
} from "react";
import {
  ENGRAVING_MAX,
  formatDA,
  type CustomizerState,
  type CoverMaterial,
  type BookSize,
} from "../three/customizerOptions";

import { translations } from "../data/translations";

const CustomizerCanvas = lazy(() => import("../three/CustomizerCanvas"));

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

// The Live 3D Customizer. Two columns: a large interactive 3D preview and a
// controls sidebar (cover material, size, engraving, photo upload). The
// uploaded photo is frontend-only — held as an object URL in this component,
// applied to the 3D cover, and never uploaded or persisted.
export default function Customizer({ locale = "fr" }: { locale?: string }) {
  const t = (key: keyof typeof translations["fr"]) => {
    const loc = (locale === "ar" || locale === "en" ? locale : "fr") as "fr" | "ar" | "en";
    return translations[loc][key] || translations["fr"][key] || String(key);
  };
  const [state, setState] = useState<CustomizerState>({
    cover: "wooden",
    size: "medium",
    engraving: "",
    photoUrl: null,
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<{
    coverOptions: any[];
    sizeOptions: any[];
    basePrice: number;
  }>({
    coverOptions: [
      { value: "wooden", label: "Wooden Heritage", sub: "Premium carved wood", color: "#d2b48c" },
      { value: "classic", label: "Classic Leatherette", sub: "Durable & sleek", color: "#3a2f2a" }
    ],
    sizeOptions: [
      { value: "small", label: "Small", dims: "20x20 cm", priceDelta: 0, aspect: 1.0 },
      { value: "medium", label: "Medium", dims: "30x30 cm", priceDelta: 1000, aspect: 1.0 },
      { value: "large", label: "Large", dims: "40x30 cm", priceDelta: 2000, aspect: 1.3333 }
    ],
    basePrice: 3500
  });

  useEffect(() => {
    let retries = 2;
    function loadConfig() {
      fetch("/api/config")
        .then((res) => {
          if (!res.ok) throw new Error(`Config API ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (data && data.coverOptions?.length && data.sizeOptions?.length) {
            setConfig(data);
            // Set initial state to first available option from DB if current defaults don't match
            setState((prev) => {
              const coverExists = data.coverOptions.some((c: any) => c.value === prev.cover);
              const sizeExists = data.sizeOptions.some((s: any) => s.value === prev.size);
              return {
                ...prev,
                cover: coverExists ? prev.cover : data.coverOptions[0].value,
                size: sizeExists ? prev.size : data.sizeOptions[0].value,
              };
            });
          }
        })
        .catch((err) => {
          console.error("Failed to load config:", err);
          if (retries > 0) {
            retries--;
            setTimeout(loadConfig, 1500);
          }
        });
    }
    loadConfig();
  }, []);

  // Revoke the object URL whenever it's replaced or the component unmounts,
  // so we don't leak blob URLs in the tab.
  useEffect(() => {
    return () => {
      if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
    };
  }, [state.photoUrl]);

  // Save customizer state to sessionStorage so it can be picked up by the OrderForm
  useEffect(() => {
    try {
      const toSave = {
        cover: state.cover,
        size: state.size,
        engraving: state.engraving,
      };
      sessionStorage.setItem("customizer_order", JSON.stringify(toSave));
    } catch (e) {
      console.error("Failed to save customizer choices to sessionStorage:", e);
    }
  }, [state.cover, state.size, state.engraving]);

  function setCover(cover: CoverMaterial) {
    setState((s) => ({ ...s, cover }));
  }
  function setSize(size: BookSize) {
    setState((s) => ({ ...s, size }));
  }
  function setEngraving(engraving: string) {
    setState((s) => ({ ...s, engraving: engraving.slice(0, ENGRAVING_MAX) }));
  }

  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      setUploadError(t("custom.photoErrFormat"));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(t("custom.photoErrSize"));
      return;
    }

    const url = URL.createObjectURL(file);
    setState((s) => {
      if (s.photoUrl) URL.revokeObjectURL(s.photoUrl);
      return { ...s, photoUrl: url };
    });
  }

  function removePhoto() {
    setState((s) => {
      if (s.photoUrl) URL.revokeObjectURL(s.photoUrl);
      return { ...s, photoUrl: null };
    });
    if (fileInput.current) fileInput.current.value = "";
  }

  const activeSizeOption = config.sizeOptions.find((s) => s.value === state.size) || config.sizeOptions[0];
  const price = config.basePrice + (activeSizeOption?.priceDelta ?? 0);

  return (
    <main className="mx-auto flex h-[calc(100vh-80px)] w-full max-w-container-max flex-col md:flex-row">
      {/* 3D Preview */}
      <section className="relative flex h-[380px] w-full items-center justify-center overflow-hidden bg-surface-container-low md:h-full md:w-2/3">
        <div className="absolute left-4 top-4 z-10 rounded-lg border border-outline-variant/20 bg-surface/80 px-4 py-2 shadow-sm backdrop-blur-sm">
          <p className="text-label-bold flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">360</span>
            {t("custom.interactive")}
          </p>
        </div>

        <Suspense fallback={<PreviewFallback />}>
          <CustomizerCanvas
            cover={state.cover}
            size={state.size}
            photoUrl={state.photoUrl}
            engraving={state.engraving}
            coverOptions={config.coverOptions}
            sizeOptions={config.sizeOptions}
          />
        </Suspense>

        <div className="pointer-events-none absolute bottom-4 left-0 z-10 w-full text-center">
          <p className="text-sm text-on-surface-variant/50">
            {t("custom.dragRotate")}
          </p>
        </div>
      </section>

      {/* Controls Sidebar */}
      <section className="relative z-20 flex h-auto w-full flex-col border-l border-outline-variant/10 bg-surface shadow-lg md:h-full md:w-1/3">
        <div className="flex-shrink-0 border-b border-outline-variant/10 p-gutter">
          <h1 className="text-headline-md mb-2 text-on-surface">
            {t("custom.title")}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            {t("custom.subtitle")}
          </p>
        </div>

        <div className="flex-grow space-y-stack-lg overflow-y-auto p-gutter">
          {/* Cover Material */}
          <fieldset className="space-y-stack-md">
            <legend className="text-label-bold uppercase tracking-wider text-on-surface">
              {t("custom.coverMaterial")}
            </legend>
            <div className="grid grid-cols-1 gap-3">
              {config.coverOptions.map((opt) => {
                const active = state.cover === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`relative flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-surface-container-low ${
                      active
                        ? "border-tertiary-container bg-surface-container-low ring-1 ring-tertiary-container"
                        : "border-outline-variant"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className="h-10 w-10 rounded-md border border-outline-variant/20"
                        style={{ backgroundColor: opt.color }}
                      />
                      <span>
                        <span
                          className={`block font-semibold ${active ? "text-tertiary-container" : "text-on-surface"}`}
                        >
                          {opt.label}
                        </span>
                        <span className="block text-sm text-on-surface-variant">
                          {opt.sub}
                        </span>
                      </span>
                    </div>
                    <input
                      className="sr-only"
                      type="radio"
                      name="cover_type"
                      value={opt.value}
                      checked={active}
                      onChange={() => setCover(opt.value)}
                    />
                    <span
                      className={`material-symbols-outlined text-tertiary-container transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                    >
                      check_circle
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Cover Photo — frontend-only upload */}
          <div className="space-y-stack-sm">
            <h2 className="text-label-bold uppercase tracking-wider text-on-surface">
              {t("custom.coverPhoto")}
            </h2>
            {state.photoUrl ? (
              <div className="flex items-center gap-4 rounded-lg border border-outline-variant p-3">
                <img
                  src={state.photoUrl}
                  alt="Aperçu de votre photo"
                  className="h-16 w-16 rounded-md object-cover"
                />
                <div className="flex-grow">
                  <p className="font-semibold text-on-surface">{t("custom.photoAdded")}</p>
                  <p className="text-xs text-on-surface-variant">
                    {t("custom.photoAddedDesc")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removePhoto}
                  className="rounded-md px-3 py-1 text-sm font-semibold text-error hover:bg-error-container/40"
                >
                  {t("custom.photoRemove")}
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant p-6 text-center transition-colors hover:bg-surface-container-low">
                <span className="material-symbols-outlined text-on-surface-variant">
                  add_photo_alternate
                </span>
                <span className="font-semibold text-on-surface">
                  {t("custom.photoUpload")}
                </span>
                <span className="text-xs text-on-surface-variant">
                  {t("custom.photoFormat")}
                </span>
                <input
                  ref={fileInput}
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleUpload}
                />
              </label>
            )}
            <p className="text-xs text-on-surface-variant/70">
              {t("custom.photoNote")}
            </p>
            {uploadError && (
              <p className="text-xs font-semibold text-error">{uploadError}</p>
            )}
          </div>

          {/* Book Size */}
          <fieldset className="space-y-stack-md">
            <legend className="text-label-bold uppercase tracking-wider text-on-surface">
              {t("custom.bookSize")}
            </legend>
            <div className="flex gap-3">
              {config.sizeOptions.map((opt) => {
                const active = state.size === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`relative flex-1 cursor-pointer rounded-lg border p-3 text-center transition-colors hover:bg-surface-container-low ${
                      active
                        ? "border-primary bg-primary-container text-on-primary-container"
                        : "border-outline-variant text-on-surface"
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="book_size"
                      value={opt.value}
                      checked={active}
                      onChange={() => setSize(opt.value)}
                    />
                    <span className="mb-1 block font-semibold">{opt.label}</span>
                    <span className="block text-xs opacity-70">{opt.dims}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Cover Engraving */}
          <div className="space-y-stack-sm">
            <h2 className="text-label-bold uppercase tracking-wider text-on-surface">
              {t("custom.engraving")}
            </h2>
            <div className="relative">
              <input
                id="engraving_text"
                type="text"
                maxLength={ENGRAVING_MAX}
                value={state.engraving}
                onChange={(e) => setEngraving(e.target.value)}
                placeholder={t("custom.engravingPlaceholder")}
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface outline-none transition-shadow placeholder:text-on-surface-variant/50 focus:border-tertiary-container focus:ring-2 focus:ring-tertiary-container"
              />
              <p className="mt-2 text-right text-xs text-on-surface-variant">
                {state.engraving.length}/{ENGRAVING_MAX} {t("custom.characters")}
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Footer CTA */}
        <div className="mt-auto flex-shrink-0 border-t border-outline-variant/10 bg-surface p-gutter">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-body-lg text-on-surface-variant">
              {t("custom.estimation")}
            </span>
            <span className="text-headline-md text-on-surface" id="price_display">
              {formatDA(price)}
            </span>
          </div>
          <div className="mb-4 flex items-center justify-center gap-2 rounded bg-tertiary-fixed-dim/20 p-2">
            <span className="material-symbols-outlined text-sm text-tertiary-container">
              local_shipping
            </span>
            <span className="text-label-bold text-xs text-tertiary-container">
              {t("custom.codDisclaimer")}
            </span>
          </div>
          <a
            href={locale === "fr" ? "/#order-form" : `/${locale}/#order-form`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-tertiary-container py-4 text-button-text font-semibold text-on-primary shadow-cta transition-all hover:opacity-90 active:scale-95"
          >
            {t("custom.proceed")}
            <span className="material-symbols-outlined">arrow_forward</span>
          </a>
        </div>
      </section>
    </main>
  );
}

function PreviewFallback({ locale = "fr" }: { locale?: string }) {
  const loc = (locale === "ar" || locale === "en" ? locale : "fr") as "fr" | "ar" | "en";
  return (
    <div className="flex flex-col items-center gap-3 text-on-surface-variant">
      <span className="material-symbols-outlined animate-spin text-3xl">
        progress_activity
      </span>
      <p className="text-sm">{translations[loc]["custom.loading"]}</p>
    </div>
  );
}
