import { describe, it, expect } from 'vitest';
import {
  decryptCollabPayload,
  deriveCollabRoomMaterial,
  encryptCollabPayload,
  generateCollabSecret,
  isEncryptedCollabEnvelope,
  isValidCollabSecret,
} from '../collabCrypto';

describe('collabCrypto (Segurança E2EE da Sala P2P)', () => {
  it('gera segredos criptográficos de 256 bits em base64url válidos e únicos', () => {
    const s1 = generateCollabSecret();
    const s2 = generateCollabSecret();

    expect(isValidCollabSecret(s1)).toBe(true);
    expect(isValidCollabSecret(s2)).toBe(true);
    expect(s1).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(s1).not.toBe(s2);

    expect(isValidCollabSecret('')).toBe(false);
    expect(isValidCollabSecret('curto')).toBe(false);
    expect(isValidCollabSecret('a'.repeat(43) + '!')).toBe(false);
    expect(isValidCollabSecret(null)).toBe(false);
  });

  it('deriva roomToken ofuscado e determinístico sem expor o driveFileId', async () => {
    const secret = generateCollabSecret();
    const m1 = await deriveCollabRoomMaterial('1AbCdefGhiJkLmNoPqRsTuVwXyZ_12345', secret);
    const m2 = await deriveCollabRoomMaterial('1AbCdefGhiJkLmNoPqRsTuVwXyZ_12345', secret);
    const mOtherFile = await deriveCollabRoomMaterial('9ZyXwVuTsRqPoNmLkJiHgFeDcBa_98765', secret);
    const mOtherSecret = await deriveCollabRoomMaterial(
      '1AbCdefGhiJkLmNoPqRsTuVwXyZ_12345',
      generateCollabSecret(),
    );

    expect(m1.roomToken).toMatch(/^[a-f0-9]{24}$/);
    expect(m1.roomToken).toBe(m2.roomToken);
    expect(m1.roomToken).not.toContain('1AbCdefGhi');
    expect(m1.roomToken).not.toBe(mOtherFile.roomToken);
    expect(m1.roomToken).not.toBe(mOtherSecret.roomToken);
  });

  it('cifra e decifra payloads com AES-256-GCM e rejeita adulteração ou chave errada', async () => {
    const secret = generateCollabSecret();
    const wrongSecret = generateCollabSecret();
    const roomA = await deriveCollabRoomMaterial('file_alpha', secret);
    const roomWrongSecret = await deriveCollabRoomMaterial('file_alpha', wrongSecret);
    const roomWrongFile = await deriveCollabRoomMaterial('file_beta', secret);

    const payload = {
      type: 'block_update',
      blockId: 'blk_1',
      content: '<p>Texto científico com acentuação: ação, reação e citação ABNT.</p>',
      updatedAt: 1731100000000,
    };

    const envelope1 = await encryptCollabPayload(payload, roomA);
    const envelope2 = await encryptCollabPayload(payload, roomA);

    expect(isEncryptedCollabEnvelope(envelope1)).toBe(true);
    expect(envelope1.v).toBe(2);
    expect(envelope1.iv).not.toBe(envelope2.iv); // IV aleatório por mensagem
    expect(envelope1.ct).not.toContain('ação');

    const decrypted = await decryptCollabPayload(envelope1, roomA);
    expect(decrypted).toEqual(payload);

    // Chave errada ou fileId errado -> fail-closed (null)
    expect(await decryptCollabPayload(envelope1, roomWrongSecret)).toBeNull();
    expect(await decryptCollabPayload(envelope1, roomWrongFile)).toBeNull();

    // Adulteração de ciphertext ou IV -> falha autenticação GCM (null)
    const tamperedCipher = {
      ...envelope1,
      ct: `${envelope1.ct.slice(0, -4)}AAAA`,
    };
    expect(await decryptCollabPayload(tamperedCipher, roomA)).toBeNull();

    const tamperedIv = {
      ...envelope1,
      iv: envelope2.iv,
    };
    expect(await decryptCollabPayload(tamperedIv, roomA)).toBeNull();

    // Mensagem em texto claro não cifrada -> rejeitada
    expect(await decryptCollabPayload(payload, roomA)).toBeNull();
    expect(await decryptCollabPayload(JSON.stringify(payload), roomA)).toBeNull();
  });
});
