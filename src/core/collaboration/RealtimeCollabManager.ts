// =====================================================================
// RedijaApp — Motor de Colaboração em Tempo Real P2P (WebRTC + BroadcastChannel)
// Nível 3: Sincronização Instantânea e Indicadores de Presença (Zero Custo de Servidor)
// =====================================================================

import { Block } from '@/types/document';
import { GoogleUserProfile } from '@/core/auth/GoogleAuthContext';
import { Peer, DataConnection } from 'peerjs';

export interface CollabUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export interface CollaboratorPresence {
  peerId: string;
  user: CollabUser;
  activeBlockId?: string;
  colorIndex: number;
  lastSeen: number;
}

export type CollabMessage =
  | { type: 'presence'; presence: CollaboratorPresence }
  | {
      type: 'block_update';
      blockId: string;
      content: string;
      meta?: Block['meta'];
      senderPeerId: string;
    }
  | { type: 'blocks_sync'; blocks: Block[]; senderPeerId: string }
  | { type: 'peer_leave'; peerId: string };

export type RemoteBlockUpdateHandler = (update: {
  blockId: string;
  content: string;
  meta?: Block['meta'];
}) => void;
export type RemoteBlocksSyncHandler = (blocks: Block[]) => void;
export type PresenceChangeHandler = (presences: CollaboratorPresence[]) => void;

const COLLAB_COLORS_COUNT = 5;
const HEARTBEAT_INTERVAL_MS = 4000;
const PEER_TIMEOUT_MS = 12000;
const MAX_SLOTS = 5;

export class RealtimeCollabManager {
  private driveFileId: string | null = null;
  private currentUser: CollabUser | null = null;
  private myPeerId: string = '';
  private myColorIndex: number = 0;
  private currentActiveBlockId?: string;

  private broadcastChannel: BroadcastChannel | null = null;
  private peer: Peer | null = null;
  private peerConnections: Map<string, DataConnection> = new Map();
  private remotePresences: Map<string, CollaboratorPresence> = new Map();

  private onRemoteBlockUpdateHandlers: Set<RemoteBlockUpdateHandler> = new Set();
  private onRemoteBlocksSyncHandlers: Set<RemoteBlocksSyncHandler> = new Set();
  private onPresenceChangeHandlers: Set<PresenceChangeHandler> = new Set();

  private heartbeatTimer: number | null = null;
  private cleanupTimer: number | null = null;
  private isDestroyed = false;

  /**
   * Conecta à sala de colaboração em tempo real baseada no driveFileId do projeto.
   */
  public connect(driveFileId: string, user: GoogleUserProfile): void {
    if (this.driveFileId === driveFileId && this.currentUser?.id === user.id) {
      return;
    }

    this.disconnect();
    this.isDestroyed = false;
    this.driveFileId = driveFileId;
    this.currentUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
    };

    // Gera índice de cor determinístico baseado no hash do e-mail
    this.myColorIndex = Math.abs(
      user.email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % COLLAB_COLORS_COUNT
    );

    const safeFileId = driveFileId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
    this.myPeerId = `redija_${safeFileId}_${Math.random().toString(36).slice(2, 8)}`;

    // 1. Canal Local (BroadcastChannel para abas no mesmo navegador)
    this.initBroadcastChannel(safeFileId);

    // 2. Canal Remoto P2P (WebRTC via PeerJS na nuvem pública gratuita)
    this.initPeerJS(safeFileId);

    // 3. Inicia batimentos cardíacos (Heartbeats)
    this.startHeartbeat();
  }

  /**
   * Desconecta de todos os canais e limpa conexões.
   */
  public disconnect(): void {
    this.isDestroyed = true;

    // Notifica saída
    this.broadcast({
      type: 'peer_leave',
      peerId: this.myPeerId,
    });

    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.cleanupTimer) {
      window.clearInterval(this.cleanupTimer);
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

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Ignora
      }
      this.peer = null;
    }

    this.remotePresences.clear();
    this.notifyPresenceChange();
    this.driveFileId = null;
  }

  /**
   * Envia atualização de conteúdo ou metadados de um bloco em tempo real.
   */
  public broadcastBlockUpdate(blockId: string, content: string, meta?: Block['meta']): void {
    this.broadcast({
      type: 'block_update',
      blockId,
      content,
      meta,
      senderPeerId: this.myPeerId,
    });
  }

  /**
   * Envia reordenação ou lista inteira de blocos (ex: adição/remoção de seção).
   */
  public broadcastBlocksSync(blocks: Block[]): void {
    this.broadcast({
      type: 'blocks_sync',
      blocks,
      senderPeerId: this.myPeerId,
    });
  }

  /**
   * Atualiza e transmite a posição do cursor (bloco ativo).
   */
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

  public onPresenceChange(handler: PresenceChangeHandler): () => void {
    this.onPresenceChangeHandlers.add(handler);
    return () => this.onPresenceChangeHandlers.delete(handler);
  }

  public getActivePresences(): CollaboratorPresence[] {
    return Array.from(this.remotePresences.values());
  }

  // ==========================================================================
  // MÉTODOS INTERNOS DE REDE
  // ==========================================================================

  private initBroadcastChannel(safeFileId: string): void {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      this.broadcastChannel = new BroadcastChannel(`redija_collab_${safeFileId}`);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data) {
          this.handleIncomingMessage(event.data);
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel não disponível:', err);
    }
  }

  private initPeerJS(safeFileId: string): void {
    if (typeof window === 'undefined') return;

    try {
      // Tenta ocupar um slot na sala (ex: redija_safeFileId_0 até 4)
      this.connectPeerSlot(safeFileId, 0);
    } catch (err) {
      console.warn('Não foi possível inicializar PeerJS WebRTC:', err);
    }
  }

  private connectPeerSlot(safeFileId: string, slotIndex: number): void {
    if (this.isDestroyed || slotIndex >= MAX_SLOTS) return;

    const slotPeerId = `redija_${safeFileId}_s${slotIndex}`;

    try {
      const p = new Peer(slotPeerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      p.on('open', (id) => {
        if (this.isDestroyed) {
          p.destroy();
          return;
        }
        this.peer = p;
        this.myPeerId = id;

        // Conecta-se aos outros slots potenciais anteriores
        for (let i = 0; i < slotIndex; i++) {
          const targetId = `redija_${safeFileId}_s${i}`;
          this.connectToPeer(targetId);
        }

        this.sendPresence();
      });

      p.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      p.on('error', (err: { type?: string }) => {
        if (err.type === 'unavailable-id') {
          // Slot ocupado por outro colega! Tenta o próximo slot
          p.destroy();
          this.connectPeerSlot(safeFileId, slotIndex + 1);
        }
      });
    } catch {
      // Falha silenciosa de WebRTC
    }
  }

  private connectToPeer(targetPeerId: string): void {
    if (!this.peer || this.peer.destroyed || this.peerConnections.has(targetPeerId)) {
      return;
    }

    try {
      const conn = this.peer.connect(targetPeerId, { reliable: true });
      this.setupConnection(conn);
    } catch {
      // Ignora erro de conexão individual
    }
  }

  private setupConnection(conn: DataConnection): void {
    conn.on('open', () => {
      this.peerConnections.set(conn.peer, conn);
      this.sendPresence();
    });

    conn.on('data', (data) => {
      this.handleIncomingMessage(data as CollabMessage);
    });

    conn.on('close', () => {
      this.peerConnections.delete(conn.peer);
      this.remotePresences.delete(conn.peer);
      this.notifyPresenceChange();
    });

    conn.on('error', () => {
      this.peerConnections.delete(conn.peer);
      this.remotePresences.delete(conn.peer);
      this.notifyPresenceChange();
    });
  }

  private broadcast(msg: CollabMessage): void {
    // 1. Envia via BroadcastChannel local
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch {
        // Ignora
      }
    }

    // 2. Envia via WebRTC DataChannels para todos os peers remotos
    const dataStr = JSON.stringify(msg);
    this.peerConnections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(dataStr);
        } catch {
          // Ignora falha de envio individual
        }
      }
    });
  }

  private handleIncomingMessage(raw: unknown): void {
    let msg: CollabMessage;
    if (typeof raw === 'string') {
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
    } else {
      msg = raw as CollabMessage;
    }

    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'presence': {
        if (msg.presence.peerId === this.myPeerId) return;
        this.remotePresences.set(msg.presence.peerId, {
          ...msg.presence,
          lastSeen: Date.now(),
        });
        this.notifyPresenceChange();
        break;
      }

      case 'block_update': {
        if (msg.senderPeerId === this.myPeerId) return;
        this.onRemoteBlockUpdateHandlers.forEach((h) =>
          h({
            blockId: msg.blockId,
            content: msg.content,
            meta: msg.meta,
          })
        );
        break;
      }

      case 'blocks_sync': {
        if (msg.senderPeerId === this.myPeerId) return;
        this.onRemoteBlocksSyncHandlers.forEach((h) => h(msg.blocks));
        break;
      }

      case 'peer_leave': {
        this.remotePresences.delete(msg.peerId);
        this.notifyPresenceChange();
        break;
      }
    }
  }

  private sendPresence(): void {
    if (!this.currentUser) return;

    const presence: CollaboratorPresence = {
      peerId: this.myPeerId,
      user: this.currentUser,
      activeBlockId: this.currentActiveBlockId,
      colorIndex: this.myColorIndex,
      lastSeen: Date.now(),
    };

    this.broadcast({
      type: 'presence',
      presence,
    });
  }

  private startHeartbeat(): void {
    this.sendPresence();

    this.heartbeatTimer = window.setInterval(() => {
      this.sendPresence();
    }, HEARTBEAT_INTERVAL_MS);

    // Limpa presenças de peers que desconectaram sem avisar
    this.cleanupTimer = window.setInterval(() => {
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
      }
    }, PEER_TIMEOUT_MS / 2);
  }

  private notifyPresenceChange(): void {
    const list = this.getActivePresences();
    this.onPresenceChangeHandlers.forEach((h) => h(list));
  }
}

// Singleton global do gerenciador em tempo real
export const realtimeCollab = new RealtimeCollabManager();
