import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AlunoService } from '../../data/aluno.service';
import { NotificationService } from '../../../../core/services/notification.service';

/** Alinha com Bean Validation A-001: 11 digitos ou mascara ###.###.###-##. */
const CPF_PATTERN = /^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/;

function formatCpf(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);
  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

@Component({
  selector: 'app-aluno-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './aluno-form.html',
  styleUrl: './aluno-form.css',
})
export class AlunoForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly alunoService = inject(AlunoService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly alunoId = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly submitting = signal(false);
  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    cpf: ['', [Validators.required, Validators.pattern(CPF_PATTERN)]],
    dataNascimento: ['', Validators.required],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.alunoId.set(id);
    this.isEdit.set(true);
    this.loading.set(true);
    this.alunoService.buscarPorId(id).subscribe({
      next: (aluno) => {
        this.form.setValue({
          nome: aluno.nome,
          email: aluno.email,
          cpf: formatCpf(aluno.cpf),
          dataNascimento: aluno.dataNascimento,
        });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 404) {
          void this.router.navigateByUrl('/alunos');
        }
      },
    });
  }

  onCpfInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatCpf(input.value);
    this.form.controls.cpf.setValue(formatted, { emitEvent: false });
    input.value = formatted;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notifications.error('Preencha os campos corretamente antes de salvar.');
      return;
    }

    this.submitting.set(true);
    const body = this.form.getRawValue();
    const id = this.alunoId();
    const request$ =
      id === null
        ? this.alunoService.criar(body)
        : this.alunoService.editar(id, body);

    request$.subscribe({
      next: () => {
        this.notifications.success(
          id === null ? 'Aluno criado com sucesso' : 'Aluno atualizado com sucesso',
        );
        void this.router.navigateByUrl('/alunos');
        this.submitting.set(false);
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }
}
