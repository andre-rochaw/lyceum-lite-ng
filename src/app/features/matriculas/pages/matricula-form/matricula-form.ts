import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
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
import { CreateMatriculaRequest } from '../../models/matricula.models';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-matricula-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatIconModule,
  ],
  templateUrl: './matricula-form.html',
  styleUrl: './matricula-form.css',
})
export class MatriculaForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly matriculaService = inject(MatriculaService);
  private readonly alunoService = inject(AlunoService);
  private readonly turmaService = inject(TurmaService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly alunosSugestoes = signal<AlunoResponse[]>([]);
  readonly emptyAlunos = signal(false);
  readonly turmasSugestoes = signal<TurmaResponse[]>([]);
  readonly emptyTurmas = signal(false);

  private selectedAlunoNome: string | null = null;
  private selectedTurmaNome: string | null = null;

  readonly form = this.fb.nonNullable.group({
    alunoBusca: ['', Validators.required],
    alunoId: [null as string | null, Validators.required],
    turmaBusca: ['', Validators.required],
    turmaId: [null as string | null, Validators.required],
  });

  ngOnInit(): void {
    this.form.controls.alunoBusca.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((termo) => {
          if (termo && typeof termo === 'object' && 'id' in termo) {
            return of(null);
          }
          const trimmed = String(termo ?? '').trim();
          if (this.selectedAlunoNome !== null && trimmed !== this.selectedAlunoNome) {
            this.form.controls.alunoId.setValue(null);
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

    this.form.controls.turmaBusca.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((termo) => {
          if (termo && typeof termo === 'object' && 'id' in termo) {
            return of(null);
          }
          const trimmed = String(termo ?? '').trim();
          if (this.selectedTurmaNome !== null && trimmed !== this.selectedTurmaNome) {
            this.form.controls.turmaId.setValue(null);
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
            status: 'ABERTA',
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
  }

  onAlunoSelected(event: MatAutocompleteSelectedEvent): void {
    const aluno = event.option.value as AlunoResponse | null;
    if (!aluno?.id) {
      return;
    }
    this.selectedAlunoNome = aluno.nome;
    this.emptyAlunos.set(false);
    this.form.controls.alunoId.setValue(aluno.id);
    this.form.controls.alunoBusca.setValue(aluno.nome, { emitEvent: false });
    this.form.controls.alunoBusca.updateValueAndValidity({ emitEvent: false });
  }

  onTurmaSelected(event: MatAutocompleteSelectedEvent): void {
    const turma = event.option.value as TurmaResponse | null;
    if (!turma?.id) {
      return;
    }
    this.selectedTurmaNome = turma.nome;
    this.emptyTurmas.set(false);
    this.form.controls.turmaId.setValue(turma.id);
    this.form.controls.turmaBusca.setValue(turma.nome, { emitEvent: false });
    this.form.controls.turmaBusca.updateValueAndValidity({ emitEvent: false });
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

  submit(): void {
    if (
      this.form.invalid ||
      !this.form.controls.alunoId.value ||
      !this.form.controls.turmaId.value
    ) {
      this.form.markAllAsTouched();
      if (!this.form.controls.alunoId.value) {
        this.form.controls.alunoBusca.setErrors({ alunoNaoSelecionado: true });
      }
      if (!this.form.controls.turmaId.value) {
        this.form.controls.turmaBusca.setErrors({ turmaNaoSelecionada: true });
      }
      this.notifications.error(
        'Preencha os campos corretamente antes de salvar.',
      );
      return;
    }

    this.submitting.set(true);
    const body: CreateMatriculaRequest = {
      alunoId: this.form.controls.alunoId.value as string,
      turmaId: this.form.controls.turmaId.value as string,
    };

    this.matriculaService.criar(body).subscribe({
      next: () => {
        this.notifications.success('Matricula criada com sucesso');
        void this.router.navigateByUrl('/matriculas');
        this.submitting.set(false);
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }
}
