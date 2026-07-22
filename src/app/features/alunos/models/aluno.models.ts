/** Contratos HTTP alinhados a A-001 (DTOs record + Page Spring). */

export interface AlunoResponse {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  dataNascimento: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlunoRequest {
  nome: string;
  email: string;
  cpf: string;
  dataNascimento: string;
}

/** Metadados mínimos do `Page` do Spring Data. */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface AlunoPageQuery {
  page: number;
  size: number;
  sort?: string;
  nome?: string;
}
