import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DisciplinaPageQuery,
  DisciplinaRequest,
  DisciplinaResponse,
  PageResponse,
} from '../models/disciplina.models';

@Injectable({ providedIn: 'root' })
export class DisciplinaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/disciplinas`;

  listar(query: DisciplinaPageQuery): Observable<PageResponse<DisciplinaResponse>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size);
    if (query.sort) {
      params = params.set('sort', query.sort);
    }
    if (query.nome?.trim()) {
      params = params.set('nome', query.nome.trim());
    }
    return this.http.get<PageResponse<DisciplinaResponse>>(this.baseUrl, { params });
  }

  buscarPorId(id: string): Observable<DisciplinaResponse> {
    return this.http.get<DisciplinaResponse>(`${this.baseUrl}/${id}`);
  }

  criar(body: DisciplinaRequest): Observable<DisciplinaResponse> {
    return this.http.post<DisciplinaResponse>(this.baseUrl, body);
  }

  editar(id: string, body: DisciplinaRequest): Observable<DisciplinaResponse> {
    return this.http.put<DisciplinaResponse>(`${this.baseUrl}/${id}`, body);
  }

  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
