import { describe, it, expect, vi } from 'vitest';
import {
  RealtimeCollabManager,
  CollaboratorPresence,
  buildIceServersConfig,
} from '../RealtimeCollabManager';
import { deriveCollabRoomMaterial, encryptCollabPayload, generateCollabSecret } from '../collabCrypto';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';

describe('RealtimeCollabManager (Nível 3 — Tempo Real P2P)', () => {
  it('gerencia registro de presenças e despacha eventos corretamente', () => {
    const manager = new RealtimeCollabManager();
    const presenceSpy = vi.fn();

    const unsubscribe = manager.onPresenceChange(presenceSpy);

    const mockPresence: CollaboratorPresence = {
      peerId: 'peer_1',
      user: {
        id: 'user_1',
        name: 'Prof. Orientador',
        email: 'orientador@universidade.edu.br',
      },
      activeBlockId: 'block_intro',
      colorIndex: 1,
      lastSeen: Date.now(),
    };

    // Simula recebimento de mensagem de presença de um peer remoto
    // @ts-expect-error acessando método privado para teste unitário
    manager.handleIncomingMessage({
      type: 'presence',
      presence: mockPresence,
    });

    expect(presenceSpy).toHaveBeenCalledTimes(1);
    const active = manager.getActivePresences();
    expect(active.length).toBe(1);
    expect(active[0].user.name).toBe('Prof. Orientador');
    expect(active[0].activeBlockId).toBe('block_intro');

    unsubscribe();
  });

  it('despacha atualizações de blocos remotos para os ouvintes registrados', () => {
    const manager = new RealtimeCollabManager();
    const blockUpdateSpy = vi.fn();

    manager.onRemoteBlockUpdate(blockUpdateSpy);

    // @ts-expect-error acessando método privado para teste unitário
    manager.handleIncomingMessage({
      type: 'block_update',
      blockId: 'b_123',
      content: '<p>Novo parágrafo digitado em tempo real pelo colega.</p>',
      senderPeerId: 'other_peer',
    });

    expect(blockUpdateSpy).toHaveBeenCalledWith({
      blockId: 'b_123',
      content: '<p>Novo parágrafo digitado em tempo real pelo colega.</p>',
      meta: undefined,
    });
  });

  it('remove peers desconectados ao receber peer_leave', () => {
    const manager = new RealtimeCollabManager();
    const mockPresence: CollaboratorPresence = {
      peerId: 'peer_leave_test',
      user: {
        id: 'user_2',
        name: 'Aluno Colega',
        email: 'colega@universidade.edu.br',
      },
      colorIndex: 2,
      lastSeen: Date.now(),
    };

    // @ts-expect-error acessando método privado para teste unitário
    manager.handleIncomingMessage({
      type: 'presence',
      presence: mockPresence,
    });
    expect(manager.getActivePresences().length).toBe(1);

    // @ts-expect-error acessando método privado para teste unitário
    manager.handleIncomingMessage({
      type: 'peer_leave',
      peerId: 'peer_leave_test',
    });
    expect(manager.getActivePresences().length).toBe(0);
  });

  it('descarta mensagens maliciosas com payload excessivo ou campos inválidos', () => {
    const manager = new RealtimeCollabManager();
    const updateSpy = vi.fn();
    manager.onRemoteBlockUpdate(updateSpy);

    // Payload gigante > 500KB
    // @ts-expect-error acessando método privado para teste unitário
    manager.handleIncomingMessage({
      type: 'block_update',
      blockId: 'b_overflow',
      content: 'A'.repeat(600_000),
      senderPeerId: 'other_peer',
    });
    expect(updateSpy).not.toHaveBeenCalled();

    // Mensagem com tipo inválido ou corrompido
    // @ts-expect-error acessando método privado para teste unitário
    manager.handleIncomingMessage(null);
    // @ts-expect-error acessando método privado para teste unitário
    manager.handleIncomingMessage({ type: 'unknown_type' });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('entra em modo fallback_drive quando não há collabSecret válido (fail-closed)', () => {
    const manager = new RealtimeCollabManager();
    const statuses: string[] = [];
    manager.onStatusChange((s) => statuses.push(s));

    manager.connect(
      'file_without_secret',
      { id: 'u1', name: 'Autor', email: 'autor@uf.br', picture: '' },
      { collabSecret: undefined, role: 'owner' },
    );

    expect(manager.getConnectionStatus()).toBe('fallback_drive');
    expect(statuses).toContain('fallback_drive');
    manager.disconnect();
  });

  it('exige descriptografia AES-256-GCM válida em handleRawWireMessage e rejeita texto claro', async () => {
    const manager = new RealtimeCollabManager();
    const secret = generateCollabSecret();
    const otherSecret = generateCollabSecret();
    const roomMaterial = await deriveCollabRoomMaterial('drive_file_e2ee', secret);
    const wrongMaterial = await deriveCollabRoomMaterial('drive_file_e2ee', otherSecret);

    const blockSpy = vi.fn();
    manager.onRemoteBlockUpdate(blockSpy);

    // Simula sala inicializada com roomMaterial derivado de collabSecret
    // @ts-expect-error injetando roomMaterial privado para teste determinístico sem timers
    manager.roomMaterial = roomMaterial;
    // @ts-expect-error definindo peerId local para teste
    manager.myPeerId = 'local_peer_self';

    // Texto claro sem criptografia deve ser descartado (fail-closed)
    await manager.handleRawWireMessage({
      type: 'block_update',
      blockId: 'b_plain',
      content: '<p>Injeção sem criptografia</p>',
      senderPeerId: 'attacker_peer',
    });
    expect(blockSpy).not.toHaveBeenCalled();

    // Mensagem cifrada com segredo errado deve ser descartada
    const wrongEnvelope = await encryptCollabPayload(
      {
        type: 'block_update',
        blockId: 'b_wrong_key',
        content: '<p>Chave errada</p>',
        senderPeerId: 'other_peer',
      },
      wrongMaterial,
    );
    await manager.handleRawWireMessage(wrongEnvelope);
    expect(blockSpy).not.toHaveBeenCalled();

    // Mensagem cifrada com o collabSecret legítimo é aceita
    const validEnvelope = await encryptCollabPayload(
      {
        type: 'block_update',
        blockId: 'b_valid',
        content: '<p>Atualização E2EE legítima</p>',
        updatedAt: 1731100500000,
        senderPeerId: 'peer_editor',
      },
      roomMaterial,
    );
    await manager.handleRawWireMessage(validEnvelope);
    expect(blockSpy).toHaveBeenCalledWith({
      blockId: 'b_valid',
      content: '<p>Atualização E2EE legítima</p>',
      updatedAt: 1731100500000,
      meta: undefined,
    });
  });

  it('bloqueia mutações locais e remotas de leitores e e-mails não autorizados', () => {
    const manager = new RealtimeCollabManager();
    const updateSpy = vi.fn();
    const metaSpy = vi.fn();
    const refsSpy = vi.fn();
    const projectSyncSpy = vi.fn();

    manager.onRemoteBlockUpdate(updateSpy);
    manager.onRemoteMetadataUpdate(metaSpy);
    manager.onRemoteReferencesUpdate(refsSpy);
    manager.onRemoteProjectSync(projectSyncSpy);

    // Configura lista branca de colaboradores e papel reader local
    manager.updatePermissions({
      role: 'reader',
      allowedEmails: ['owner@uf.br', 'leitor@uf.br', 'editor@uf.br'],
      allowAnyone: false,
    });

    // @ts-expect-error injetando myPeerId para testar bloqueio local de leitor
    manager.myPeerId = 'peer_reader_self';
    const broadcastSpy = vi.spyOn(
      manager as unknown as { broadcast: (msg: unknown) => void },
      'broadcast',
    );
    manager.broadcastBlockUpdate('b1', '<p>Não deve enviar</p>');
    manager.broadcastBlocksSync([]);
    expect(broadcastSpy).not.toHaveBeenCalled();

    // E-mail fora da whitelist é rejeitado na presença
    // @ts-expect-error método privado para teste unitário
    manager.handleIncomingMessage({
      type: 'presence',
      presence: {
        peerId: 'peer_intruso',
        user: { id: 'u_intruso', name: 'Intruso', email: 'intruso@evil.com' },
        role: 'writer',
        colorIndex: 0,
        lastSeen: Date.now(),
      },
    });
    expect(manager.getActivePresences()).toHaveLength(0);

    // Leitor remoto registrado na presença não pode emitir mutações
    // @ts-expect-error método privado para teste unitário
    manager.handleIncomingMessage({
      type: 'presence',
      presence: {
        peerId: 'peer_leitor',
        user: { id: 'u_leitor', name: 'Leitor', email: 'leitor@uf.br' },
        role: 'reader',
        colorIndex: 1,
        lastSeen: Date.now(),
      },
    });
    expect(manager.getActivePresences()).toHaveLength(1);

    // @ts-expect-error método privado para teste unitário
    manager.handleIncomingMessage({
      type: 'block_update',
      blockId: 'b1',
      content: '<p>Tentativa de leitor</p>',
      senderPeerId: 'peer_leitor',
    });
    expect(updateSpy).not.toHaveBeenCalled();

    // Editor autorizado pode emitir metadata_update, references_update e project_sync
    // @ts-expect-error método privado para teste unitário
    manager.handleIncomingMessage({
      type: 'presence',
      presence: {
        peerId: 'peer_editor',
        user: { id: 'u_editor', name: 'Editor', email: 'editor@uf.br' },
        role: 'writer',
        colorIndex: 2,
        lastSeen: Date.now(),
      },
    });

    const sampleProject = createProjectFromTemplate('artigo', 'Teste Collab');
    // @ts-expect-error método privado para teste unitário
    manager.handleIncomingMessage({
      type: 'metadata_update',
      metadata: sampleProject.metadata,
      metadataUpdatedAt: 1731100999000,
      senderPeerId: 'peer_editor',
    });
    expect(metaSpy).toHaveBeenCalledTimes(1);

    // @ts-expect-error método privado para teste unitário
    manager.handleIncomingMessage({
      type: 'references_update',
      references: [
        { id: 'ref_1', authors: 'SILVA', title: 'Obra', city: 'São Paulo', publisher: 'Atlas', year: '2025' },
      ],
      referencesUpdatedAt: 1731100999001,
      senderPeerId: 'peer_editor',
    });
    expect(refsSpy).toHaveBeenCalledTimes(1);

    // @ts-expect-error método privado para teste unitário
    manager.handleIncomingMessage({
      type: 'project_sync',
      blocks: sampleProject.blocks,
      deletedBlockTimestamps: { blk_del: 1731100999002 },
      blocksOrderUpdatedAt: 1731100999002,
      metadata: sampleProject.metadata,
      metadataUpdatedAt: 1731100999002,
      senderPeerId: 'peer_editor',
    });
    expect(projectSyncSpy).toHaveBeenCalledTimes(1);
  });

  it('constrói configuração ICE com STUN padrão e TURN opcional via variáveis de ambiente', () => {
    const defaultIce = buildIceServersConfig({});
    expect(defaultIce.length).toBeGreaterThanOrEqual(2);
    expect(defaultIce.some((s) => String(s.urls).includes('stun:'))).toBe(true);

    const withTurn = buildIceServersConfig({
      VITE_TURN_URL: 'turn:turn.redija.app:3478',
      VITE_TURN_USERNAME: 'redija',
      VITE_TURN_CREDENTIAL: 'secret-token',
    });
    expect(
      withTurn.some(
        (s) =>
          s.urls === 'turn:turn.redija.app:3478' &&
          s.username === 'redija' &&
          s.credential === 'secret-token',
      ),
    ).toBe(true);
  });
});
