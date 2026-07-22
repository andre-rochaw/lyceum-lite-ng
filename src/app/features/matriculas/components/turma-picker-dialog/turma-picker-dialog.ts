import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
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
import { TurmaResponse } from '../../../turmas/models/turma.models';

export interface TurmaPickerResult {
  turmaId: string;
  turmaNome: string;
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
  ],
  templateUrl: './turma-picker-dialog.html',
  styleUrl: './turma-picker-dialog.css',
})
export class TurmaPickerDialog implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<TurmaPickerDialog, TurmaPickerResult | undefined>);
  private readonly turmaService = inject(TurmaService);
  private readonly disciplinaService = inject(DisciplinaService);
  private readonly cursoService = inject(CursoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly displayedColumns = [
    'nome',
    'disciplinaNome',
    'cursoNome',
    'ano',
    'semestre',
    'status',
    'vagas',
    'acoes',
  ];
  readonly turmas = signal<TurmaResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly empty = signal(false);
  readonly loading = signal(false);

  readonly cursosSugestoes = signal<CursoResponse[]>([]);
  readonly emptyCursos = signal(false);
  readonly disciplinasSugestoes = signal<DisciplinaResponse[]>([]);
  readonly emptyDisciplinas = signal(false);

  private selectedCursoNome: string | null = null;
  private selectedDisciplinaNome: string | null = null;

  readonly filtros = this.fb.nonNullable.group({
    cursoBusca: [''],
    cursoId: [null as string | null],
    disciplinaBusca: [''],
    disciplinaId: [null as string | null],
    nome: [''],
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
    this.selectedCursoNome = null;
    this.selectedDisciplinaNome = null;
    this.cursosSugestoes.set([]);
    this.disciplinasSugestoes.set([]);
    this.emptyCursos.set(false);
    this.emptyDisciplinas.set(false);
    this.filtros.reset({
      cursoBusca: '',
      cursoId: null,
      disciplinaBusca: '',
      disciplinaId: null,
      nome: '',
    });
    this.pageIndex.set(0);
    this.carregar();
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

  carregar(): void {
    const raw = this.filtros.getRawValue();
    this.loading.set(true);
    this.turmaService
      .listar({
        page: this.pageIndex(),
        size: this.pageSize(),
        sort: 'nome',
        nome: raw.nome.trim() || undefined,
        disciplinaId: raw.disciplinaId || undefined,
        cursoId: raw.cursoId || undefined,
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

  selecionar(turma: TurmaResponse): void {
    this.dialogRef.close({
      turmaId: turma.id,
      turmaNome: turma.nome,
    });
  }

  fechar(): void {
    this.dialogRef.close(undefined);
  }

  private limparCursoSelecionado(resetBusca: boolean): void {
    this.filtros.controls.cursoId.setValue(null);
    this.selectedCursoNome = null;
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
