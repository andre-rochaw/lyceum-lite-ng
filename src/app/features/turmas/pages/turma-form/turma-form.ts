import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  DisciplinaPickerDialog,
  DisciplinaPickerResult,
} from '../../components/disciplina-picker-dialog/disciplina-picker-dialog';
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
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './turma-form.html',
  styleUrl: './turma-form.css',
})
export class TurmaForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly turmaService = inject(TurmaService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly statusOptions = STATUS_TURMA_OPTIONS;
  readonly turmaId = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly submitting = signal(false);
  readonly loading = signal(false);
  readonly vagasOcupadas = signal<number | null>(null);
  readonly cursoNome = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    disciplinaNome: ['', Validators.required],
    disciplinaId: [null as string | null, Validators.required],
    ano: [null as number | null, [Validators.required, Validators.min(1)]],
    semestre: [null as number | null, [Validators.required, Validators.min(1)]],
    limiteVagas: [null as number | null, [Validators.required, Validators.min(1)]],
    status: [null as StatusTurma | null, Validators.required],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.turmaId.set(id);
    this.isEdit.set(true);
    this.loading.set(true);
    this.turmaService.buscarPorId(id).subscribe({
      next: (turma) => {
        this.vagasOcupadas.set(turma.vagasOcupadas);
        this.cursoNome.set(turma.cursoNome);
        this.form.patchValue({
          nome: turma.nome,
          disciplinaNome: turma.disciplinaNome,
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

  abrirBuscaDisciplina(): void {
    const ref = this.dialog.open(DisciplinaPickerDialog, {
      width: '960px',
      maxWidth: '96vw',
      autoFocus: 'first-heading',
    });

    ref.afterClosed().subscribe((result: DisciplinaPickerResult | undefined) => {
      if (!result?.disciplinaId) {
        return;
      }
      this.form.controls.disciplinaId.setValue(result.disciplinaId);
      this.form.controls.disciplinaNome.setValue(result.disciplinaNome);
      this.cursoNome.set(result.cursoNome);
      this.form.controls.disciplinaNome.updateValueAndValidity();
      this.form.controls.disciplinaId.updateValueAndValidity();
    });
  }

  limparDisciplina(): void {
    this.form.controls.disciplinaId.setValue(null);
    this.form.controls.disciplinaNome.setValue('');
    this.cursoNome.set(null);
  }

  submit(): void {
    if (this.form.invalid || !this.form.controls.disciplinaId.value) {
      this.form.markAllAsTouched();
      if (!this.form.controls.disciplinaId.value) {
        this.form.controls.disciplinaNome.setErrors({
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
