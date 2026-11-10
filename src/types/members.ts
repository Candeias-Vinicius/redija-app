// =====================================================================
// RedijaApp — Definições de Membros do Projeto e Papéis de Acesso (RBAC)
// =====================================================================

export type ProjectRole = 'owner' | 'editor' | 'commenter' | 'reader';

export interface ProjectMember {
  id: string; // Permission ID do Google Drive ou 'owner'
  email: string;
  displayName: string;
  photoLink?: string;
  role: ProjectRole;
  assignedAt: string;
}

export type GoogleDrivePermissionRole = 'owner' | 'writer' | 'commenter' | 'reader';

export const ROLE_LABELS: Record<ProjectRole, { title: string; short: string; description: string; badgeClass: string }> = {
  owner: {
    title: 'Proprietário',
    short: 'Proprietário',
    description: 'Controle total do projeto, convites e exclusão.',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  editor: {
    title: 'Editor',
    short: 'Editor',
    description: 'Pode editar textos, blocos, metadados, referências e criar comentários.',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
  commenter: {
    title: 'Comentador',
    short: 'Comentador',
    description: 'Pode revisar, selecionar trechos de texto para adicionar apontamentos e responder threads.',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
  },
  reader: {
    title: 'Leitor',
    short: 'Leitor',
    description: 'Pode apenas visualizar o trabalho formatado e o PDF compilado.',
    badgeClass: 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
  },
};

export const ROLE_TO_DRIVE_PERMISSION: Record<Exclude<ProjectRole, 'owner'>, 'writer' | 'commenter' | 'reader'> = {
  editor: 'writer',
  commenter: 'commenter',
  reader: 'reader',
};

export function mapDriveRoleToProjectRole(driveRole?: string): ProjectRole {
  if (driveRole === 'owner') return 'owner';
  if (driveRole === 'commenter') return 'commenter';
  if (driveRole === 'reader') return 'reader';
  return 'editor'; // 'writer' padrão mapeia para 'editor'
}

export function mapProjectRoleToDriveRole(role: ProjectRole): GoogleDrivePermissionRole {
  if (role === 'owner') return 'owner';
  return ROLE_TO_DRIVE_PERMISSION[role];
}

export function collaboratorsToProjectMembers(
  collabs: Array<{ id: string; emailAddress: string; displayName?: string; photoLink?: string; role?: string }>
): ProjectMember[] {
  return collabs.map((c) => ({
    id: c.id,
    email: c.emailAddress,
    displayName: c.displayName || c.emailAddress.split('@')[0],
    photoLink: c.photoLink,
    role: mapDriveRoleToProjectRole(c.role),
    assignedAt: new Date().toISOString(),
  }));
}

/**
 * Determina o papel efetivo do usuário atual no projeto.
 */
export function getEffectiveUserRole(
  project: { ownerEmail?: string; members?: ProjectMember[] },
  currentUserEmail?: string | null
): ProjectRole {
  if (!currentUserEmail) return 'owner'; // Perfil convidado local é proprietário de seus trabalhos
  const emailLower = currentUserEmail.toLowerCase();
  if (project.ownerEmail && project.ownerEmail.toLowerCase() === emailLower) {
    return 'owner';
  }
  const member = project.members?.find((m) => m.email.toLowerCase() === emailLower);
  if (member) {
    return member.role;
  }
  return 'owner';
}

