import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
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
import { TurmaService } from '../../../turmas/data/turma.service';
import {
  StatusTurma,
  TurmaResponse,
} from '../../../turmas/models/turma.models';

export interface TurmaPickerResult {
  turmaId: string;
  turmaNome: string;
  disciplinaNome: string;
  cursoNome: string;
  status: StatusTurma;
  limiteVagas: number;
  vagasOcupadas: number;
}

@Component({
  selector: 'app-turma-picker-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
  ],
  templateUrl: './turma-picker-dialog.html',
  styleUrl: './turma-picker-dialog.css',
})
export class TurmaPickerDialog implements OnInit {
  private readonly dialogRef = inject(
    MatDialogRef<TurmaPickerDialog, TurmaPickerResult | undefined>,
  );
  private readonly turmaService = inject(TurmaService);
  private readonly disciplinaService = inject(DisciplinaService);
  private readonly cursoService = inject(CursoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly displayedColumns = [
    'selecao',
    'nome',
    'disciplinaNome',
    'cursoNome',
    'ano',
    'semestre',
    'status',
    'vagas',
  ];
  readonly turmas = signal<TurmaResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly empty = signal(false);
  readonly loading = signal(false);
  readonly cursoSelecionado = signal(false);
  readonly turmaSelecionada = signal<TurmaResponse | null>(null);

  readonly cursosSugestoes = signal<CursoResponse[]>([]);
  readonly emptyCursos = signal(false);
  readonly disciplinasSugestoes = signal<DisciplinaResponse[]>([]);
  readonly emptyDisciplinas = signal(false);

  private selectedCursoNome: string | null = null;
  private selectedDisciplinaNome: string | null = null;

  readonly filtros = this.fb.nonNullable.group({
    cursoBusca: [''],
    cursoId: [null as string | null],
    disciplinaBusca: [{ value: '', disabled: true }],
    disciplinaId: [null as string | null],
    nome: [{ value: '', disabled: true }],
  });

  ngOnInit(): void {
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
            this.limparCursoSelecionado(false);
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

    this.filtros.controls.disciplinaBusca.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((termo) => {
          if (termo && typeof termo === 'object' && 'id' in termo) {
            return of(null);
          }
          if (!this.filtros.controls.cursoId.value) {
            this.disciplinasSugestoes.set([]);
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
            cursoId: this.filtros.controls.cursoId.value || undefined,
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
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.carregar();
  }

  aplicarFiltros(): void {
    this.pageIndex.set(0);
    this.turmaSelecionada.set(null);
    this.carregar();
  }

  limparFiltros(): void {
    this.selectedCursoNome = null;
    this.selectedDisciplinaNome = null;
    this.turmaSelecionada.set(null);
    this.cursosSugestoes.set([]);
    this.disciplinasSugestoes.set([]);
    this.emptyCursos.set(false);
    this.emptyDisciplinas.set(false);
    this.cursoSelecionado.set(false);
    this.turmas.set([]);
    this.totalElements.set(0);
    this.empty.set(false);
    this.filtros.reset({
      cursoBusca: '',
      cursoId: null,
      disciplinaBusca: '',
      disciplinaId: null,
      nome: '',
    });
    this.filtros.controls.disciplinaBusca.disable({ emitEvent: false });
    this.filtros.controls.nome.disable({ emitEvent: false });
    this.pageIndex.set(0);
  }

  onCursoSelected(event: MatAutocompleteSelectedEvent): void {
    const curso = event.option.value as CursoResponse | null;
    if (!curso?.id) {
      return;
    }
    this.selectedCursoNome = curso.nome;
    this.emptyCursos.set(false);
    this.filtros.controls.cursoId.setValue(curso.id);
    this.filtros.controls.cursoBusca.setValue(curso.nome, { emitEvent: false });
    this.limparDisciplinaSelecionada();
    this.filtros.controls.disciplinaBusca.enable({ emitEvent: false });
    this.filtros.controls.nome.enable({ emitEvent: false });
    this.cursoSelecionado.set(true);
    this.turmaSelecionada.set(null);
    this.pageIndex.set(0);
    this.carregar();
  }

  onDisciplinaSelected(event: MatAutocompleteSelectedEvent): void {
    const disciplina = event.option.value as DisciplinaResponse | null;
    if (!disciplina?.id) {
      return;
    }
    this.selectedDisciplinaNome = disciplina.nome;
    this.emptyDisciplinas.set(false);
    this.filtros.controls.disciplinaId.setValue(disciplina.id);
    this.filtros.controls.disciplinaBusca.setValue(disciplina.nome, {
      emitEvent: false,
    });
    this.turmaSelecionada.set(null);
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

  displayDisciplina = (value: string | DisciplinaResponse | null): string => {
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return value.nome;
  };

  isTurmaSelecionada(turma: TurmaResponse): boolean {
    return this.turmaSelecionada()?.id === turma.id;
  }

  onTurmaCheck(turma: TurmaResponse, checked: boolean): void {
    if (!checked) {
      this.turmaSelecionada.set(null);
      return;
    }
    this.turmaSelecionada.set(turma);
    this.dialogRef.close({
      turmaId: turma.id,
      turmaNome: turma.nome,
      disciplinaNome: turma.disciplinaNome,
      cursoNome: turma.cursoNome,
      status: turma.status,
      limiteVagas: turma.limiteVagas,
      vagasOcupadas: turma.vagasOcupadas,
    });
  }

  carregar(): void {
    const cursoId = this.filtros.controls.cursoId.value;
    if (!cursoId) {
      this.cursoSelecionado.set(false);
      this.turmas.set([]);
      this.totalElements.set(0);
      this.empty.set(false);
      return;
    }

    this.cursoSelecionado.set(true);
    const raw = this.filtros.getRawValue();
    this.loading.set(true);
    this.turmaService
      .listar({
        page: this.pageIndex(),
        size: this.pageSize(),
        sort: 'nome',
        nome: raw.nome.trim() || undefined,
        disciplinaId: raw.disciplinaId || undefined,
        cursoId,
        status: 'ABERTA',
      })
      .subscribe({
        next: (page) => {
          this.turmas.set(page.content ?? []);
          this.totalElements.set(page.totalElements ?? 0);
          this.empty.set((page.content ?? []).length === 0);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  fechar(): void {
    this.dialogRef.close(undefined);
  }

  private limparCursoSelecionado(resetBusca: boolean): void {
    this.filtros.controls.cursoId.setValue(null);
    this.selectedCursoNome = null;
    this.cursoSelecionado.set(false);
    this.turmaSelecionada.set(null);
    this.turmas.set([]);
    this.totalElements.set(0);
    this.empty.set(false);
    this.filtros.controls.disciplinaBusca.disable({ emitEvent: false });
    this.filtros.controls.nome.disable({ emitEvent: false });
    if (resetBusca) {
      this.filtros.controls.cursoBusca.setValue('', { emitEvent: false });
    }
    this.limparDisciplinaSelecionada();
  }

  private limparDisciplinaSelecionada(): void {
    this.filtros.controls.disciplinaId.setValue(null);
    this.selectedDisciplinaNome = null;
    this.filtros.controls.disciplinaBusca.setValue('', { emitEvent: false });
    this.disciplinasSugestoes.set([]);
    this.emptyDisciplinas.set(false);
  }
}
