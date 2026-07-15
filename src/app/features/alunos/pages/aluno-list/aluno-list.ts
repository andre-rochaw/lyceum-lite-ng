import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { ConfirmExcluirAlunoDialog } from '../../components/confirm-excluir-aluno-dialog';
import { AlunoService } from '../../data/aluno.service';
import { AlunoResponse } from '../../models/aluno.models';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-aluno-list',
  imports: [
    RouterLink,
    DatePipe,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './aluno-list.html',
  styleUrl: './aluno-list.css',
})
export class AlunoList implements OnInit {
  private readonly alunoService = inject(AlunoService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);

  readonly displayedColumns = ['nome', 'email', 'cpf', 'dataNascimento', 'acoes'];
  readonly alunos = signal<AlunoResponse[]>([]);
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
    this.alunoService
      .listar({ page: this.pageIndex(), size: this.pageSize() })
      .subscribe({
        next: (page) => {
          this.alunos.set(page.content ?? []);
          this.totalElements.set(page.totalElements ?? 0);
          this.empty.set((page.content ?? []).length === 0);
        },
      });
  }

  confirmarExclusao(aluno: AlunoResponse): void {
    const ref = this.dialog.open(ConfirmExcluirAlunoDialog, {
      width: '400px',
      data: { nome: aluno.nome },
    });

    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }
      this.alunoService.excluir(aluno.id).subscribe({
        next: () => {
          this.notifications.success('Aluno excluido com sucesso');
          this.carregar();
        },
      });
    });
  }
}
