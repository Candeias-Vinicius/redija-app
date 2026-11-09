import { describe, it, expect } from 'vitest';
import {
  mapDriveRoleToProjectRole,
  mapProjectRoleToDriveRole,
  collaboratorsToProjectMembers,
  getEffectiveUserRole,
  ProjectMember,
} from '../members';

describe('Project Members & RBAC Roles', () => {
  it('mapeia permissões do Google Drive para papéis do Redija corretamente', () => {
    expect(mapDriveRoleToProjectRole('owner')).toBe('owner');
    expect(mapDriveRoleToProjectRole('commenter')).toBe('commenter');
    expect(mapDriveRoleToProjectRole('reader')).toBe('reader');
    expect(mapDriveRoleToProjectRole('writer')).toBe('editor');
    expect(mapDriveRoleToProjectRole(undefined)).toBe('editor');
  });

  it('mapeia papéis do Redija para permissões do Google Drive corretamente', () => {
    expect(mapProjectRoleToDriveRole('owner')).toBe('owner');
    expect(mapProjectRoleToDriveRole('editor')).toBe('writer');
    expect(mapProjectRoleToDriveRole('commenter')).toBe('commenter');
    expect(mapProjectRoleToDriveRole('reader')).toBe('reader');
  });

  it('converte lista de Collaborator do Drive em ProjectMember', () => {
    const collabs = [
      { id: '1', emailAddress: 'aluno@gmail.com', displayName: 'Aluno', role: 'owner' },
      { id: '2', emailAddress: 'orientador@univ.edu.br', displayName: 'Prof', role: 'commenter' },
      { id: '3', emailAddress: 'banca@univ.edu.br', displayName: 'Banca', role: 'reader' },
    ];

    const members = collaboratorsToProjectMembers(collabs);
    expect(members).toHaveLength(3);
    expect(members[0].role).toBe('owner');
    expect(members[1].role).toBe('commenter');
    expect(members[2].role).toBe('reader');
  });

  it('determina papel efetivo do usuário com base no e-mail e nos membros', () => {
    const members: ProjectMember[] = [
      {
        id: '1',
        email: 'orientador@univ.edu.br',
        displayName: 'Orientador',
        role: 'commenter',
        assignedAt: new Date().toISOString(),
      },
      {
        id: '2',
        email: 'leitor@univ.edu.br',
        displayName: 'Leitor',
        role: 'reader',
        assignedAt: new Date().toISOString(),
      },
    ];

    const project = {
      ownerEmail: 'aluno@gmail.com',
      members,
    };

    // Owner
    expect(getEffectiveUserRole(project, 'aluno@gmail.com')).toBe('owner');
    expect(getEffectiveUserRole(project, 'ALUNO@GMAIL.COM')).toBe('owner');

    // Orientador / Comentador
    expect(getEffectiveUserRole(project, 'orientador@univ.edu.br')).toBe('commenter');

    // Leitor
    expect(getEffectiveUserRole(project, 'leitor@univ.edu.br')).toBe('reader');

    // Convidado local (sem e-mail) é considerado owner do arquivo local
    expect(getEffectiveUserRole(project, null)).toBe('owner');
    expect(getEffectiveUserRole(project, undefined)).toBe('owner');
  });
});
