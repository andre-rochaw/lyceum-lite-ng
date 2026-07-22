/** Contratos HTTP alinhados a A-003 (DTOs record + Page Spring). */

import { PageResponse } from '../../cursos/models/curso.models';

export type { PageResponse };

export interface DisciplinaResponse {
  id: string;
  nome: string;
  descricao: string | null;
  cargaHoraria: number;
  creditos: number;
  semestreRecomendado: number;
  ementa: string;
  cursoId: string;
  cursoNome: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisciplinaRequest {
  nome: string;
  descricao?: string | null;
  cargaHoraria: number;
  creditos: number;
  semestreRecomendado: number;
  ementa: string;
  cursoId: string;
}

export interface DisciplinaPageQuery {
  page: number;
  size: number;
  sort?: string;
  nome?: string;
}
