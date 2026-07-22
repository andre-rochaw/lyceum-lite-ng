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
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
} from 'rxjs';
import { CursoService } from '../../../cursos/data/curso.service';
import { CursoResponse } from '../../../cursos/models/curso.models';
import { DisciplinaService } from '../../data/disciplina.service';
import { DisciplinaRequest } from '../../models/disciplina.models';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-disciplina-form',
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
  templateUrl: './disciplina-form.html',
  styleUrl: './disciplina-form.css',
})
export class DisciplinaForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly disciplinaService = inject(DisciplinaService);
  private readonly cursoService = inject(CursoService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly disciplinaId = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly submitting = signal(false);
  readonly loading = signal(false);
  readonly cursosSugestoes = signal<CursoResponse[]>([]);
  readonly emptyCursos = signal(false);

  private selectedCursoNome: string | null = null;

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    descricao: ['', [Validators.maxLength(500)]],
    cargaHoraria: [null as number | null, [Validators.required, Validators.min(1)]],
    creditos: [null as number | null, [Validators.required, Validators.min(1)]],
    semestreRecomendado: [null as number | null, [Validators.required, Validators.min(1)]],
    ementa: ['', [Validators.required, Validators.maxLength(2000)]],
    cursoBusca: ['', Validators.required],
    cursoId: [null as string | null, Validators.required],
  });

  ngOnInit(): void {
    this.form.controls.cursoBusca.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((termo) => {
          if (termo && typeof termo === 'object' && 'id' in termo) {
            return of(null);
          }
          const trimmed = String(termo ?? '').trim();
          if (this.selectedCursoNome !== null && trimmed !== this.selectedCursoNome) {
            this.form.controls.cursoId.setValue(null);
            this.selectedCursoNome = null;
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

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.disciplinaId.set(id);
    this.isEdit.set(true);
    this.loading.set(true);
    this.disciplinaService.buscarPorId(id).subscribe({
      next: (disciplina) => {
        this.selectedCursoNome = disciplina.cursoNome;
        this.form.patchValue({
          nome: disciplina.nome,
          descricao: disciplina.descricao ?? '',
          cargaHoraria: disciplina.cargaHoraria,
          creditos: disciplina.creditos,
          semestreRecomendado: disciplina.semestreRecomendado,
          ementa: disciplina.ementa,
          cursoBusca: disciplina.cursoNome,
          cursoId: disciplina.cursoId,
        });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 404) {
          void this.router.navigateByUrl('/disciplinas');
        }
      },
    });
  }

  onCursoSelected(event: MatAutocompleteSelectedEvent): void {
    const curso = event.option.value as CursoResponse;
    this.selectedCursoNome = curso.nome;
    this.form.controls.cursoId.setValue(curso.id);
    this.form.controls.cursoBusca.setValue(curso.nome, { emitEvent: false });
    this.form.controls.cursoBusca.updateValueAndValidity({ emitEvent: false });
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

  submit(): void {
    if (this.form.invalid || !this.form.controls.cursoId.value) {
      this.form.markAllAsTouched();
      if (!this.form.controls.cursoId.value) {
        this.form.controls.cursoBusca.setErrors({ cursoNaoSelecionado: true });
      }
      this.notifications.error('Preencha os campos corretamente antes de salvar.');
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const body: DisciplinaRequest = {
      nome: raw.nome.trim(),
      descricao: this.normalizarDescricao(raw.descricao),
      cargaHoraria: Number(raw.cargaHoraria),
      creditos: Number(raw.creditos),
      semestreRecomendado: Number(raw.semestreRecomendado),
      ementa: raw.ementa.trim(),
      cursoId: raw.cursoId as string,
    };
    const id = this.disciplinaId();
    const request$ =
      id === null
        ? this.disciplinaService.criar(body)
        : this.disciplinaService.editar(id, body);

    request$.subscribe({
      next: () => {
        this.notifications.success(
          id === null
            ? 'Disciplina criada com sucesso'
            : 'Disciplina atualizada com sucesso',
        );
        void this.router.navigateByUrl('/disciplinas');
        this.submitting.set(false);
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }

  private normalizarDescricao(descricao: string): string | null {
    const trimmed = descricao.trim();
    if (trimmed.length < 1) {
      this.cursosSugestoes.set([]);
      this.emptyCursos.set(true);
    }
    return trimmed;
  }
}
