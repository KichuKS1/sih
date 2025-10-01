// Simple AES-GCM encryption helpers using Web Crypto
// Do NOT store plaintext user data. Use these helpers to encrypt/decrypt JSON strings with a password.

function strToBuf(str: string): ArrayBuffer {
  return new TextEncoder().encode(str);
}

function bufToStr(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    strToBuf(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey", "deriveBits"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJson<T>(data: T, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16)).buffer;
  const iv = crypto.getRandomValues(new Uint8Array(12)).buffer;
  const key = await deriveKey(password, salt);
  const plaintext = JSON.stringify(data);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, strToBuf(plaintext));
  return JSON.stringify({
    s: bufToBase64(salt),
    i: bufToBase64(iv),
    c: bufToBase64(ciphertext),
    v: 1,
  });
}

export async function decryptJson<T>(payload: string, password: string): Promise<T> {
  const { s, i, c } = JSON.parse(payload);
  const salt = base64ToBuf(s);
  const iv = base64ToBuf(i);
  const cipher = base64ToBuf(c);
  const key = await deriveKey(password, salt);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return JSON.parse(bufToStr(plainBuf)) as T;
}

export async function hashPassword(password: string, salt?: string): Promise<{ salt: string; hash: string }> {
  const saltBuf = salt ? base64ToBuf(salt) : crypto.getRandomValues(new Uint8Array(16)).buffer;
  const key = await deriveKey(password, saltBuf);
  const raw = await crypto.subtle.exportKey("raw", key);
  return { salt: bufToBase64(saltBuf), hash: bufToBase64(raw) };
}

export async function fingerprint(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", strToBuf(input));
  const full = bufToBase64(digest).replace(/[^a-zA-Z0-9]/g, "");
  return `anon_${full.slice(0, 16)}`; // short, URL-safe
}
