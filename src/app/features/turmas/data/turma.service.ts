import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  PageResponse,
  TurmaPageQuery,
  TurmaRequest,
  TurmaResponse,
} from '../models/turma.models';

@Injectable({ providedIn: 'root' })
export class TurmaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/turmas`;

  listar(query: TurmaPageQuery): Observable<PageResponse<TurmaResponse>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size);
    if (query.sort) {
      params = params.set('sort', query.sort);
    }
    if (query.nome?.trim()) {
      params = params.set('nome', query.nome.trim());
    }
    if (query.disciplinaId) {
      params = params.set('disciplinaId', query.disciplinaId);
    }
    if (query.cursoId) {
      params = params.set('cursoId', query.cursoId);
    }
    if (query.ano != null) {
      params = params.set('ano', query.ano);
    }
    if (query.semestre != null) {
      params = params.set('semestre', query.semestre);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    return this.http.get<PageResponse<TurmaResponse>>(this.baseUrl, { params });
  }

  buscarPorId(id: string): Observable<TurmaResponse> {
    return this.http.get<TurmaResponse>(`${this.baseUrl}/${id}`);
  }

  criar(body: TurmaRequest): Observable<TurmaResponse> {
    return this.http.post<TurmaResponse>(this.baseUrl, body);
  }

  editar(id: string, body: TurmaRequest): Observable<TurmaResponse> {
    return this.http.put<TurmaResponse>(`${this.baseUrl}/${id}`, body);
  }

  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
