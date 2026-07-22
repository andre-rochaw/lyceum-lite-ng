import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
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
import { DisciplinaService } from '../../../disciplinas/data/disciplina.service';
import { DisciplinaResponse } from '../../../disciplinas/models/disciplina.models';
import { ConfirmExcluirTurmaDialog } from '../../components/confirm-excluir-turma-dialog';
import { TurmaService } from '../../data/turma.service';
import {
  STATUS_TURMA_OPTIONS,
  StatusTurma,
  TurmaResponse,
} from '../../models/turma.models';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-turma-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
  ],
  templateUrl: './turma-list.html',
  styleUrl: './turma-list.css',
})
export class TurmaList implements OnInit {
  private readonly turmaService = inject(TurmaService);
  private readonly disciplinaService = inject(DisciplinaService);
  private readonly cursoService = inject(CursoService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly statusOptions = STATUS_TURMA_OPTIONS;
  readonly displayedColumns = [
    'nome',
    'disciplinaNome',
    'cursoNome',
    'ano',
    'semestre',
    'status',
    'limiteVagas',
    'vagasOcupadas',
    'acoes',
  ];
  readonly turmas = signal<TurmaResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly empty = signal(false);

  readonly disciplinasSugestoes = signal<DisciplinaResponse[]>([]);
  readonly emptyDisciplinas = signal(false);
  readonly cursosSugestoes = signal<CursoResponse[]>([]);
  readonly emptyCursos = signal(false);

  private selectedDisciplinaNome: string | null = null;
  private selectedCursoNome: string | null = null;

  readonly filtros = this.fb.nonNullable.group({
    nome: [''],
    disciplinaBusca: [''],
    disciplinaId: [null as string | null],
    cursoBusca: [''],
    cursoId: [null as string | null],
    ano: [null as number | null],
    semestre: [null as number | null],
    status: [null as StatusTurma | null],
  });

  ngOnInit(): void {
    this.filtros.controls.disciplinaBusca.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((termo) => {
          if (termo && typeof termo === 'object' && 'id' in termo) {
            return of(null);
          }
          const trimmed = String(termo ?? '').trim();
          if (
            this.selectedDisciplinaNome !== null &&
            trimmed !== this.selectedDisciplinaNome
          ) {
            this.filtros.controls.disciplinaId.setValue(null);
            this.selectedDisciplinaNome = null;
          }
          if (trimmed.length < 1) {
            this.disciplinasSugestoes.set([]);
            return of(null);
          }
          return this.disciplinaService.listar({
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
          if (result == null || result.content.length === 0) {
            this.emptyDisciplinas.set(true);
            return;
          }
          this.emptyDisciplinas.set(false);
          this.disciplinasSugestoes.set(result.content ?? []);
        },
      });

    this.filtros.controls.cursoBusca.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((termo) => {
          if (termo && typeof termo === 'object' && 'id' in termo) {
            return of(null);
          }
          const trimmed = String(termo ?? '').trim();
          if (this.selectedCursoNome !== null && trimmed !== this.selectedCursoNome) {
            this.filtros.controls.cursoId.setValue(null);
            this.selectedCursoNome = null;
          }
          if (trimmed.length < 1) {
            this.cursosSugestoes.set([]);
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
          if (result == null || result.content.length === 0) {
            this.emptyCursos.set(true);
            return;
          }
          this.emptyCursos.set(false);
          this.cursosSugestoes.set(result.content ?? []);
        },
      });

    this.carregar();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.carregar();
  }

  aplicarFiltros(): void {
    this.pageIndex.set(0);
    this.carregar();
  }

  limparFiltros(): void {
    this.selectedDisciplinaNome = null;
    this.selectedCursoNome = null;
    this.disciplinasSugestoes.set([]);
    this.cursosSugestoes.set([]);
    this.emptyDisciplinas.set(false);
    this.emptyCursos.set(false);
    this.filtros.reset({
      nome: '',
      disciplinaBusca: '',
      disciplinaId: null,
      cursoBusca: '',
      cursoId: null,
      ano: null,
      semestre: null,
      status: null,
    });
    this.pageIndex.set(0);
    this.carregar();
  }

  onDisciplinaSelected(event: MatAutocompleteSelectedEvent): void {
    const disciplina = event.option.value as DisciplinaResponse | null;
    if (!disciplina?.id) {
      return;
    }
    this.selectedDisciplinaNome = disciplina.nome;
    this.filtros.controls.disciplinaId.setValue(disciplina.id);
    this.filtros.controls.disciplinaBusca.setValue(disciplina.nome, {
      emitEvent: false,
    });
  }

  onCursoSelected(event: MatAutocompleteSelectedEvent): void {
    const curso = event.option.value as CursoResponse | null;
    if (!curso?.id) {
      return;
    }
    this.selectedCursoNome = curso.nome;
    this.filtros.controls.cursoId.setValue(curso.id);
    this.filtros.controls.cursoBusca.setValue(curso.nome, { emitEvent: false });
  }

  displayDisciplina = (value: string | DisciplinaResponse | null): string => {
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return value.nome;
  };

  displayCurso = (value: string | CursoResponse | null): string => {
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return value.nome;
  };

  carregar(): void {
    const raw = this.filtros.getRawValue();
    const ano =
      raw.ano != null && String(raw.ano).trim() !== ''
        ? Number(raw.ano)
        : undefined;
    const semestre =
      raw.semestre != null && String(raw.semestre).trim() !== ''
        ? Number(raw.semestre)
        : undefined;

    this.turmaService
      .listar({
        page: this.pageIndex(),
        size: this.pageSize(),
        sort: 'nome',
        nome: raw.nome.trim() || undefined,
        disciplinaId: raw.disciplinaId || undefined,
        cursoId: raw.cursoId || undefined,
        ano: ano != null && !Number.isNaN(ano) ? ano : undefined,
        semestre:
          semestre != null && !Number.isNaN(semestre) ? semestre : undefined,
        status: raw.status || undefined,
      })
      .subscribe({
        next: (page) => {
          this.turmas.set(page.content ?? []);
          this.totalElements.set(page.totalElements ?? 0);
          this.empty.set((page.content ?? []).length === 0);
        },
      });
  }

  confirmarExclusao(turma: TurmaResponse): void {
    const ref = this.dialog.open(ConfirmExcluirTurmaDialog, {
      width: '400px',
      data: { nome: turma.nome },
    });

    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }
      this.turmaService.excluir(turma.id).subscribe({
        next: () => {
          this.notifications.success('Turma excluida com sucesso');
          this.carregar();
        },
      });
    });
  }
}
