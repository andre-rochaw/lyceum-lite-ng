import { Routes } from '@angular/router';

export const ALUNOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/aluno-list/aluno-list').then((m) => m.AlunoList),
  },
  {
    path: 'novo',
    loadComponent: () =>
      import('./pages/aluno-form/aluno-form').then((m) => m.AlunoForm),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/aluno-form/aluno-form').then((m) => m.AlunoForm),
  },
];
