import { HttpErrorResponse } from '@angular/common/http';
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
import { CursoService } from '../../data/curso.service';
import { CursoRequest } from '../../models/curso.models';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-curso-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './curso-form.html',
  styleUrl: './curso-form.css',
})
export class CursoForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cursoService = inject(CursoService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly cursoId = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly submitting = signal(false);
  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    descricao: ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.cursoId.set(id);
    this.isEdit.set(true);
    this.loading.set(true);
    this.cursoService.buscarPorId(id).subscribe({
      next: (curso) => {
        this.form.setValue({
          nome: curso.nome,
          descricao: curso.descricao ?? '',
        });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 404) {
          void this.router.navigateByUrl('/cursos');
        }
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notifications.error('Preencha os campos corretamente antes de salvar.');
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const body: CursoRequest = {
      nome: raw.nome.trim(),
      descricao: this.normalizarDescricao(raw.descricao),
    };
    const id = this.cursoId();
    const request$ =
      id === null
        ? this.cursoService.criar(body)
        : this.cursoService.editar(id, body);

    request$.subscribe({
      next: () => {
        this.notifications.success(
          id === null ? 'Curso criado com sucesso' : 'Curso atualizado com sucesso',
        );
        void this.router.navigateByUrl('/cursos');
        this.submitting.set(false);
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }

  private normalizarDescricao(descricao: string): string | null {
    const trimmed = descricao.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
}
