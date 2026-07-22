import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AlunoPageQuery,
  AlunoRequest,
  AlunoResponse,
  PageResponse,
} from '../models/aluno.models';

@Injectable({ providedIn: 'root' })
export class AlunoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/alunos`;

  listar(query: AlunoPageQuery): Observable<PageResponse<AlunoResponse>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size);
    if (query.sort) {
      params = params.set('sort', query.sort);
    }
    if (query.nome?.trim()) {
      params = params.set('nome', query.nome.trim());
    }
    return this.http.get<PageResponse<AlunoResponse>>(this.baseUrl, { params });
  }

  buscarPorId(id: string): Observable<AlunoResponse> {
    return this.http.get<AlunoResponse>(`${this.baseUrl}/${id}`);
  }

  criar(body: AlunoRequest): Observable<AlunoResponse> {
    return this.http.post<AlunoResponse>(this.baseUrl, body);
  }

  editar(id: string, body: AlunoRequest): Observable<AlunoResponse> {
    return this.http.put<AlunoResponse>(`${this.baseUrl}/${id}`, body);
  }

  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
