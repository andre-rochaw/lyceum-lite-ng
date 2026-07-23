import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
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
import { AlunoService } from '../../../alunos/data/aluno.service';
import { AlunoResponse } from '../../../alunos/models/aluno.models';
import { TurmaService } from '../../../turmas/data/turma.service';
import { TurmaResponse } from '../../../turmas/models/turma.models';
import { MatriculaService } from '../../data/matricula.service';
import {
  STATUS_MATRICULA_OPTIONS,
  StatusMatricula,
  MatriculaResponse,
} from '../../models/matricula.models';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-matricula-list',
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
  templateUrl: './matricula-list.html',
  styleUrl: './matricula-list.css',
})
export class MatriculaList implements OnInit {
  private readonly matriculaService = inject(MatriculaService);
  private readonly alunoService = inject(AlunoService);
  private readonly turmaService = inject(TurmaService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly statusOptions = STATUS_MATRICULA_OPTIONS;
  readonly displayedColumns = [
    'alunoNome',
    'turmaNome',
    'disciplinaNome',
    'cursoNome',
    'status',
    'acoes',
  ];
  readonly matriculas = signal<MatriculaResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly empty = signal(false);
  readonly actionInProgress = signal(false);

  readonly alunosSugestoes = signal<AlunoResponse[]>([]);
  readonly emptyAlunos = signal(false);
  readonly turmasSugestoes = signal<TurmaResponse[]>([]);
  readonly emptyTurmas = signal(false);

  private selectedAlunoNome: string | null = null;
  private selectedTurmaNome: string | null = null;

  readonly filtros = this.fb.nonNullable.group({
    alunoBusca: [''],
    alunoId: [null as string | null],
    turmaBusca: [''],
    turmaId: [null as string | null],
    status: [null as StatusMatricula | null],
  });

  ngOnInit(): void {
    this.filtros.controls.alunoBusca.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((termo) => {
          if (termo && typeof termo === 'object' && 'id' in termo) {
            return of(null);
          }
          const trimmed = String(termo ?? '').trim();
          if (this.selectedAlunoNome !== null && trimmed !== this.selectedAlunoNome) {
            this.filtros.controls.alunoId.setValue(null);
            this.selectedAlunoNome = null;
          }
          if (trimmed.length < 1) {
            this.alunosSugestoes.set([]);
            return of(null);
          }
          return this.alunoService.listar({
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
            this.emptyAlunos.set(true);
            return;
          }
          this.emptyAlunos.set(false);
          this.alunosSugestoes.set(result.content ?? []);
        },
      });

    this.filtros.controls.turmaBusca.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((termo) => {
          if (termo && typeof termo === 'object' && 'id' in termo) {
            return of(null);
          }
          const trimmed = String(termo ?? '').trim();
          if (this.selectedTurmaNome !== null && trimmed !== this.selectedTurmaNome) {
            this.filtros.controls.turmaId.setValue(null);
            this.selectedTurmaNome = null;
          }
          if (trimmed.length < 1) {
            this.turmasSugestoes.set([]);
            return of(null);
          }
          return this.turmaService.listar({
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
            this.emptyTurmas.set(true);
            return;
          }
          this.emptyTurmas.set(false);
          this.turmasSugestoes.set(result.content ?? []);
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
    this.selectedAlunoNome = null;
    this.selectedTurmaNome = null;
    this.alunosSugestoes.set([]);
    this.turmasSugestoes.set([]);
    this.emptyAlunos.set(false);
    this.emptyTurmas.set(false);
    this.filtros.reset({
      alunoBusca: '',
      alunoId: null,
      turmaBusca: '',
      turmaId: null,
      status: null,
    });
    this.pageIndex.set(0);
    this.carregar();
  }

  onAlunoSelected(event: MatAutocompleteSelectedEvent): void {
    const aluno = event.option.value as AlunoResponse | null;
    if (!aluno?.id) {
      return;
    }
    this.selectedAlunoNome = aluno.nome;
    this.filtros.controls.alunoId.setValue(aluno.id);
    this.filtros.controls.alunoBusca.setValue(aluno.nome, { emitEvent: false });
  }

  onTurmaSelected(event: MatAutocompleteSelectedEvent): void {
    const turma = event.option.value as TurmaResponse | null;
    if (!turma?.id) {
      return;
    }
    this.selectedTurmaNome = turma.nome;
    this.filtros.controls.turmaId.setValue(turma.id);
    this.filtros.controls.turmaBusca.setValue(turma.nome, { emitEvent: false });
  }

  displayAluno = (value: string | AlunoResponse | null): string => {
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return value.nome;
  };

  displayTurma = (value: string | TurmaResponse | null): string => {
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return value.nome;
  };

  podeConfirmar(row: MatriculaResponse): boolean {
    return row.status === 'PENDENTE';
  }

  podeCancelar(row: MatriculaResponse): boolean {
    return row.status === 'PENDENTE' || row.status === 'CONFIRMADA';
  }

  carregar(): void {
    const raw = this.filtros.getRawValue();
    this.matriculaService
      .listar({
        page: this.pageIndex(),
        size: this.pageSize(),
        alunoId: raw.alunoId || undefined,
        turmaId: raw.turmaId || undefined,
        status: raw.status || undefined,
      })
      .subscribe({
        next: (page) => {
          this.matriculas.set(page.content ?? []);
          this.totalElements.set(page.totalElements ?? 0);
          this.empty.set((page.content ?? []).length === 0);
        },
      });
  }

  confirmar(row: MatriculaResponse): void {
    if (!this.podeConfirmar(row) || this.actionInProgress()) {
      return;
    }
    this.actionInProgress.set(true);
    this.matriculaService.confirmar(row.id).subscribe({
      next: () => {
        this.notifications.success('Matricula confirmada com sucesso');
        this.actionInProgress.set(false);
        this.carregar();
      },
      error: () => {
        this.actionInProgress.set(false);
      },
    });
  }

  cancelar(row: MatriculaResponse): void {
    if (!this.podeCancelar(row) || this.actionInProgress()) {
      return;
    }
    this.actionInProgress.set(true);
    this.matriculaService.cancelar(row.id).subscribe({
      next: () => {
        this.notifications.success('Matricula cancelada com sucesso');
        this.actionInProgress.set(false);
        this.carregar();
      },
      error: () => {
        this.actionInProgress.set(false);
      },
    });
  }
}
