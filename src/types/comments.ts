// =====================================================================
// RedijaApp — Definições de Comentários Ancorados no Texto
// =====================================================================

import { ProjectRole } from './members';

export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
  picture?: string;
  role: ProjectRole;
}

export interface CommentReply {
  id: string;
  author: CommentAuthor;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CommentThread {
  id: string; // Ex: "cmt_4f9a2b"
  blockId: string; // ID do bloco de texto associado
  highlightedText: string; // Trecho de texto selecionado para contexto
  author: CommentAuthor;
  content: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: CommentAuthor;
  replies: CommentReply[];
}
