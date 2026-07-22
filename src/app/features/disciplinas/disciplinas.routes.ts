import { Routes } from '@angular/router';

export const DISCIPLINAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/disciplina-list/disciplina-list').then((m) => m.DisciplinaList),
  },
  {
    path: 'novo',
    loadComponent: () =>
      import('./pages/disciplina-form/disciplina-form').then((m) => m.DisciplinaForm),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/disciplina-form/disciplina-form').then((m) => m.DisciplinaForm),
  },
];
