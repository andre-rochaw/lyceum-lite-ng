import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import {
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
} from 'rxjs';
import { CursoService } from '../../../cursos/data/curso.service';
import { CursoResponse } from '../../../cursos/models/curso.models';
import { ConfirmExcluirDisciplinaDialog } from '../../components/confirm-excluir-disciplina-dialog';
import { DisciplinaService } from '../../data/disciplina.service';
import { DisciplinaResponse } from '../../models/disciplina.models';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-disciplina-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
  ],
  templateUrl: './disciplina-list.html',
  styleUrl: './disciplina-list.css',
})
export class DisciplinaList implements OnInit {
  private readonly disciplinaService = inject(DisciplinaService);
  private readonly cursoService = inject(CursoService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = [
    'nome',
    'cursoNome',
    'cargaHoraria',
    'creditos',
    'semestreRecomendado',
    'acoes',
  ];
  readonly disciplinas = signal<DisciplinaResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly empty = signal(false);
  readonly nomeFiltro = signal('');
  readonly cursoIdFiltro = signal<string | null>(null);
  readonly cursosSugestoes = signal<CursoResponse[]>([]);
  readonly emptyCursos = signal(false);

  readonly buscaControl = new FormControl('', { nonNullable: true });
  readonly cursoBuscaControl = new FormControl('', { nonNullable: true });

  private selectedCursoNome: string | null = null;

  ngOnInit(): void {
    this.buscaControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => {
        this.nomeFiltro.set(valor.trim());
        this.pageIndex.set(0);
        this.carregar();
      });

    this.cursoBuscaControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((termo) => {
          if (termo && typeof termo === 'object' && 'id' in termo) {
            return of(null);
          }
          const trimmed = String(termo ?? '').trim();
          if (this.selectedCursoNome !== null && trimmed !== this.selectedCursoNome) {
            this.selectedCursoNome = null;
            this.cursoIdFiltro.set(null);
            this.pageIndex.set(0);
            this.carregar();
          }
          if (trimmed.length < 1) {
            this.cursosSugestoes.set([]);
            this.emptyCursos.set(false);
            if (this.cursoIdFiltro() !== null) {
              this.cursoIdFiltro.set(null);
              this.pageIndex.set(0);
              this.carregar();
            }
            return of(null);
          }
          return this.cursoService.listar({
            nome: trimmed,
            page: 0,
            size: 10,
            sort: 'nome',
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          if (result == null) {
            return;
          }
          if (result.content.length === 0) {
            this.emptyCursos.set(true);
            this.cursosSugestoes.set([]);
            return;
          }
          this.emptyCursos.set(false);
          this.cursosSugestoes.set(result.content ?? []);
        },
      });

    this.carregar();
  }

  onCursoSelected(event: MatAutocompleteSelectedEvent): void {
    const curso = event.option.value as CursoResponse | null;
    if (curso == null || typeof curso !== 'object' || !('id' in curso)) {
      return;
    }
    this.selectedCursoNome = curso.nome;
    this.cursoBuscaControl.setValue(curso.nome, { emitEvent: false });
    this.cursosSugestoes.set([]);
    this.emptyCursos.set(false);
    this.cursoIdFiltro.set(curso.id);
    this.pageIndex.set(0);
    this.carregar();
  }

  displayCurso = (value: string | CursoResponse | null): string => {
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return value.nome;
  };

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.carregar();
  }

  carregar(): void {
    this.disciplinaService
      .listar({
        page: this.pageIndex(),
        size: this.pageSize(),
        sort: 'nome',
        nome: this.nomeFiltro() || undefined,
        cursoId: this.cursoIdFiltro() ?? undefined,
      })
      .subscribe({
        next: (page) => {
          this.disciplinas.set(page.content ?? []);
          this.totalElements.set(page.totalElements ?? 0);
          this.empty.set((page.content ?? []).length === 0);
        },
      });
  }

  confirmarExclusao(disciplina: DisciplinaResponse): void {
    const ref = this.dialog.open(ConfirmExcluirDisciplinaDialog, {
      width: '400px',
      data: { nome: disciplina.nome },
    });

    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }
      this.disciplinaService.excluir(disciplina.id).subscribe({
        next: () => {
          this.notifications.success('Disciplina excluida com sucesso');
          this.carregar();
        },
      });
    });
  }
}
