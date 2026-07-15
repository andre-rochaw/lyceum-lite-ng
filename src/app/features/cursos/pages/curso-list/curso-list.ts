import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { ConfirmExcluirCursoDialog } from '../../components/confirm-excluir-curso-dialog';
import { CursoService } from '../../data/curso.service';
import { CursoResponse } from '../../models/curso.models';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-curso-list',
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './curso-list.html',
  styleUrl: './curso-list.css',
})
export class CursoList implements OnInit {
  private readonly cursoService = inject(CursoService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  readonly displayedColumns = ['nome', 'descricao', 'acoes'];
  readonly cursos = signal<CursoResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly empty = signal(false);

  ngOnInit(): void {
    this.carregar();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.carregar();
  }

  carregar(): void {
    this.cursoService
      .listar({ page: this.pageIndex(), size: this.pageSize(), sort: 'nome' })
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
