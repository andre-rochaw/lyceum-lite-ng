import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateMatriculaRequest,
  MatriculaPageQuery,
  MatriculaResponse,
  PageResponse,
} from '../models/matricula.models';

@Injectable({ providedIn: 'root' })
export class MatriculaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/matriculas`;

  listar(query: MatriculaPageQuery): Observable<PageResponse<MatriculaResponse>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size);
    if (query.sort) {
      params = params.set('sort', query.sort);
    }
    if (query.alunoId) {
      params = params.set('alunoId', query.alunoId);
    }
    if (query.turmaId) {
      params = params.set('turmaId', query.turmaId);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    return this.http.get<PageResponse<MatriculaResponse>>(this.baseUrl, {
      params,
    });
  }

  buscarPorId(id: string): Observable<MatriculaResponse> {
    return this.http.get<MatriculaResponse>(`${this.baseUrl}/${id}`);
  }

  criar(body: CreateMatriculaRequest): Observable<MatriculaResponse> {
    return this.http.post<MatriculaResponse>(this.baseUrl, body);
  }

  confirmar(id: string): Observable<MatriculaResponse> {
    return this.http.post<MatriculaResponse>(
      `${this.baseUrl}/${id}/confirmar`,
      null,
    );
  }

  cancelar(id: string): Observable<MatriculaResponse> {
    return this.http.post<MatriculaResponse>(
      `${this.baseUrl}/${id}/cancelar`,
      null,
    );
  }
}
