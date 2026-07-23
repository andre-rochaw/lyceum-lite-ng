/** Contratos HTTP alinhados a A-004 (DTOs record + Page Spring + StatusTurma). */

import { PageResponse } from '../../cursos/models/curso.models';

export type { PageResponse };

export type StatusTurma = 'ABERTA' | 'CONCLUIDA' | 'EM_AVALIACAO';

export const STATUS_TURMA_OPTIONS: StatusTurma[] = [
  'ABERTA',
  'CONCLUIDA',
  'EM_AVALIACAO',
];

export interface TurmaResponse {
  id: string;
  nome: string;
  disciplinaId: string;
  disciplinaNome: string;
  cursoId: string;
  cursoNome: string;
  ano: number;
  semestre: number;
  limiteVagas: number;
  vagasOcupadas: number;
  status: StatusTurma;
  createdAt: string;
  updatedAt: string;
}

export interface TurmaRequest {
  nome: string;
  disciplinaId: string;
  ano: number;
  semestre: number;
  limiteVagas: number;
  status: StatusTurma;
}

export interface TurmaPageQuery {
  page: number;
  size: number;
  sort?: string;
  nome?: string;
  disciplinaId?: string;
  cursoId?: string;
  ano?: number;
  semestre?: number;
  status?: StatusTurma;
}
