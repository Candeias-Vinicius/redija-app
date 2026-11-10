// =====================================================================
// RedijaApp: Primitivas Criptográficas para Colaboração P2P (E2EE)
// Zero Infraestrutura Central — Chave Derivada do Segredo no Drive (.redija)
// =====================================================================

export interface EncryptedCollabEnvelope {
  v: 2;
  iv: string;
  ct: string;
}

export interface CollabRoomMaterial {
  /** Identificador ofuscado usado no PeerJS/BroadcastChannel (nunca expõe o driveFileId bruto). */
  roomToken: string;
  /** Additional Authenticated Data vinculada à sala (previne replay cross-room). */
  roomAad: Uint8Array<ArrayBuffer>;
  /** Chave AES-256-GCM usada para cifrar e autenticar cada payload P2P. */
  aesKey: CryptoKey;
}

const CHUNK_SIZE = 0x8000;

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE)));
  }
  return btoa(parts.join(''));
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  return uint8ArrayToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBufferBytes(text: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(text);
  const buffer = new ArrayBuffer(encoded.byteLength);
  const copy = new Uint8Array(buffer);
  copy.set(encoded);
  return copy;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Gera um segredo criptográfico aleatório de 256 bits em Base64URL para uma sala de projeto.
 */
export function generateCollabSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return uint8ArrayToBase64Url(bytes);
}

/**
 * Valida se uma string tem formato seguro para atuar como collabSecret.
 */
export function isValidCollabSecret(secret: unknown): secret is string {
  return (
    typeof secret === 'string' &&
    secret.length >= 16 &&
    secret.length <= 128 &&
    /^[a-zA-Z0-9_-]+$/.test(secret)
  );
}

/**
 * Deriva o token ofuscado da sala PeerJS e a chave simétrica AES-256-GCM
 * a partir de (driveFileId, collabSecret).
 */
export async function deriveCollabRoomMaterial(
  driveFileId: string,
  collabSecret: string,
): Promise<CollabRoomMaterial> {
  if (!driveFileId || !collabSecret) {
    throw new Error('driveFileId e collabSecret são obrigatórios para derivar a chave P2P.');
  }

  const roomDigest = await crypto.subtle.digest(
    'SHA-256',
    toArrayBufferBytes(`redija:room:v2:${driveFileId}:${collabSecret}`),
  );
  const roomToken = bytesToHex(new Uint8Array(roomDigest).subarray(0, 12)); // 24 hex chars (96 bits)

  const keyDigest = await crypto.subtle.digest(
    'SHA-256',
    toArrayBufferBytes(`redija:e2ee:v2:${driveFileId}:${collabSecret}`),
  );

  const aesKey = await crypto.subtle.importKey(
    'raw',
    keyDigest,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  return {
    roomToken,
    roomAad: toArrayBufferBytes(`redija:aad:v2:${roomToken}`),
    aesKey,
  };
}

/**
 * Cifra um payload serializado com AES-256-GCM + IV aleatório de 96 bits + AAD da sala.
 */
export async function encryptCollabPayload(
  payload: unknown,
  material: CollabRoomMaterial,
): Promise<EncryptedCollabEnvelope> {
  const ivBuffer = new ArrayBuffer(12);
  const iv = new Uint8Array(ivBuffer);
  crypto.getRandomValues(iv);

  const plaintext = toArrayBufferBytes(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: material.roomAad,
      tagLength: 128,
    },
    material.aesKey,
    plaintext,
  );

  return {
    v: 2,
    iv: uint8ArrayToBase64(iv),
    ct: uint8ArrayToBase64(new Uint8Array(ciphertext)),
  };
}

/**
 * Verifica se um objeto recebido na rede tem formato de envelope criptografado v2.
 */
export function isEncryptedCollabEnvelope(raw: unknown): raw is EncryptedCollabEnvelope {
  if (!raw || typeof raw !== 'object') return false;
  const candidate = raw as Record<string, unknown>;
  return (
    candidate.v === 2 &&
    typeof candidate.iv === 'string' &&
    candidate.iv.length >= 12 &&
    candidate.iv.length <= 64 &&
    typeof candidate.ct === 'string' &&
    candidate.ct.length > 0 &&
    candidate.ct.length <= 16_000_000
  );
}

/**
 * Decifra e autentica um envelope AES-256-GCM.
 * Retorna `null` se a assinatura/tag GCM for inválida ou pertencer a outra sala.
 */
export async function decryptCollabPayload(
  rawEnvelope: unknown,
  material: CollabRoomMaterial,
): Promise<unknown | null> {
  let envelopeInput = rawEnvelope;
  if (typeof envelopeInput === 'string') {
    try {
      envelopeInput = JSON.parse(envelopeInput);
    } catch {
      return null;
    }
  }

  if (!isEncryptedCollabEnvelope(envelopeInput)) {
    return null;
  }

  try {
    const iv = base64ToUint8Array(envelopeInput.iv);
    if (iv.byteLength !== 12) return null;
    const ct = base64ToUint8Array(envelopeInput.ct);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: material.roomAad,
        tagLength: 128,
      },
      material.aesKey,
      ct,
    );
    const jsonText = new TextDecoder().decode(decrypted);
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}
