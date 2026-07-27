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

export interface DisciplinaPickerResult {
  disciplinaId: string;
  disciplinaNome: string;
  cursoNome: string | null;
}

@Component({
  selector: 'app-disciplina-picker-dialog',
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
  templateUrl: './disciplina-picker-dialog.html',
  styleUrl: './disciplina-picker-dialog.css',
})
export class DisciplinaPickerDialog implements OnInit {
  private readonly dialogRef = inject(
    MatDialogRef<DisciplinaPickerDialog, DisciplinaPickerResult | undefined>,
  );
  private readonly disciplinaService = inject(DisciplinaService);
  private readonly cursoService = inject(CursoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly displayedColumns = [
    'selecao',
    'nome',
    'cursoNome',
    'cargaHoraria',
    'creditos',
    'semestreRecomendado',
  ];
  readonly disciplinas = signal<DisciplinaResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly empty = signal(false);
  readonly loading = signal(false);
  readonly cursoSelecionado = signal(false);

  readonly cursosSugestoes = signal<CursoResponse[]>([]);
  readonly emptyCursos = signal(false);
  readonly disciplinaSelecionada = signal<DisciplinaResponse | null>(null);

  private selectedCursoNome: string | null = null;

  readonly filtros = this.fb.nonNullable.group({
    cursoBusca: [''],
    cursoId: [null as string | null],
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
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.carregar();
  }

  aplicarFiltros(): void {
    this.pageIndex.set(0);
    this.disciplinaSelecionada.set(null);
    this.carregar();
  }

  limparFiltros(): void {
    this.selectedCursoNome = null;
    this.disciplinaSelecionada.set(null);
    this.cursosSugestoes.set([]);
    this.emptyCursos.set(false);
    this.cursoSelecionado.set(false);
    this.disciplinas.set([]);
    this.totalElements.set(0);
    this.empty.set(false);
    this.filtros.reset({
      cursoBusca: '',
      cursoId: null,
      nome: '',
    });
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
    this.filtros.controls.nome.enable({ emitEvent: false });
    this.cursoSelecionado.set(true);
    this.disciplinaSelecionada.set(null);
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

  isDisciplinaSelecionada(disciplina: DisciplinaResponse): boolean {
    return this.disciplinaSelecionada()?.id === disciplina.id;
  }

  onDisciplinaCheck(disciplina: DisciplinaResponse, checked: boolean): void {
    if (!checked) {
      this.disciplinaSelecionada.set(null);
      return;
    }
    this.disciplinaSelecionada.set(disciplina);
    this.dialogRef.close({
      disciplinaId: disciplina.id,
      disciplinaNome: disciplina.nome,
      cursoNome: disciplina.cursoNome ?? null,
    });
  }

  carregar(): void {
    const cursoId = this.filtros.controls.cursoId.value;
    if (!cursoId) {
      this.cursoSelecionado.set(false);
      this.disciplinas.set([]);
      this.totalElements.set(0);
      this.empty.set(false);
      return;
    }

    this.cursoSelecionado.set(true);
    const raw = this.filtros.getRawValue();
    this.loading.set(true);
    this.disciplinaService
      .listar({
        page: this.pageIndex(),
        size: this.pageSize(),
        sort: 'nome',
        nome: raw.nome.trim() || undefined,
        cursoId,
      })
      .subscribe({
        next: (page) => {
          this.disciplinas.set(page.content ?? []);
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
    this.disciplinaSelecionada.set(null);
    this.disciplinas.set([]);
    this.totalElements.set(0);
    this.empty.set(false);
    this.filtros.controls.nome.disable({ emitEvent: false });
    if (resetBusca) {
      this.filtros.controls.cursoBusca.setValue('', { emitEvent: false });
    }
  }
}
