import { useState, useEffect, type FormEvent } from "react";
import { WILAYAS } from "../data/wilayas";
import {
  validateOrder,
  hasErrors,
  normalizePhone,
  type FieldErrors,
  type OrderInput,
} from "../lib/order";
import { BASE_PRICE_SINGLE_DA, BASE_PRICE_BULK_DA, SIZE_OPTIONS } from "../three/customizerOptions";

import { translations } from "../data/translations";

type Status = "idle" | "submitting" | "success" | "error";

const EMPTY: OrderInput = {
  fullName: "",
  phone: "",
  wilaya: "",
  commune: "",
  company: "",
};

export default function OrderForm({ locale = "fr" }: { locale?: string }) {
  const t = (key: keyof typeof translations["fr"]) => {
    const loc = (locale === "ar" || locale === "en" ? locale : "fr") as "fr" | "ar" | "en";
    return translations[loc][key] || translations["fr"][key] || String(key);
  };
  const [values, setValues] = useState<OrderInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [customization, setCustomization] = useState<{
    cover: string;
    size: string;
    engraving: string;
    quantity: number;
    theme: string;
  }>({
    cover: "wooden",
    size: "small",
    engraving: "",
    quantity: 1,
    theme: "classic",
  });

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

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("customizer_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        setCustomization((prev) => ({
          ...prev,
          ...parsed,
          quantity: parsed.quantity || prev.quantity,
        }));
      }
    } catch (e) {
      console.error("Failed to read from sessionStorage:", e);
    }
  }, []);

  const update =
    (field: keyof OrderInput) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement
      >,
    ) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
      // Clear a field error as soon as the user edits it.
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  function localizeErrors(errs: FieldErrors): FieldErrors {
    const localErr: FieldErrors = {};
    if (errs.fullName) {
      if (errs.fullName.includes("court")) localErr.fullName = t("form.validationNameShort");
      else localErr.fullName = t("form.validationNameLong");
    }
    if (errs.phone) {
      localErr.phone = t("form.validationPhone");
    }
    if (errs.wilaya) {
      localErr.wilaya = t("form.validationWilaya");
    }
    if (errs.commune) {
      if (errs.commune.includes("indiquer")) localErr.commune = t("form.validationCommuneShort");
      else localErr.commune = t("form.validationCommuneLong");
    }
    return localErr;
  }

  const handleCustomizationChange = (field: string, value: any) => {
    setCustomization((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    const clientErrors = validateOrder(values);
    if (hasErrors(clientErrors)) {
      setErrors(localizeErrors(clientErrors));
      return;
    }

    setStatus("submitting");
    try {
      const payload = {
        ...values,
        phone: normalizePhone(values.phone),
        cover: customization.cover,
        size: customization.size,
        engraving: customization.engraving,
        quantity: customization.quantity,
        theme: customization.theme,
      };
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus("success");
        setValues(EMPTY);
        setCustomization({
          cover: "wooden",
          size: "small",
          engraving: "",
          quantity: 1,
          theme: "classic",
        });
        try {
          sessionStorage.removeItem("customizer_order");
        } catch {}
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && data.errors) {
        setErrors(localizeErrors(data.errors as FieldErrors));
        setStatus("idle");
      } else if (res.status === 429) {
        setServerError(t("form.errRateLimit"));
        setStatus("error");
      } else {
        setServerError(
          data.message ? t("form.errGeneral") : t("form.errGeneral")
        );
        setStatus("error");
      }
    } catch {
      setServerError(t("form.errConnection"));
      setStatus("error");
    }
  }

  function reset() {
    setValues(EMPTY);
    setErrors({});
    setStatus("idle");
    setServerError(null);
    setCustomization({
      cover: "wooden",
      size: "small",
      engraving: "",
      quantity: 1,
      theme: "classic",
    });
  }

  const qty = customization.quantity;
  const selectedSize = SIZE_OPTIONS.find((s) => s.value === customization.size) ?? SIZE_OPTIONS[0];
  const unitBase = qty >= 2 ? BASE_PRICE_BULK_DA : BASE_PRICE_SINGLE_DA;
  const price = (unitBase + selectedSize.priceDelta) * qty;

  const inputBase =
    "w-full rounded-md border bg-surface px-4 py-3 text-body-md text-on-background outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent";
  const border = (field: keyof OrderInput) =>
    errors[field] ? "border-error" : "border-outline-variant/40";

  return (
    <div className="relative overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-xl md:p-12">
      {/* Accent top strip */}
      <div className="absolute left-0 top-0 h-2 w-full bg-accent" />

      <div className="mb-10 text-center">
        <h2 className="mb-2 text-headline-md font-bold text-on-background" dir={locale === "ar" ? "rtl" : "ltr"}>
          {t("form.title")}
        </h2>
      </div>

      {status === "success" ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent-tint">
            <span className="material-symbols-outlined text-4xl text-accent">
              task_alt
            </span>
          </div>
          <h3 className="mb-2 text-headline-md font-bold text-on-background" dir={locale === "ar" ? "rtl" : "ltr"}>
            {t("form.successTitle")}
          </h3>
          <p className="mb-8 text-body-lg text-on-surface-variant" dir={locale === "ar" ? "rtl" : "ltr"}>
            {t("form.successDesc")}
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-outline-variant px-6 py-2 text-button-text font-semibold transition-colors hover:bg-surface-variant"
          >
            {t("form.newOrder")}
          </button>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          {/* Interactive Album Options Configurator */}
          <div className="mb-6 rounded-lg border border-accent/20 bg-accent-tint/5 p-6 text-on-surface space-y-4">
            <h4 className="font-bold text-body-lg mb-2 text-accent flex items-center gap-2">
              <span className="material-symbols-outlined text-accent font-extrabold">tune</span>
              {locale === "ar" ? "تفاصيل طلبك المخصص:" : locale === "en" ? "Customize Your Album:" : "Personnalisez votre album :"}
            </h4>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Cover Selection */}
              <div>
                <label className="mb-1 block text-label-bold font-bold text-secondary text-sm">
                  {t("custom.coverMaterial")}
                </label>
                <select
                  value={customization.cover}
                  onChange={(e) => handleCustomizationChange("cover", e.target.value)}
                  className="w-full rounded-md border border-outline-variant/40 bg-surface px-3 py-2 text-body-md text-on-background outline-none focus:border-accent"
                >
                  <option value="wooden">{locale === "ar" ? "غطاء خشبي" : locale === "en" ? "Wooden Cover" : "Couverture en bois"}</option>
                  <option value="classic">{locale === "ar" ? "غطاء جلدي كلاسيكي" : locale === "en" ? "Classic Leatherette" : "Couverture classique"}</option>
                </select>
              </div>

              {/* Size Selection */}
              <div>
                <label className="mb-1 block text-label-bold font-bold text-secondary text-sm">
                  {t("custom.bookSize")}
                </label>
                <select
                  value={customization.size}
                  onChange={(e) => handleCustomizationChange("size", e.target.value)}
                  className="w-full rounded-md border border-outline-variant/40 bg-surface px-3 py-2 text-body-md text-on-background outline-none focus:border-accent"
                >
                  <option value="small">{locale === "ar" ? "صغير (20x20 سم)" : locale === "en" ? "Small (20x20 cm)" : "Petit (20x20 cm)"}</option>
                  <option value="medium">{locale === "ar" ? "متوسط (30x20 سم) (+500 دج)" : locale === "en" ? "Medium (30x20 cm) (+500 DA)" : "Moyen (30x20 cm) (+500 DA)"}</option>
                  <option value="large">{locale === "ar" ? "كبير (40x30 سم) (+1000 دج)" : locale === "en" ? "Large (40x30 cm) (+1000 DA)" : "Grand (40x30 cm) (+1000 DA)"}</option>
                </select>
              </div>

              {/* Theme Selection */}
              <div>
                <label className="mb-1 block text-label-bold font-bold text-secondary text-sm">
                  {locale === "ar" ? "ثيم التصميم:" : locale === "en" ? "Design Theme:" : "Thème de design :"}
                </label>
                <select
                  value={customization.theme}
                  onChange={(e) => handleCustomizationChange("theme", e.target.value)}
                  className="w-full rounded-md border border-outline-variant/40 bg-surface px-3 py-2 text-body-md text-on-background outline-none focus:border-accent"
                >
                  <option value="classic">{locale === "ar" ? "ذكريات كلاسيكية" : locale === "en" ? "Classic Memories" : "Souvenirs Classiques"}</option>
                  <option value="wedding">{locale === "ar" ? "زواج وخطوبة" : locale === "en" ? "Wedding & Engagement" : "Mariage & Fiançailles"}</option>
                  <option value="omra">{locale === "ar" ? "عمرة وحج" : locale === "en" ? "Omra & Hajj" : "Omra & Hajj"}</option>
                  <option value="baby">{locale === "ar" ? "طفل ومولود جديد" : locale === "en" ? "Baby & Birth" : "Bébé & Naissance"}</option>
                  <option value="travel">{locale === "ar" ? "سفر ومغامرات" : locale === "en" ? "Travel & Vacations" : "Voyages & Aventures"}</option>
                </select>
              </div>

              {/* Quantity Selector */}
              <div>
                <label className="mb-1 block text-label-bold font-bold text-secondary text-sm">
                  {locale === "ar" ? "الكمية:" : locale === "en" ? "Quantity:" : "Quantité :"}
                </label>
                <div className="flex h-10 w-32 items-center rounded-lg border border-outline-variant/40 bg-surface">
                  <button
                    type="button"
                    onClick={() => handleCustomizationChange("quantity", Math.max(1, customization.quantity - 1))}
                    className="flex h-full w-10 items-center justify-center text-on-surface hover:bg-surface-variant rounded-l-lg transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">remove</span>
                  </button>
                  <span className="flex-1 text-center font-bold text-body-md">{customization.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleCustomizationChange("quantity", customization.quantity + 1)}
                    className="flex h-full w-10 items-center justify-center text-on-surface hover:bg-surface-variant rounded-r-lg transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
              </div>

              {/* Cover Engraving */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-label-bold font-bold text-secondary text-sm">
                  {t("custom.engraving")} ({locale === "ar" ? "اختياري" : locale === "en" ? "Optional" : "Optionnel"})
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={30}
                    placeholder={t("custom.engravingPlaceholder")}
                    value={customization.engraving}
                    onChange={(e) => handleCustomizationChange("engraving", e.target.value)}
                    className="w-full rounded-md border border-outline-variant/40 bg-surface px-4 py-2 text-body-md text-on-background outline-none transition-all focus:border-accent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-outline font-mono">
                    {customization.engraving.length}/30
                  </span>
                </div>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="mt-4 pt-4 border-t border-outline-variant/20 flex justify-between items-center bg-accent-tint/10 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <span className="text-body-lg font-bold text-on-surface">{t("form.estimatedPrice")}</span>
              <div className="text-right">
                <span className="text-headline-sm font-extrabold text-accent">
                  {price.toLocaleString("en-US")} DA
                </span>
                {customization.quantity >= 2 && (
                  <p className="text-xs text-accent font-semibold mt-1">
                    {locale === "ar" ? "تم تطبيق خصم الكمية (وفر 400 دج للوحدة)!" : locale === "en" ? "Bulk discount applied!" : "Remise de groupe appliquée !"}
                  </p>
                )}
              </div>
            </div>
          </div>
          {/* Honeypot — visually hidden, off-screen; real users never fill it. */}
          <div
            aria-hidden="true"
            className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden"
          >
            <label htmlFor="company">Company (leave empty)</label>
            <input
              id="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={values.company}
              onChange={update("company")}
            />
          </div>

          {/* Full name */}
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-label-bold font-bold text-on-background"
            >
              {t("form.nameLabel")}
            </label>
            <input
              id="fullName"
              type="text"
              required
              placeholder={t("form.namePlaceholder")}
              value={values.fullName}
              onChange={update("fullName")}
              className={`${inputBase} ${border("fullName")}`}
              aria-invalid={!!errors.fullName}
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-error">{errors.fullName}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-label-bold font-bold text-on-background"
            >
              {t("form.phoneLabel")}
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                call
              </span>
              <input
                id="phone"
                type="tel"
                required
                inputMode="numeric"
                placeholder={t("form.phonePlaceholder")}
                value={values.phone}
                onChange={update("phone")}
                className={`${inputBase} pl-12 ${border("phone")}`}
                aria-invalid={!!errors.phone}
              />
            </div>
            {errors.phone ? (
              <p className="mt-1 text-sm text-error">{errors.phone}</p>
            ) : (
              <p className="mt-1 text-xs text-outline">
                {locale === "ar" ? "رقم جوال صالح (05، 06، أو 07)" : locale === "en" ? "Valid mobile number (05, 06, or 07)" : "Numéro valide (05, 06, ou 07)"}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Wilaya */}
            <div>
              <label
                htmlFor="wilaya"
                className="mb-2 block text-label-bold font-bold text-on-background"
              >
                {t("form.wilayaLabel")}
              </label>
              <select
                id="wilaya"
                required
                value={values.wilaya}
                onChange={update("wilaya")}
                className={`${inputBase} cursor-pointer appearance-none ${border("wilaya")}`}
                aria-invalid={!!errors.wilaya}
              >
                <option value="" disabled>
                  {t("form.wilayaSelect")}
                </option>
                {WILAYAS.map((w) => (
                  <option key={w.code} value={String(w.code)}>
                    {w.code} - {w.fr} {w.ar && `/ ${w.ar}`}
                  </option>
                ))}
              </select>
              {errors.wilaya && (
                <p className="mt-1 text-sm text-error">{errors.wilaya}</p>
              )}
            </div>

            {/* Commune */}
            <div>
              <label
                htmlFor="commune"
                className="mb-2 block text-label-bold font-bold text-on-background"
              >
                {t("form.communeLabel")}
              </label>
              <input
                id="commune"
                type="text"
                required
                placeholder={t("form.communePlaceholder")}
                value={values.commune}
                onChange={update("commune")}
                className={`${inputBase} ${border("commune")}`}
                aria-invalid={!!errors.commune}
              />
              {errors.commune && (
                <p className="mt-1 text-sm text-error">{errors.commune}</p>
              )}
            </div>
          </div>

          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
            >
              {serverError}
            </div>
          )}

          {/* Submit */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="flex w-full items-center justify-center gap-3 rounded-md bg-accent py-4 text-lg text-button-text font-semibold text-white shadow-lg transition-colors hover:bg-accent-dark disabled:opacity-80 cursor-pointer"
            >
              {status === "submitting" ? (
                <>
                  <span className="material-symbols-outlined animate-spin">
                    progress_activity
                  </span>
                  <span>{t("form.submitting")}</span>
                </>
              ) : (
                <>
                  {t("form.submit")}
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1 text-center text-sm text-secondary">
            <span className="material-symbols-outlined text-sm">lock</span>
            {t("form.securePayment")}
          </div>
        </form>
      )}
    </div>
  );
}
