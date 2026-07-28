import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
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
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import {
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
} from 'rxjs';
import { AlunoService } from '../../../alunos/data/aluno.service';
import { AlunoResponse } from '../../../alunos/models/aluno.models';
import {
  TurmaPickerDialog,
  TurmaPickerResult,
} from '../../components/turma-picker-dialog/turma-picker-dialog';
import { MatriculaService } from '../../data/matricula.service';
import { CreateMatriculaRequest } from '../../models/matricula.models';
import { StatusTurma } from '../../../turmas/models/turma.models';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ocupacaoPercent,
  vagasDisponiveis,
} from '../../../../shared/utils/vagas';

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
    MatChipsModule,
    MatProgressBarModule,
  ],
  templateUrl: './matricula-form.html',
  styleUrl: './matricula-form.css',
})
export class MatriculaForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly matriculaService = inject(MatriculaService);
  private readonly alunoService = inject(AlunoService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly alunosSugestoes = signal<AlunoResponse[]>([]);
  readonly emptyAlunos = signal(false);
  readonly turmaSelecionada = signal<TurmaPickerResult | null>(null);

  readonly vagasDisponiveisTurma = computed(() => {
    const turma = this.turmaSelecionada();
    if (!turma) {
      return 0;
    }
    return vagasDisponiveis(turma.vagasOcupadas, turma.limiteVagas);
  });

  readonly ocupacaoPct = computed(() => {
    const turma = this.turmaSelecionada();
    if (!turma) {
      return 0;
    }
    return ocupacaoPercent(turma.vagasOcupadas, turma.limiteVagas);
  });

  private selectedAlunoNome: string | null = null;

  readonly form = this.fb.nonNullable.group({
    alunoBusca: ['', Validators.required],
    alunoId: [null as string | null, Validators.required],
    turmaNome: ['', Validators.required],
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

  displayAluno = (value: string | AlunoResponse | null): string => {
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return value.nome;
  };

  statusTurmaLabel(status: StatusTurma): string {
    switch (status) {
      case 'ABERTA':
        return 'Aberta';
      case 'CONCLUIDA':
        return 'Concluida';
      case 'EM_AVALIACAO':
        return 'Em avaliacao';
      default:
        return status;
    }
  }

  statusTurmaChipClass(status: StatusTurma): string {
    switch (status) {
      case 'ABERTA':
        return 'status-chip status-chip--aberta';
      case 'CONCLUIDA':
        return 'status-chip status-chip--concluida';
      case 'EM_AVALIACAO':
        return 'status-chip status-chip--em-avaliacao';
      default:
        return 'status-chip';
    }
  }

  statusTurmaDotClass(status: StatusTurma): string {
    switch (status) {
      case 'ABERTA':
        return 'status-dot status-dot--aberta';
      case 'CONCLUIDA':
        return 'status-dot status-dot--concluida';
      case 'EM_AVALIACAO':
        return 'status-dot status-dot--em-avaliacao';
      default:
        return 'status-dot';
    }
  }

  abrirBuscaTurma(): void {
    const ref = this.dialog.open(TurmaPickerDialog, {
      width: '960px',
      maxWidth: '96vw',
      autoFocus: 'first-heading',
    });

    ref.afterClosed().subscribe((result: TurmaPickerResult | undefined) => {
      if (!result?.turmaId) {
        return;
      }
      this.turmaSelecionada.set(result);
      this.form.controls.turmaId.setValue(result.turmaId);
      this.form.controls.turmaNome.setValue(result.turmaNome);
      this.form.controls.turmaNome.updateValueAndValidity();
      this.form.controls.turmaId.updateValueAndValidity();
    });
  }

  limparTurma(): void {
    this.turmaSelecionada.set(null);
    this.form.controls.turmaId.setValue(null);
    this.form.controls.turmaNome.setValue('');
  }

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
        this.form.controls.turmaNome.setErrors({ turmaNaoSelecionada: true });
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
