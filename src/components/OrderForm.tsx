import { useState, useEffect, type FormEvent } from "react";
import { WILAYAS } from "../data/wilayas";
import {
  validateOrder,
  hasErrors,
  normalizePhone,
  type FieldErrors,
  type OrderInput,
} from "../lib/order";

type Status = "idle" | "submitting" | "success" | "error";

const EMPTY: OrderInput = {
  fullName: "",
  phone: "",
  wilaya: "",
  commune: "",
  company: "",
};

export default function OrderForm() {
  const [values, setValues] = useState<OrderInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [customization, setCustomization] = useState<{
    cover?: string;
    size?: string;
    engraving?: string;
  } | null>(null);

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
        setCustomization(JSON.parse(saved));
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    const clientErrors = validateOrder(values);
    if (hasErrors(clientErrors)) {
      setErrors(clientErrors);
      return;
    }

    setStatus("submitting");
    try {
      const payload = {
        ...values,
        phone: normalizePhone(values.phone),
        cover: customization?.cover,
        size: customization?.size,
        engraving: customization?.engraving,
      };
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus("success");
        setValues(EMPTY);
        // Clear customization on success
        setCustomization(null);
        try {
          sessionStorage.removeItem("customizer_order");
        } catch {}
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && data.errors) {
        setErrors(data.errors as FieldErrors);
        setStatus("idle");
      } else if (res.status === 429) {
        setServerError(
          "Trop de tentatives. Veuillez patienter un instant et réessayer.",
        );
        setStatus("error");
      } else {
        setServerError(
          data.message ?? "Une erreur est survenue. Veuillez réessayer.",
        );
        setStatus("error");
      }
    } catch {
      setServerError(
        "Connexion impossible. Vérifiez votre réseau et réessayez.",
      );
      setStatus("error");
    }
  }

  function reset() {
    setValues(EMPTY);
    setErrors({});
    setStatus("idle");
    setServerError(null);
  }

  const selectedCover = customization ? (config.coverOptions.find((c) => c.value === customization.cover) || config.coverOptions[0]) : null;
  const selectedSize = customization ? (config.sizeOptions.find((s) => s.value === customization.size) || config.sizeOptions[0]) : null;
  const price = customization ? config.basePrice + (selectedSize?.priceDelta ?? 0) : config.basePrice;

  const inputBase =
    "w-full rounded-md border bg-surface px-4 py-3 text-body-md text-on-background outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent";
  const border = (field: keyof OrderInput) =>
    errors[field] ? "border-error" : "border-outline-variant/40";

  return (
    <div className="relative overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-xl md:p-12">
      {/* Accent top strip */}
      <div className="absolute left-0 top-0 h-2 w-full bg-accent" />

      <div className="mb-10 text-center">
        <h2 className="mb-2 text-headline-md font-bold text-on-background">
          Remplissez le formulaire ci-dessous pour commander
        </h2>
        <h3 dir="rtl" className="text-headline-md font-bold text-secondary">
          أطلب الآن بملأ الاستمارة
        </h3>
      </div>

      {status === "success" ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent-tint">
            <span className="material-symbols-outlined text-4xl text-accent">
              task_alt
            </span>
          </div>
          <h3 className="mb-2 text-headline-md font-bold text-on-background">
            Votre commande a été enregistrée !
          </h3>
          <p className="mb-6 text-body-lg text-on-surface-variant">
            Nous allons vous appeler très prochainement pour la confirmation.
          </p>
          <h3
            dir="rtl"
            className="mb-2 text-headline-md font-bold text-secondary"
          >
            تم تسجيل طلبكم بنجاح!
          </h3>
          <p dir="rtl" className="mb-8 text-body-lg text-on-surface-variant">
            سنتصل بكم لتأكيد الطلب.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-outline-variant px-6 py-2 text-button-text font-semibold transition-colors hover:bg-surface-variant"
          >
            Nouvelle commande
          </button>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          {customization && (
            <div className="mb-6 rounded-lg border border-accent/20 bg-accent-tint/10 p-5 text-on-surface">
              <h4 className="font-bold text-body-lg mb-3 text-accent flex items-center gap-2">
                <span className="material-symbols-outlined text-accent">auto_stories</span>
                Votre configuration personnalisée :
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-body-md">
                <div>
                  <span className="text-on-surface-variant font-medium">Matière de couverture:</span>{" "}
                  <span className="font-semibold">{selectedCover?.label || customization.cover}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant font-medium">Taille de l'album:</span>{" "}
                  <span className="font-semibold">
                    {selectedSize ? `${selectedSize.label} (${selectedSize.dims})` : customization.size}
                  </span>
                </div>
                {customization.engraving && (
                  <div className="sm:col-span-2">
                    <span className="text-on-surface-variant font-medium">Gravure personnalisée:</span>{" "}
                    <span className="font-mono bg-surface-container-low px-2 py-1 rounded text-accent font-semibold">"{customization.engraving}"</span>
                  </div>
                )}
                <div className="sm:col-span-2 mt-2 pt-3 border-t border-outline-variant/20 flex justify-between items-center">
                  <span className="text-body-lg font-bold text-on-surface">Prix Estimé :</span>
                  <span className="text-headline-sm font-extrabold text-accent">
                    {price.toLocaleString("en-US")} DA
                  </span>
                </div>
              </div>
            </div>
          )}
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
              Nom Complet / الاسم الكامل *
            </label>
            <input
              id="fullName"
              type="text"
              required
              placeholder="Ex: Mohamed Lamine"
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
              Téléphone / رقم الهاتف *
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
                placeholder="05 / 06 / 07 XX XX XX XX"
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
                Numéro valide (05, 06, ou 07)
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
                Wilaya / الولاية *
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
                  Sélectionner une wilaya
                </option>
                {WILAYAS.map((w) => (
                  <option key={w.code} value={String(w.code)}>
                    {w.code} - {w.fr} / {w.ar}
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
                Commune / البلدية *
              </label>
              <input
                id="commune"
                type="text"
                required
                placeholder="Votre commune"
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
              className="flex w-full items-center justify-center gap-3 rounded-md bg-accent py-4 text-lg text-button-text font-semibold text-white shadow-lg transition-colors hover:bg-accent-dark disabled:opacity-80"
            >
              {status === "submitting" ? (
                <span className="material-symbols-outlined animate-spin">
                  progress_activity
                </span>
              ) : (
                <>
                  Confirmer ma commande {customization ? `(${price.toLocaleString("en-US")} DA)` : ""} / تأكيد الطلب
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1 text-center text-sm text-secondary">
            <span className="material-symbols-outlined text-sm">lock</span>
            Paiement sécurisé à la livraison. Vos données sont protégées.
          </div>
        </form>
      )}
    </div>
  );
}
