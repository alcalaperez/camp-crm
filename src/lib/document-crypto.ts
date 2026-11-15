import crypto from "crypto";

/**
 * Cifratura dei documenti d'identità a riposo (AES-256-GCM).
 *
 * I file su disco (e qualsiasi backup/snapshot) contengono solo testo cifrato.
 * La chiave vive nella variabile d'ambiente `DOCUMENT_ENCRYPTION_KEY`, separata
 * dal volume dei dati: rubare il disco o un backup senza la chiave non permette
 * di ricostruire i documenti.
 *
 * Formato dell'envelope binaria (versionata, per rotation futura della chiave):
 *   offset 0   4 byte   magic "CCLE"
 *   offset 4   1 byte   version (0x01)
 *   offset 5   1 byte   keyId   (0x01 per la chiave corrente)
 *   offset 6   12 byte  nonce casuale (univoco per file)
 *   offset 18  16 byte  GCM auth tag
 *   offset 34  ...      ciphertext
 */

const MAGIC = Buffer.from("CCLE", "ascii");
const VERSION = 0x01;
const CURRENT_KEY_ID = 0x01;

const HEADER_SIZE = MAGIC.length + 1 + 1; // magic + version + keyId = 6
const NONCE_SIZE = 12;
const TAG_SIZE = 16;
const META_SIZE = HEADER_SIZE + NONCE_SIZE + TAG_SIZE; // 34

/** Lunghezza attesa della chiave (AES-256). */
const KEY_BYTES = 32;

let _keyCache: { keyId: number; key: Buffer } | null = null;

/** Restituisce true se una chiave di cifratura è configurata. */
export const ENCRYPTION_ENABLED = (): boolean => !!process.env.DOCUMENT_ENCRYPTION_KEY;

/**
 * Carica e valida `DOCUMENT_ENCRYPTION_KEY`. La chiave è base64 e deve
 * decodificare in esattamente 32 byte. Il risultato è cacheato dopo il primo
 * utilizzo. Solleva un errore descrittivo se la chiave manca o non è valida.
 */
export function requireDocumentKey(): { keyId: number; key: Buffer } {
  if (_keyCache) return _keyCache;

  const raw = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "DOCUMENT_ENCRYPTION_KEY non impostata. Genera una chiave con " +
        "`openssl rand -base64 32` e configurala come variabile d'ambiente."
    );
  }

  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new Error("DOCUMENT_ENCRYPTION_KEY non è base64 valido.");
  }

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `DOCUMENT_ENCRYPTION_KEY non valida: deve essere ${KEY_BYTES} byte ` +
        `(usa \`openssl rand -base64 32\`), ne ha ${key.length}.`
    );
  }

  _keyCache = { keyId: CURRENT_KEY_ID, key };
  return _keyCache;
}

/**
 * True se il buffer inizia con il magic "CCLE" (file già cifrato).
 * Usato dalla migrazione e come salvaguardia contro doppie cifrature.
 */
export function isEncryptedEnvelope(buf: Buffer): boolean {
  return buf.length >= MAGIC.length && buf.subarray(0, MAGIC.length).equals(MAGIC);
}

/**
 * Cifra un documento (plaintext) producendo l'envelope binaria.
 * Usa un nonce casuale per file: AES-GCM con nonce univoco è sicuro.
 */
export function encryptDocument(plaintext: Buffer): Buffer {
  const { keyId, key } = requireDocumentKey();
  const nonce = crypto.randomBytes(NONCE_SIZE);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const header = Buffer.alloc(HEADER_SIZE);
  MAGIC.copy(header, 0);
  header.writeUInt8(VERSION, MAGIC.length);
  header.writeUInt8(keyId, MAGIC.length + 1);

  return Buffer.concat([header, nonce, tag, ciphertext]);
}

/**
 * Decifra un'envelope binaria producendo il plaintext originale.
 * Verifica l'auth tag GCM: se il file è stato manomesso, `decipher.final()`
 * solleva un errore di autenticazione.
 */
export function decryptDocument(envelope: Buffer): Buffer {
  if (!isEncryptedEnvelope(envelope)) {
    throw new Error("File non cifrato o envelope non riconosciuta (magic mancante).");
  }
  if (envelope.length < META_SIZE) {
    throw new Error("Envelope cifrata troppo corta: file corrotto o incompleto.");
  }

  const version = envelope.readUInt8(MAGIC.length);
  const keyId = envelope.readUInt8(MAGIC.length + 1);

  if (version !== VERSION) {
    throw new Error(`Versione envelope non supportata: ${version}.`);
  }

  const { keyId: currentKeyId, key } = requireDocumentKey();
  if (keyId !== currentKeyId) {
    throw new Error(
      `KeyId ${keyId} non corrisponde alla chiave configurata (${currentKeyId}). ` +
        "Configura la chiave corretta o implementa la rotation."
    );
  }

  const nonce = envelope.subarray(HEADER_SIZE, HEADER_SIZE + NONCE_SIZE);
  const tag = envelope.subarray(
    HEADER_SIZE + NONCE_SIZE,
    HEADER_SIZE + NONCE_SIZE + TAG_SIZE
  );
  const ciphertext = envelope.subarray(META_SIZE);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error(
      "Decifratura fallita: auth tag non valido (chiave errata o file manomesso)."
    );
  }
}
