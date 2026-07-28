import { Sort, SortDirection } from '@angular/material/sort';

/** Converte evento MatSort para o formato Spring Pageable (`campo,asc|desc`). */
export function toSpringSort(
  sort: Sort | { active: string; direction: SortDirection },
  fallback?: string,
): string | undefined {
  const active = sort.active?.trim();
  const direction = sort.direction;
  if (!active || !direction) {
    return fallback;
  }
  return `${active},${direction}`;
}
