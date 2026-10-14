// Fuso fixo por enquanto (uso pessoal no Brasil); para multiusuário, mover para o perfil.
const FUSO = "America/Sao_Paulo";

export function hojeBR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
}

export function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
