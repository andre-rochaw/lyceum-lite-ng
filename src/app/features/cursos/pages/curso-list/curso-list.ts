import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmExcluirCursoDialog } from '../../components/confirm-excluir-curso-dialog';
import { CursoService } from '../../data/curso.service';
import { CursoResponse } from '../../models/curso.models';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-curso-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './curso-list.html',
  styleUrl: './curso-list.css',
})
export class CursoList implements OnInit {
  private readonly cursoService = inject(CursoService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = ['nome', 'descricao', 'acoes'];
  readonly cursos = signal<CursoResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly empty = signal(false);
  readonly nomeFiltro = signal('');
  readonly buscaControl = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.buscaControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => {
        this.nomeFiltro.set(valor.trim());
        this.pageIndex.set(0);
        this.carregar();
      });

    this.carregar();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.carregar();
  }

  carregar(): void {
    this.cursoService
      .listar({
        page: this.pageIndex(),
        size: this.pageSize(),
        sort: 'nome',
        nome: this.nomeFiltro() || undefined,
      })
      .subscribe({
        next: (page) => {
          this.cursos.set(page.content ?? []);
          this.totalElements.set(page.totalElements ?? 0);
          this.empty.set((page.content ?? []).length === 0);
        },
      });
  }

  confirmarExclusao(curso: CursoResponse): void {
    const ref = this.dialog.open(ConfirmExcluirCursoDialog, {
      width: '400px',
      data: { nome: curso.nome },
    });

    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }
      this.cursoService.excluir(curso.id).subscribe({
        next: () => {
          this.notifications.success('Curso excluido com sucesso');
          this.carregar();
        },
      });
    });
  }
}
