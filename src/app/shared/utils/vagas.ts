export function vagasDisponiveis(
  ocupadas: number,
  limite: number,
): number {
  return Math.max(0, (limite ?? 0) - (ocupadas ?? 0));
}

export function ocupacaoPercent(
  ocupadas: number,
  limite: number,
): number {
  if (!limite || limite <= 0) {
    return 0;
  }
  return Math.min(100, Math.round(((ocupadas ?? 0) / limite) * 100));
}
