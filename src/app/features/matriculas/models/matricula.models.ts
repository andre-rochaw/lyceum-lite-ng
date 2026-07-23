/** Contratos HTTP alinhados a A-005 (DTOs record + Page Spring + StatusMatricula). */

import { PageResponse } from '../../cursos/models/curso.models';

export type { PageResponse };

export type StatusMatricula = 'PENDENTE' | 'CONFIRMADA' | 'CANCELADA';

export const STATUS_MATRICULA_OPTIONS: StatusMatricula[] = [
  'PENDENTE',
  'CONFIRMADA',
  'CANCELADA',
];

export interface MatriculaResponse {
  id: string;
  alunoId: string;
  alunoNome: string;
  turmaId: string;
  turmaNome: string;
  disciplinaId: string;
  disciplinaNome: string;
  cursoId: string;
  cursoNome: string;
  status: StatusMatricula;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMatriculaRequest {
  alunoId: string;
  turmaId: string;
}

export interface MatriculaPageQuery {
  page: number;
  size: number;
  sort?: string;
  alunoId?: string;
  turmaId?: string;
  status?: StatusMatricula;
}
