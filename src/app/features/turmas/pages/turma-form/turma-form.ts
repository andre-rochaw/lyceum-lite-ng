import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
} from 'rxjs';
import { DisciplinaService } from '../../../disciplinas/data/disciplina.service';
import { DisciplinaResponse } from '../../../disciplinas/models/disciplina.models';
import { TurmaService } from '../../data/turma.service';
import {
  STATUS_TURMA_OPTIONS,
  StatusTurma,
  TurmaRequest,
} from '../../models/turma.models';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-turma-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './turma-form.html',
  styleUrl: './turma-form.css',
})
export class TurmaForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly turmaService = inject(TurmaService);
  private readonly disciplinaService = inject(DisciplinaService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly statusOptions = STATUS_TURMA_OPTIONS;
  readonly turmaId = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly submitting = signal(false);
  readonly loading = signal(false);
  readonly disciplinasSugestoes = signal<DisciplinaResponse[]>([]);
  readonly emptyDisciplinas = signal(false);
  readonly vagasOcupadas = signal<number | null>(null);
  readonly cursoNome = signal<string | null>(null);

  private selectedDisciplinaNome: string | null = null;

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    disciplinaBusca: ['', Validators.required],
    disciplinaId: [null as string | null, Validators.required],
    ano: [null as number | null, [Validators.required, Validators.min(1)]],
    semestre: [null as number | null, [Validators.required, Validators.min(1)]],
    limiteVagas: [null as number | null, [Validators.required, Validators.min(1)]],
    status: [null as StatusTurma | null, Validators.required],
  });

  ngOnInit(): void {
    this.form.controls.disciplinaBusca.valueChanges
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
            this.form.controls.disciplinaId.setValue(null);
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

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.turmaId.set(id);
    this.isEdit.set(true);
    this.loading.set(true);
    this.turmaService.buscarPorId(id).subscribe({
      next: (turma) => {
        this.selectedDisciplinaNome = turma.disciplinaNome;
        this.vagasOcupadas.set(turma.vagasOcupadas);
        this.cursoNome.set(turma.cursoNome);
        this.form.patchValue({
          nome: turma.nome,
          disciplinaBusca: turma.disciplinaNome,
          disciplinaId: turma.disciplinaId,
          ano: turma.ano,
          semestre: turma.semestre,
          limiteVagas: turma.limiteVagas,
          status: turma.status,
        });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 404) {
          void this.router.navigateByUrl('/turmas');
        }
      },
    });
  }

  onDisciplinaSelected(event: MatAutocompleteSelectedEvent): void {
    const disciplina = event.option.value as DisciplinaResponse | null;
    if (!disciplina?.id) {
      return;
    }
    this.selectedDisciplinaNome = disciplina.nome;
    this.emptyDisciplinas.set(false);
    this.form.controls.disciplinaId.setValue(disciplina.id);
    this.form.controls.disciplinaBusca.setValue(disciplina.nome, {
      emitEvent: false,
    });
    this.form.controls.disciplinaBusca.updateValueAndValidity({
      emitEvent: false,
    });
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

  submit(): void {
    if (this.form.invalid || !this.form.controls.disciplinaId.value) {
      this.form.markAllAsTouched();
      if (!this.form.controls.disciplinaId.value) {
        this.form.controls.disciplinaBusca.setErrors({
          disciplinaNaoSelecionada: true,
        });
      }
      this.notifications.error('Preencha os campos corretamente antes de salvar.');
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const body: TurmaRequest = {
      nome: raw.nome.trim(),
      disciplinaId: raw.disciplinaId as string,
      ano: Number(raw.ano),
      semestre: Number(raw.semestre),
      limiteVagas: Number(raw.limiteVagas),
      status: raw.status as StatusTurma,
    };
    const id = this.turmaId();
    const request$ =
      id === null
        ? this.turmaService.criar(body)
        : this.turmaService.editar(id, body);

    request$.subscribe({
      next: () => {
        this.notifications.success(
          id === null ? 'Turma criada com sucesso' : 'Turma atualizada com sucesso',
        );
        void this.router.navigateByUrl('/turmas');
        this.submitting.set(false);
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }
}
