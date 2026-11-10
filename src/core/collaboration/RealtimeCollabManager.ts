// =====================================================================
// RedijaApp: Motor de Colaboração em Tempo Real P2P (WebRTC + BroadcastChannel)
// Endurecido com Sala SHA-256 Ofuscada, E2EE AES-256-GCM e Reconexão Automática
// =====================================================================

import { AcademicReference, Block, DocumentMetadata, ShareRole } from '@/types/document';
import { GoogleUserProfile } from '@/core/auth/GoogleAuthContext';
import { Peer, DataConnection } from 'peerjs';
import {
  CollabRoomMaterial,
  decryptCollabPayload,
  deriveCollabRoomMaterial,
  encryptCollabPayload,
  isValidCollabSecret,
} from './collabCrypto';

export interface CollabUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export interface CollaboratorPresence {
  peerId: string;
  user: CollabUser;
  role?: ShareRole;
  activeBlockId?: string;
  colorIndex: number;
  lastSeen: number;
}

export type CollabConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected_local'
  | 'connected_p2p'
  | 'fallback_drive';

export interface CollabProjectSnapshot {
  blocks: Block[];
  deletedBlockTimestamps?: Record<string, number>;
  blocksOrderUpdatedAt?: number;
  metadata?: DocumentMetadata;
  metadataUpdatedAt?: number;
  references?: AcademicReference[];
  referencesUpdatedAt?: number;
}

export interface CollabConnectOptions {
  collabSecret?: string;
  role?: ShareRole;
  allowedEmails?: string[];
  allowAnyone?: boolean;
  getLatestSnapshot?: () => CollabProjectSnapshot | null;
}

export type CollabMessage =
  | { type: 'presence'; presence: CollaboratorPresence }
  | {
      type: 'block_update';
      blockId: string;
      content: string;
      updatedAt?: number;
      meta?: Block['meta'];
      senderPeerId: string;
    }
  | {
      type: 'blocks_sync';
      blocks: Block[];
      deletedBlockTimestamps?: Record<string, number>;
      blocksOrderUpdatedAt?: number;
      senderPeerId: string;
    }
  | {
      type: 'metadata_update';
      metadata: DocumentMetadata;
      metadataUpdatedAt: number;
      senderPeerId: string;
    }
  | {
      type: 'references_update';
      references: AcademicReference[];
      referencesUpdatedAt: number;
      senderPeerId: string;
    }
  | {
      type: 'project_sync';
      blocks: Block[];
      deletedBlockTimestamps?: Record<string, number>;
      blocksOrderUpdatedAt?: number;
      metadata?: DocumentMetadata;
      metadataUpdatedAt?: number;
      references?: AcademicReference[];
      referencesUpdatedAt?: number;
      senderPeerId: string;
    }
  | { type: 'peer_leave'; peerId: string };

export type RemoteBlockUpdateHandler = (update: {
  blockId: string;
  content: string;
  updatedAt?: number;
  meta?: Block['meta'];
}) => void;
export type RemoteBlocksSyncHandler = (payload: {
  blocks: Block[];
  deletedBlockTimestamps?: Record<string, number>;
  blocksOrderUpdatedAt?: number;
}) => void;
export type RemoteMetadataUpdateHandler = (payload: {
  metadata: DocumentMetadata;
  metadataUpdatedAt: number;
}) => void;
export type RemoteReferencesUpdateHandler = (payload: {
  references: AcademicReference[];
  referencesUpdatedAt: number;
}) => void;
export type RemoteProjectSyncHandler = (snapshot: CollabProjectSnapshot) => void;
export type PresenceChangeHandler = (presences: CollaboratorPresence[]) => void;
export type StatusChangeHandler = (status: CollabConnectionStatus) => void;

const COLLAB_COLORS_COUNT = 5;
const HEARTBEAT_INTERVAL_MS = 4000;
const RECONCILE_INTERVAL_MS = 9000;
const PEER_TIMEOUT_MS = 14000;
const CONNECT_ATTEMPT_TIMEOUT_MS = 8000;
const MAX_SLOTS = 8;
const MAX_BLOCK_CONTENT_CHARS = 500_000;
const MAX_BLOCKS_PER_SYNC = 2500;
const MAX_BLOCK_META_JSON_CHARS = 8_000_000;

const VALID_SHARE_ROLES = new Set<ShareRole>(['owner', 'writer', 'commenter', 'reader']);

/**
 * Monta lista de servidores ICE (STUN + TURN opcional via env vars) para atravessar NATs simétricos.
 */
export function buildIceServersConfig(
  env: Record<string, unknown> = import.meta.env as Record<string, unknown>,
): RTCIceServer[] {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ];

  const turnUrl = typeof env.VITE_TURN_URL === 'string' ? env.VITE_TURN_URL.trim() : '';
  if (turnUrl && /^(turns?:)/i.test(turnUrl)) {
    const turnUser = typeof env.VITE_TURN_USERNAME === 'string' ? env.VITE_TURN_USERNAME : undefined;
    const turnCred =
      typeof env.VITE_TURN_CREDENTIAL === 'string' ? env.VITE_TURN_CREDENTIAL : undefined;
    iceServers.push({
      urls: turnUrl,
      ...(turnUser ? { username: turnUser } : {}),
      ...(turnCred ? { credential: turnCred } : {}),
    });
  }

  const rawJson =
    typeof env.VITE_ICE_SERVERS_JSON === 'string' ? env.VITE_ICE_SERVERS_JSON.trim() : '';
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (
            item &&
            typeof item === 'object' &&
            (typeof item.urls === 'string' || Array.isArray(item.urls))
          ) {
            iceServers.push(item as RTCIceServer);
          }
        }
      }
    } catch {
      console.warn('VITE_ICE_SERVERS_JSON inválido; ignorando servidores ICE customizados.');
    }
  }

  return iceServers;
}

function sanitizePlainObject(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    out[key] = (raw as Record<string, unknown>)[key];
  }
  return out;
}

function sanitizeTombstones(raw: unknown): Record<string, number> | undefined {
  const obj = sanitizePlainObject(raw);
  if (!obj) return undefined;
  const entries: [string, number][] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k.length <= 128 && typeof v === 'number' && Number.isFinite(v) && v > 0) {
      entries.push([k, v]);
    }
  }
  if (entries.length === 0) return undefined;
  entries.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(entries.slice(0, 500));
}

function sanitizeBlocks(rawBlocks: unknown): Block[] | null {
  if (!Array.isArray(rawBlocks) || rawBlocks.length > MAX_BLOCKS_PER_SYNC) return null;
  const validBlocks: Block[] = [];
  for (const b of rawBlocks) {
    if (!b || typeof b !== 'object') continue;
    const rec = b as Record<string, unknown>;
    if (typeof rec.id !== 'string' || !rec.id || rec.id.length > 128) continue;
    if (typeof rec.type !== 'string' || rec.type.length > 64) continue;
    if (typeof rec.content !== 'string' || rec.content.length > MAX_BLOCK_CONTENT_CHARS) continue;

    let safeMeta: Block['meta'] = undefined;
    if (rec.meta !== undefined) {
      const cleaned = sanitizePlainObject(rec.meta);
      if (cleaned) {
        try {
          if (JSON.stringify(cleaned).length <= MAX_BLOCK_META_JSON_CHARS) {
            safeMeta = cleaned as Block['meta'];
          }
        } catch {
          // Ignora meta não serializável
        }
      }
    }

    validBlocks.push({
      id: rec.id,
      type: rec.type as Block['type'],
      content: rec.content,
      updatedAt:
        typeof rec.updatedAt === 'number' && Number.isFinite(rec.updatedAt)
          ? rec.updatedAt
          : undefined,
      ...(safeMeta ? { meta: safeMeta } : {}),
    });
  }
  return validBlocks;
}

export class RealtimeCollabManager {
  private driveFileId: string | null = null;
  private collabSecret: string | null = null;
  private roomMaterial: CollabRoomMaterial | null = null;
  private connectionGeneration = 0;

  private currentUser: CollabUser | null = null;
  private currentRole: ShareRole = 'owner';
  private allowedEmails: Set<string> | null = null;
  private allowAnyone = false;
  private getLatestSnapshot: (() => CollabProjectSnapshot | null) | null = null;

  private myPeerId: string = '';
  private mySlotIndex: number | null = null;
  private previousPeerIds: Set<string> = new Set();
  private myColorIndex: number = 0;
  private currentActiveBlockId?: string;

  private broadcastChannel: BroadcastChannel | null = null;
  private peer: Peer | null = null;
  private peerConnections: Map<string, DataConnection> = new Map();
  private connectingPeers: Map<string, number> = new Map();
  private remotePresences: Map<string, CollaboratorPresence> = new Map();

  private connectionStatus: CollabConnectionStatus = 'idle';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconcileTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private unloadHandler: (() => void) | null = null;

  private sendQueue: Promise<void> = Promise.resolve();
  private isDestroyed = false;

  private onRemoteBlockUpdateHandlers: Set<RemoteBlockUpdateHandler> = new Set();
  private onRemoteBlocksSyncHandlers: Set<RemoteBlocksSyncHandler> = new Set();
  private onRemoteMetadataUpdateHandlers: Set<RemoteMetadataUpdateHandler> = new Set();
  private onRemoteReferencesUpdateHandlers: Set<RemoteReferencesUpdateHandler> = new Set();
  private onRemoteProjectSyncHandlers: Set<RemoteProjectSyncHandler> = new Set();
  private onPresenceChangeHandlers: Set<PresenceChangeHandler> = new Set();
  private onStatusChangeHandlers: Set<StatusChangeHandler> = new Set();

  /**
   * Conecta à sala de colaboração E2EE derivada de `(driveFileId, collabSecret)`.
   * Fail-closed: sem `collabSecret` válido, não abre canais P2P em texto claro.
   */
  public connect(
    driveFileId: string,
    user: GoogleUserProfile,
    options?: CollabConnectOptions,
  ): void {
    const incomingSecret = isValidCollabSecret(options?.collabSecret) ? options.collabSecret : null;
    const nextRole = options?.role ?? 'owner';

    // Reaproveita conexão existente se sala, segredo e usuário não mudaram
    if (
      !this.isDestroyed &&
      this.driveFileId === driveFileId &&
      this.collabSecret === incomingSecret &&
      this.currentUser?.id === user.id
    ) {
      this.updatePermissions({
        role: nextRole,
        allowedEmails: options?.allowedEmails,
        allowAnyone: options?.allowAnyone,
      });
      if (options?.getLatestSnapshot) {
        this.getLatestSnapshot = options.getLatestSnapshot;
      }
      return;
    }

    this.disconnect();
    this.isDestroyed = false;
    this.driveFileId = driveFileId;
    this.collabSecret = incomingSecret;
    this.currentRole = nextRole;
    this.getLatestSnapshot = options?.getLatestSnapshot ?? null;
    this.currentUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
    };

    this.applyAllowedEmails(options?.allowedEmails, options?.allowAnyone);

    this.myColorIndex = Math.abs(
      user.email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % COLLAB_COLORS_COUNT,
    );

    if (!incomingSecret) {
      // Sem segredo criptográfico não entra em sala insegura; opera via Drive fallback até sincronizar
      this.setStatus('fallback_drive');
      return;
    }

    this.setStatus('connecting');
    const generation = ++this.connectionGeneration;

    deriveCollabRoomMaterial(driveFileId, incomingSecret)
      .then((material) => {
        if (this.isDestroyed || generation !== this.connectionGeneration) return;
        this.roomMaterial = material;
        this.myPeerId = `local_${material.roomToken}_${Math.random().toString(36).slice(2, 8)}`;
        this.previousPeerIds.clear();
        this.previousPeerIds.add(this.myPeerId);

        this.attachUnloadListener();
        this.initBroadcastChannel(material.roomToken);
        this.initPeerJS(material.roomToken, generation);
        this.startHeartbeat();
        this.startReconciliation(material.roomToken);
        this.recomputeStatus();
      })
      .catch((err) => {
        console.warn('Falha ao inicializar criptografia P2P:', err);
        if (!this.isDestroyed && generation === this.connectionGeneration) {
          this.setStatus('fallback_drive');
        }
      });
  }

  /**
   * Atualiza permissões e lista branca de colaboradores em tempo real sem derrubar a sala.
   */
  public updatePermissions(options: {
    role?: ShareRole;
    allowedEmails?: string[];
    allowAnyone?: boolean;
  }): void {
    if (options.role && VALID_SHARE_ROLES.has(options.role)) {
      this.currentRole = options.role;
    }
    if (options.allowedEmails !== undefined || options.allowAnyone !== undefined) {
      this.applyAllowedEmails(options.allowedEmails, options.allowAnyone);
      this.pruneUnauthorizedPresences();
    }
  }

  /**
   * Desconecta de todos os canais, destrói PeerJS e zera estado da sala.
   */
  public disconnect(): void {
    this.isDestroyed = true;
    this.connectionGeneration++;
    this.detachUnloadListener();

    if (this.myPeerId && this.roomMaterial) {
      this.sendEncryptedSyncBestEffort({
        type: 'peer_leave',
        peerId: this.myPeerId,
      });
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
      this.reconcileTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // Ignora
      }
      this.broadcastChannel = null;
    }

    this.peerConnections.forEach((conn) => {
      try {
        conn.close();
      } catch {
        // Ignora
      }
    });
    this.peerConnections.clear();
    this.connectingPeers.clear();

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Ignora
      }
      this.peer = null;
    }

    this.remotePresences.clear();
    this.previousPeerIds.clear();
    this.mySlotIndex = null;
    this.myPeerId = '';
    this.driveFileId = null;
    this.collabSecret = null;
    this.roomMaterial = null;
    this.allowedEmails = null;
    this.allowAnyone = false;
    this.reconnectAttempts = 0;

    this.notifyPresenceChange();
    this.setStatus('idle');
  }

  /**
   * Verifica se o papel atual do usuário local permite enviar mutações.
   */
  private canLocalUserMutate(): boolean {
    return this.currentRole === 'owner' || this.currentRole === 'writer';
  }

  public broadcastBlockUpdate(
    blockId: string,
    content: string,
    meta?: Block['meta'],
    updatedAt?: number,
  ): void {
    if (!this.canLocalUserMutate()) return;
    this.broadcast({
      type: 'block_update',
      blockId,
      content,
      updatedAt: updatedAt ?? Date.now(),
      meta,
      senderPeerId: this.myPeerId,
    });
  }

  public broadcastBlocksSync(
    blocks: Block[],
    deletedBlockTimestamps?: Record<string, number>,
    blocksOrderUpdatedAt?: number,
  ): void {
    if (!this.canLocalUserMutate()) return;
    this.broadcast({
      type: 'blocks_sync',
      blocks,
      deletedBlockTimestamps,
      blocksOrderUpdatedAt,
      senderPeerId: this.myPeerId,
    });
  }

  public broadcastMetadataUpdate(metadata: DocumentMetadata, metadataUpdatedAt: number): void {
    if (!this.canLocalUserMutate()) return;
    this.broadcast({
      type: 'metadata_update',
      metadata,
      metadataUpdatedAt,
      senderPeerId: this.myPeerId,
    });
  }

  public broadcastReferencesUpdate(
    references: AcademicReference[],
    referencesUpdatedAt: number,
  ): void {
    if (!this.canLocalUserMutate()) return;
    this.broadcast({
      type: 'references_update',
      references,
      referencesUpdatedAt,
      senderPeerId: this.myPeerId,
    });
  }

  public broadcastCursor(activeBlockId?: string): void {
    if (this.currentActiveBlockId === activeBlockId) return;
    this.currentActiveBlockId = activeBlockId;
    this.sendPresence();
  }

  // ==========================================================================
  // INSCRIÇÃO DE EVENTOS
  // ==========================================================================

  public onRemoteBlockUpdate(handler: RemoteBlockUpdateHandler): () => void {
    this.onRemoteBlockUpdateHandlers.add(handler);
    return () => this.onRemoteBlockUpdateHandlers.delete(handler);
  }

  public onRemoteBlocksSync(handler: RemoteBlocksSyncHandler): () => void {
    this.onRemoteBlocksSyncHandlers.add(handler);
    return () => this.onRemoteBlocksSyncHandlers.delete(handler);
  }

  public onRemoteMetadataUpdate(handler: RemoteMetadataUpdateHandler): () => void {
    this.onRemoteMetadataUpdateHandlers.add(handler);
    return () => this.onRemoteMetadataUpdateHandlers.delete(handler);
  }

  public onRemoteReferencesUpdate(handler: RemoteReferencesUpdateHandler): () => void {
    this.onRemoteReferencesUpdateHandlers.add(handler);
    return () => this.onRemoteReferencesUpdateHandlers.delete(handler);
  }

  public onRemoteProjectSync(handler: RemoteProjectSyncHandler): () => void {
    this.onRemoteProjectSyncHandlers.add(handler);
    return () => this.onRemoteProjectSyncHandlers.delete(handler);
  }

  public onPresenceChange(handler: PresenceChangeHandler): () => void {
    this.onPresenceChangeHandlers.add(handler);
    return () => this.onPresenceChangeHandlers.delete(handler);
  }

  public onStatusChange(handler: StatusChangeHandler): () => void {
    this.onStatusChangeHandlers.add(handler);
    return () => this.onStatusChangeHandlers.delete(handler);
  }

  public getActivePresences(): CollaboratorPresence[] {
    return Array.from(this.remotePresences.values());
  }

  public getConnectionStatus(): CollabConnectionStatus {
    return this.connectionStatus;
  }

  public getOpenWebRtcPeersCount(): number {
    let count = 0;
    this.peerConnections.forEach((conn) => {
      if (conn.open) count++;
    });
    return count;
  }

  // ==========================================================================
  // RECEPÇÃO E VALIDAÇÃO (E2EE + AUTENTICAÇÃO DE SALA)
  // ==========================================================================

  /**
   * Processa pacote bruto vindo da rede (WebRTC ou BroadcastChannel).
   * Fail-closed: exige descriptografia AES-256-GCM válida com a chave da sala.
   */
  public async handleRawWireMessage(rawWire: unknown): Promise<void> {
    if (!this.roomMaterial || this.isDestroyed) return;
    const decrypted = await decryptCollabPayload(rawWire, this.roomMaterial);
    if (!decrypted) {
      // Envelope inválido, texto claro não autorizado ou tag GCM adulterada: descarta
      return;
    }
    this.handleIncomingMessage(decrypted);
  }

  private applyAllowedEmails(allowedEmails?: string[], allowAnyone?: boolean): void {
    this.allowAnyone = Boolean(allowAnyone);
    if (!allowedEmails || allowedEmails.length === 0) {
      return;
    }
    const normalized = allowedEmails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes('@'));
    if (this.currentUser?.email) {
      normalized.push(this.currentUser.email.trim().toLowerCase());
    }
    this.allowedEmails = new Set(normalized);
  }

  private isEmailAuthorized(email?: string): boolean {
    if (!this.allowedEmails || this.allowAnyone) return true;
    if (!email) return false;
    return this.allowedEmails.has(email.trim().toLowerCase());
  }

  private pruneUnauthorizedPresences(): void {
    if (!this.allowedEmails || this.allowAnyone) return;
    let changed = false;
    this.remotePresences.forEach((presence, peerId) => {
      if (!this.isEmailAuthorized(presence.user.email)) {
        this.remotePresences.delete(peerId);
        changed = true;
      }
    });
    if (changed) {
      this.notifyPresenceChange();
    }
  }

  private isSenderPermittedToMutate(senderPeerId: string): boolean {
    if (!senderPeerId || senderPeerId === this.myPeerId || this.previousPeerIds.has(senderPeerId)) {
      return false;
    }
    const senderPresence = this.remotePresences.get(senderPeerId);
    if (!senderPresence) {
      return true;
    }
    if (!this.isEmailAuthorized(senderPresence.user.email)) {
      return false;
    }
    if (senderPresence.role === 'reader' || senderPresence.role === 'commenter') {
      return false;
    }
    return true;
  }

  private handleIncomingMessage(raw: unknown): void {
    let msg: CollabMessage;
    if (typeof raw === 'string') {
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
    } else if (raw && typeof raw === 'object') {
      msg = raw as CollabMessage;
    } else {
      return;
    }

    if (!msg || typeof msg !== 'object' || !msg.type || typeof msg.type !== 'string') return;

    switch (msg.type) {
      case 'presence': {
        const p = msg.presence;
        if (!p || typeof p !== 'object' || typeof p.peerId !== 'string' || p.peerId.length > 128) return;
        if (!p.user || typeof p.user !== 'object' || typeof p.user.id !== 'string' || typeof p.user.name !== 'string') return;
        if (typeof p.colorIndex !== 'number' || !Number.isFinite(p.colorIndex)) return;
        if (p.activeBlockId !== undefined && (typeof p.activeBlockId !== 'string' || p.activeBlockId.length > 128)) return;
        if (p.peerId === this.myPeerId || this.previousPeerIds.has(p.peerId)) return;

        const emailStr = String(p.user.email || '').slice(0, 128);
        if (!this.isEmailAuthorized(emailStr)) {
          return;
        }

        const role = p.role && VALID_SHARE_ROLES.has(p.role) ? p.role : undefined;
        const wasKnown = this.remotePresences.has(p.peerId);

        this.remotePresences.set(p.peerId, {
          peerId: p.peerId,
          user: {
            id: String(p.user.id).slice(0, 128),
            name: String(p.user.name).slice(0, 128),
            email: emailStr,
            picture:
              typeof p.user.picture === 'string' && /^https?:\/\//i.test(p.user.picture)
                ? p.user.picture
                : undefined,
          },
          ...(role ? { role } : {}),
          activeBlockId: p.activeBlockId ? String(p.activeBlockId).slice(0, 128) : undefined,
          colorIndex: Math.abs(Math.floor(p.colorIndex)) % COLLAB_COLORS_COUNT,
          lastSeen: Date.now(),
        });

        this.notifyPresenceChange();
        this.recomputeStatus();

        // Quando um novo par surge via BroadcastChannel (mesmo navegador), envia snapshot inicial uma vez
        if (!wasKnown && p.peerId.startsWith('local_') && this.canLocalUserMutate()) {
          this.sendProjectSnapshot();
        }
        break;
      }

      case 'block_update': {
        if (typeof msg.senderPeerId !== 'string' || !this.isSenderPermittedToMutate(msg.senderPeerId)) {
          return;
        }
        if (typeof msg.blockId !== 'string' || !msg.blockId || msg.blockId.length > 128) return;
        if (typeof msg.content !== 'string' || msg.content.length > MAX_BLOCK_CONTENT_CHARS) return;

        let safeMeta: Block['meta'] | undefined = undefined;
        if (msg.meta !== undefined) {
          const cleaned = sanitizePlainObject(msg.meta);
          if (cleaned) {
            try {
              if (JSON.stringify(cleaned).length <= MAX_BLOCK_META_JSON_CHARS) {
                safeMeta = cleaned as Block['meta'];
              }
            } catch {
              return;
            }
          }
        }

        const updatedAt =
          typeof msg.updatedAt === 'number' && Number.isFinite(msg.updatedAt)
            ? msg.updatedAt
            : undefined;

        this.onRemoteBlockUpdateHandlers.forEach((h) =>
          h({
            blockId: msg.blockId,
            content: msg.content,
            ...(updatedAt !== undefined ? { updatedAt } : {}),
            meta: safeMeta,
          }),
        );
        break;
      }

      case 'blocks_sync': {
        if (typeof msg.senderPeerId !== 'string' || !this.isSenderPermittedToMutate(msg.senderPeerId)) {
          return;
        }
        const validBlocks = sanitizeBlocks(msg.blocks);
        if (!validBlocks || validBlocks.length === 0) return;

        const deletedBlockTimestamps = sanitizeTombstones(msg.deletedBlockTimestamps);
        const blocksOrderUpdatedAt =
          typeof msg.blocksOrderUpdatedAt === 'number' && Number.isFinite(msg.blocksOrderUpdatedAt)
            ? msg.blocksOrderUpdatedAt
            : undefined;

        this.onRemoteBlocksSyncHandlers.forEach((h) =>
          h({
            blocks: validBlocks,
            ...(deletedBlockTimestamps ? { deletedBlockTimestamps } : {}),
            ...(blocksOrderUpdatedAt !== undefined ? { blocksOrderUpdatedAt } : {}),
          }),
        );
        break;
      }

      case 'metadata_update': {
        if (typeof msg.senderPeerId !== 'string' || !this.isSenderPermittedToMutate(msg.senderPeerId)) {
          return;
        }
        const cleanMeta = sanitizePlainObject(msg.metadata);
        if (!cleanMeta || typeof msg.metadataUpdatedAt !== 'number' || !Number.isFinite(msg.metadataUpdatedAt)) {
          return;
        }
        this.onRemoteMetadataUpdateHandlers.forEach((h) =>
          h({
            metadata: cleanMeta as unknown as DocumentMetadata,
            metadataUpdatedAt: msg.metadataUpdatedAt,
          }),
        );
        break;
      }

      case 'references_update': {
        if (typeof msg.senderPeerId !== 'string' || !this.isSenderPermittedToMutate(msg.senderPeerId)) {
          return;
        }
        if (
          !Array.isArray(msg.references) ||
          msg.references.length > 2000 ||
          typeof msg.referencesUpdatedAt !== 'number' ||
          !Number.isFinite(msg.referencesUpdatedAt)
        ) {
          return;
        }
        const validRefs = msg.references.filter(
          (r): r is AcademicReference =>
            Boolean(r && typeof r === 'object' && typeof r.id === 'string' && r.id.length <= 128),
        );
        this.onRemoteReferencesUpdateHandlers.forEach((h) =>
          h({
            references: validRefs,
            referencesUpdatedAt: msg.referencesUpdatedAt,
          }),
        );
        break;
      }

      case 'project_sync': {
        if (typeof msg.senderPeerId !== 'string' || !this.isSenderPermittedToMutate(msg.senderPeerId)) {
          return;
        }
        const validBlocks = sanitizeBlocks(msg.blocks);
        if (!validBlocks || validBlocks.length === 0) return;

        const cleanMeta = msg.metadata ? sanitizePlainObject(msg.metadata) : undefined;
        const validRefs = Array.isArray(msg.references)
          ? msg.references.filter(
              (r): r is AcademicReference =>
                Boolean(r && typeof r === 'object' && typeof r.id === 'string' && r.id.length <= 128),
            )
          : undefined;

        const snapshot: CollabProjectSnapshot = {
          blocks: validBlocks,
          deletedBlockTimestamps: sanitizeTombstones(msg.deletedBlockTimestamps),
          blocksOrderUpdatedAt:
            typeof msg.blocksOrderUpdatedAt === 'number' && Number.isFinite(msg.blocksOrderUpdatedAt)
              ? msg.blocksOrderUpdatedAt
              : undefined,
          ...(cleanMeta ? { metadata: cleanMeta as unknown as DocumentMetadata } : {}),
          metadataUpdatedAt:
            typeof msg.metadataUpdatedAt === 'number' && Number.isFinite(msg.metadataUpdatedAt)
              ? msg.metadataUpdatedAt
              : undefined,
          ...(validRefs ? { references: validRefs } : {}),
          referencesUpdatedAt:
            typeof msg.referencesUpdatedAt === 'number' && Number.isFinite(msg.referencesUpdatedAt)
              ? msg.referencesUpdatedAt
              : undefined,
        };

        this.onRemoteProjectSyncHandlers.forEach((h) => h(snapshot));
        break;
      }

      case 'peer_leave': {
        if (typeof msg.peerId !== 'string' || msg.peerId.length > 128) return;
        this.remotePresences.delete(msg.peerId);
        this.notifyPresenceChange();
        this.recomputeStatus();
        break;
      }
    }
  }

  // ==========================================================================
  // CANAIS DE TRANSPORTE (BROADCASTCHANNEL + WEBRTC MESH)
  // ==========================================================================

  private initBroadcastChannel(roomToken: string): void {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      this.broadcastChannel = new BroadcastChannel(`redija_e2ee_${roomToken}`);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data) {
          void this.handleRawWireMessage(event.data);
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel não disponível:', err);
    }
  }

  private initPeerJS(roomToken: string, generation: number): void {
    if (typeof window === 'undefined') return;
    this.reconnectAttempts = 0;
    this.connectPeerSlot(roomToken, 0, generation);
  }

  private connectPeerSlot(roomToken: string, slotIndex: number, generation: number): void {
    if (this.isDestroyed || generation !== this.connectionGeneration) return;

    const isEphemeral = slotIndex >= MAX_SLOTS;
    const slotPeerId = isEphemeral
      ? `rja_${roomToken}_u_${Math.random().toString(36).slice(2, 8)}`
      : `rja_${roomToken}_s${slotIndex}`;

    try {
      const p = new Peer(slotPeerId, {
        debug: 0,
        config: {
          iceServers: buildIceServersConfig(),
        },
      });

      p.on('open', (id) => {
        if (this.isDestroyed || generation !== this.connectionGeneration) {
          p.destroy();
          return;
        }

        const oldLocalId = this.myPeerId;
        this.peer = p;
        this.mySlotIndex = isEphemeral ? null : slotIndex;
        this.myPeerId = id;
        this.previousPeerIds.add(id);
        this.reconnectAttempts = 0;

        // Remove presença provisória pré-PeerJS no BroadcastChannel para evitar ghost self
        if (oldLocalId && oldLocalId !== id) {
          this.broadcast({ type: 'peer_leave', peerId: oldLocalId });
        }

        this.dialOtherSlots(roomToken);
        this.sendPresence();
        this.recomputeStatus();
      });

      p.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      p.on('disconnected', () => {
        if (this.isDestroyed || generation !== this.connectionGeneration) return;
        this.recomputeStatus();
        this.schedulePeerReconnect(p, roomToken, generation);
      });

      p.on('close', () => {
        if (this.isDestroyed || generation !== this.connectionGeneration) return;
        this.peer = null;
        this.recomputeStatus();
        this.scheduleFullReinit(roomToken, generation);
      });

      p.on('error', (err: { type?: string; message?: string }) => {
        if (this.isDestroyed || generation !== this.connectionGeneration) return;

        if (err.type === 'unavailable-id') {
          p.destroy();
          if (!isEphemeral) {
            this.connectPeerSlot(roomToken, slotIndex + 1, generation);
          } else {
            this.setStatus('fallback_drive');
          }
          return;
        }

        if (err.type === 'peer-unavailable') {
          // Slot alvo vazio no momento; limpa rastreamento sem derrubar peer
          const msg = err.message || '';
          for (const targetId of this.connectingPeers.keys()) {
            if (msg.includes(targetId)) {
              this.connectingPeers.delete(targetId);
            }
          }
          return;
        }

        if (
          err.type === 'network' ||
          err.type === 'server-error' ||
          err.type === 'socket-error' ||
          err.type === 'socket-closed' ||
          err.type === 'webrtc' ||
          err.type === 'ssl-unavailable' ||
          err.type === 'browser-incompatible'
        ) {
          this.setStatus('fallback_drive');
          if (err.type !== 'browser-incompatible') {
            this.schedulePeerReconnect(p, roomToken, generation);
          }
        }
      });
    } catch {
      this.setStatus('fallback_drive');
    }
  }

  private schedulePeerReconnect(p: Peer, roomToken: string, generation: number): void {
    if (this.reconnectTimer || this.isDestroyed || generation !== this.connectionGeneration) {
      return;
    }
    const delayMs = Math.min(30000, 1500 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isDestroyed || generation !== this.connectionGeneration) return;
      if (p.destroyed) {
        this.connectPeerSlot(roomToken, 0, generation);
        return;
      }
      if (p.disconnected) {
        try {
          p.reconnect();
        } catch {
          this.connectPeerSlot(roomToken, 0, generation);
        }
      }
    }, delayMs);
  }

  private scheduleFullReinit(roomToken: string, generation: number): void {
    if (this.reconnectTimer || this.isDestroyed || generation !== this.connectionGeneration) {
      return;
    }
    const delayMs = Math.min(30000, 2000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isDestroyed && generation === this.connectionGeneration) {
        this.connectPeerSlot(roomToken, 0, generation);
      }
    }, delayMs);
  }

  private dialOtherSlots(roomToken: string): void {
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) return;

    const now = Date.now();
    for (let i = 0; i < MAX_SLOTS; i++) {
      if (i === this.mySlotIndex) continue;
      const targetId = `rja_${roomToken}_s${i}`;
      const existing = this.peerConnections.get(targetId);
      if (existing?.open) continue;

      const lastAttempt = this.connectingPeers.get(targetId) ?? 0;
      if (now - lastAttempt < CONNECT_ATTEMPT_TIMEOUT_MS) continue;

      this.connectToPeer(targetId);
    }
  }

  private connectToPeer(targetPeerId: string): void {
    if (!this.peer || this.peer.destroyed || this.peer.disconnected) return;
    const existing = this.peerConnections.get(targetPeerId);
    if (existing?.open) return;

    try {
      this.connectingPeers.set(targetPeerId, Date.now());
      const conn = this.peer.connect(targetPeerId, {
        reliable: true,
        metadata: { initiatedBy: this.myPeerId },
      });
      this.setupConnection(conn);
    } catch {
      this.connectingPeers.delete(targetPeerId);
    }
  }

  private setupConnection(conn: DataConnection): void {
    const closeRedundantIfDuplicate = (): boolean => {
      const existing = this.peerConnections.get(conn.peer);
      if (!existing || existing === conn || !existing.open) {
        return false;
      }
      // Regra determinística sem split-brain: o iniciador lexicograficamente menor vence
      const winnerPeerId = this.myPeerId < conn.peer ? this.myPeerId : conn.peer;
      const connMeta = conn.metadata as { initiatedBy?: string } | undefined;
      const existingMeta = existing.metadata as { initiatedBy?: string } | undefined;

      if (connMeta?.initiatedBy && existingMeta?.initiatedBy) {
        if (connMeta.initiatedBy === winnerPeerId && existingMeta.initiatedBy !== winnerPeerId) {
          try {
            existing.close();
          } catch {
            // Ignora
          }
          return false;
        }
        if (existingMeta.initiatedBy === winnerPeerId) {
          try {
            conn.close();
          } catch {
            // Ignora
          }
          return true;
        }
      }

      // Fallback determinístico quando metadata não está presente
      try {
        conn.close();
      } catch {
        // Ignora
      }
      return true;
    };

    const monitorIceState = () => {
      const rtcConn = (conn as unknown as { peerConnection?: RTCPeerConnection }).peerConnection;
      if (!rtcConn || typeof rtcConn.addEventListener !== 'function') return;
      rtcConn.addEventListener('iceconnectionstatechange', () => {
        if (rtcConn.iceConnectionState === 'failed') {
          try {
            conn.close();
          } catch {
            // Ignora
          }
          this.peerConnections.delete(conn.peer);
          this.recomputeStatus(true);
        }
      });
    };

    conn.on('open', () => {
      this.connectingPeers.delete(conn.peer);
      if (this.isDestroyed) {
        conn.close();
        return;
      }
      if (closeRedundantIfDuplicate()) {
        return;
      }

      this.peerConnections.set(conn.peer, conn);
      monitorIceState();
      this.recomputeStatus();

      // Envia presença imediatamente e sincroniza estado inicial da sessão
      this.sendPresenceTo(conn);
      if (this.canLocalUserMutate()) {
        this.sendProjectSnapshot(conn);
      }
    });

    conn.on('data', (data) => {
      void this.handleRawWireMessage(data);
    });

    conn.on('close', () => {
      this.connectingPeers.delete(conn.peer);
      if (this.peerConnections.get(conn.peer) === conn) {
        this.peerConnections.delete(conn.peer);
        this.remotePresences.delete(conn.peer);
        this.notifyPresenceChange();
        this.recomputeStatus();
      }
    });

    conn.on('error', () => {
      this.connectingPeers.delete(conn.peer);
      if (this.peerConnections.get(conn.peer) === conn) {
        this.peerConnections.delete(conn.peer);
        this.remotePresences.delete(conn.peer);
        this.notifyPresenceChange();
        this.recomputeStatus();
      }
    });
  }

  private broadcast(msg: CollabMessage, targetConn?: DataConnection): void {
    if (!this.roomMaterial || this.isDestroyed) return;
    this.sendQueue = this.sendQueue
      .then(() => this.encryptAndSend(msg, targetConn))
      .catch(() => {
        // Falhas isoladas de criptografia/envio não devem quebrar a fila FIFO
      });
  }

  private async encryptAndSend(msg: CollabMessage, targetConn?: DataConnection): Promise<void> {
    const material = this.roomMaterial;
    if (!material || this.isDestroyed) return;

    const envelope = await encryptCollabPayload(msg, material);
    const wireStr = JSON.stringify(envelope);

    if (targetConn) {
      if (targetConn.open) {
        try {
          targetConn.send(wireStr);
        } catch {
          // Ignora falha individual
        }
      }
      return;
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(envelope);
      } catch {
        // Ignora
      }
    }

    this.peerConnections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(wireStr);
        } catch {
          // Ignora
        }
      }
    });
  }

  private sendEncryptedSyncBestEffort(msg: CollabMessage): void {
    const material = this.roomMaterial;
    if (!material) return;
    void encryptCollabPayload(msg, material)
      .then((envelope) => {
        const wireStr = JSON.stringify(envelope);
        try {
          this.broadcastChannel?.postMessage(envelope);
        } catch {
          // Ignora
        }
        this.peerConnections.forEach((conn) => {
          if (conn.open) {
            try {
              conn.send(wireStr);
            } catch {
              // Ignora
            }
          }
        });
      })
      .catch(() => null);
  }

  private sendPresence(): void {
    if (!this.currentUser) return;
    this.broadcast({
      type: 'presence',
      presence: this.buildPresence(),
    });
  }

  private sendPresenceTo(conn: DataConnection): void {
    if (!this.currentUser) return;
    this.broadcast(
      {
        type: 'presence',
        presence: this.buildPresence(),
      },
      conn,
    );
  }

  private sendProjectSnapshot(conn?: DataConnection): void {
    if (!this.getLatestSnapshot) return;
    const snap = this.getLatestSnapshot();
    if (!snap || snap.blocks.length === 0) return;

    this.broadcast(
      {
        type: 'project_sync',
        blocks: snap.blocks,
        deletedBlockTimestamps: snap.deletedBlockTimestamps,
        blocksOrderUpdatedAt: snap.blocksOrderUpdatedAt,
        metadata: snap.metadata,
        metadataUpdatedAt: snap.metadataUpdatedAt,
        references: snap.references,
        referencesUpdatedAt: snap.referencesUpdatedAt,
        senderPeerId: this.myPeerId,
      },
      conn,
    );
  }

  private buildPresence(): CollaboratorPresence {
    return {
      peerId: this.myPeerId,
      user: this.currentUser!,
      role: this.currentRole,
      activeBlockId: this.currentActiveBlockId,
      colorIndex: this.myColorIndex,
      lastSeen: Date.now(),
    };
  }

  private startHeartbeat(): void {
    this.sendPresence();

    this.heartbeatTimer = setInterval(() => {
      this.sendPresence();
    }, HEARTBEAT_INTERVAL_MS);

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      this.remotePresences.forEach((presence, id) => {
        if (now - presence.lastSeen > PEER_TIMEOUT_MS) {
          this.remotePresences.delete(id);
          changed = true;
        }
      });
      if (changed) {
        this.notifyPresenceChange();
        this.recomputeStatus();
      }
    }, PEER_TIMEOUT_MS / 2);
  }

  private startReconciliation(roomToken: string): void {
    this.reconcileTimer = setInterval(() => {
      if (this.isDestroyed) return;
      this.dialOtherSlots(roomToken);
    }, RECONCILE_INTERVAL_MS);
  }

  private attachUnloadListener(): void {
    if (typeof window === 'undefined') return;
    this.detachUnloadListener();
    this.unloadHandler = () => {
      try {
        this.peer?.destroy();
      } catch {
        // Ignora
      }
    };
    window.addEventListener('beforeunload', this.unloadHandler);
  }

  private detachUnloadListener(): void {
    if (typeof window === 'undefined' || !this.unloadHandler) return;
    window.removeEventListener('beforeunload', this.unloadHandler);
    this.unloadHandler = null;
  }

  private recomputeStatus(iceFailed = false): void {
    if (this.isDestroyed || !this.driveFileId) {
      this.setStatus('idle');
      return;
    }
    if (!this.collabSecret) {
      this.setStatus('fallback_drive');
      return;
    }
    if (this.getOpenWebRtcPeersCount() > 0) {
      this.setStatus('connected_p2p');
      return;
    }
    if (iceFailed || this.peer?.disconnected || this.peer?.destroyed) {
      this.setStatus('fallback_drive');
      return;
    }
    if (this.peer?.open || this.remotePresences.size > 0) {
      this.setStatus('connected_local');
      return;
    }
    this.setStatus('connecting');
  }

  private setStatus(next: CollabConnectionStatus): void {
    if (this.connectionStatus === next) return;
    this.connectionStatus = next;
    this.onStatusChangeHandlers.forEach((h) => h(next));
  }

  private notifyPresenceChange(): void {
    const list = this.getActivePresences();
    this.onPresenceChangeHandlers.forEach((h) => h(list));
  }
}

// Singleton global do gerenciador em tempo real
export const realtimeCollab = new RealtimeCollabManager();
