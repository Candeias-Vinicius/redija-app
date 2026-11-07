import { describe, it, expect, vi } from 'vitest';
import { RealtimeCollabManager, CollaboratorPresence } from '../RealtimeCollabManager';

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
});
