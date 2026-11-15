/**
 * Versione corrente dell'informativa privacy. Fonte unica di verità,
 * referenziata sia dalla pagina /privacy sia dal salvataggio del consenso.
 * Incrementala ogni volta che l'informativa cambia in modo sostanziale.
 */
export const CURRENT_PRIVACY_POLICY_VERSION = "1.0";

/**
 * Periodo di conservazione dei dati (in mesi). Letto da RETENTION_MONTHS,
 * default 24. Usato dalla pagina privacy e dallo script di purge.
 */
export function retentionMonths(): number {
  const raw = Number.parseInt(process.env.RETENTION_MONTHS ?? "24", 10);
  if (!Number.isFinite(raw) || raw <= 0) return 24;
  return raw;
}

/** Identità del titolare del trattamento (da env, con fallback). */
export function dataControllerName(): string {
  return process.env.DATA_CONTROLLER_NAME?.trim() || "[inserire il titolare del trattamento]";
}

/** Contatto del titolare (da env, con fallback). */
export function dataControllerEmail(): string {
  return process.env.DATA_CONTROLLER_EMAIL?.trim() || "[inserire email di contatto]";
}
