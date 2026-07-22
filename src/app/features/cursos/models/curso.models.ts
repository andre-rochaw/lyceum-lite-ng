/** Contratos HTTP alinhados a A-002 (DTOs record + Page Spring). */

export interface CursoResponse {
  id: string;
  nome: string;
  descricao: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CursoRequest {
  nome: string;
  descricao?: string | null;
}

/** Metadados mínimos do `Page` do Spring Data. */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface CursoPageQuery {
  page: number;
  size: number;
  sort?: string;
  nome?: string;
}
