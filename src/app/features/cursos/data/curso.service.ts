import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CursoPageQuery,
  CursoRequest,
  CursoResponse,
  PageResponse,
} from '../models/curso.models';

@Injectable({ providedIn: 'root' })
export class CursoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/cursos`;

  listar(query: CursoPageQuery): Observable<PageResponse<CursoResponse>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size);
    if (query.sort) {
      params = params.set('sort', query.sort);
    }
    return this.http.get<PageResponse<CursoResponse>>(this.baseUrl, { params });
  }

  buscarPorId(id: string): Observable<CursoResponse> {
    return this.http.get<CursoResponse>(`${this.baseUrl}/${id}`);
  }

  criar(body: CursoRequest): Observable<CursoResponse> {
    return this.http.post<CursoResponse>(this.baseUrl, body);
  }

  editar(id: string, body: CursoRequest): Observable<CursoResponse> {
    return this.http.put<CursoResponse>(`${this.baseUrl}/${id}`, body);
  }

  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
