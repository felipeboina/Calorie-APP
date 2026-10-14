import type { IngredienteCalculado, NivelAtividade, Objetivo, Sexo } from "./types";

export function somarIngredientes(lista: IngredienteCalculado[]) {
  return lista.reduce(
    (acc, i) => {
      const fator = i.quantidade_g / 100;
      return {
        gramas: acc.gramas + i.quantidade_g,
        calorias: acc.calorias + i.calorias_100g * fator,
        proteina: acc.proteina + i.proteina_100g * fator,
        carboidrato: acc.carboidrato + i.carboidrato_100g * fator,
        gordura: acc.gordura + i.gordura_100g * fator,
      };
    },
    { gramas: 0, calorias: 0, proteina: 0, carboidrato: 0, gordura: 0 }
  );
}

const FATOR_ATIVIDADE: Record<NivelAtividade, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  ativo: 1.725,
  muito_ativo: 1.9,
};

// Mifflin-St Jeor
export function calcularTMB(
  sexo: Sexo,
  peso: number,
  altura: number,
  idade: number
) {
  const base = 10 * peso + 6.25 * altura - 5 * idade;
  return sexo === "masculino" ? base + 5 : base - 161;
}

export function calcularGastoTotal(tmb: number, nivel: NivelAtividade) {
  return tmb * FATOR_ATIVIDADE[nivel];
}

// ajuste padrão: 20% para deficit/superavit, 0 na manutencao
export function calcularMetaCalorica(
  gastoTotal: number,
  objetivo: Objetivo,
  percentualAjuste = 0.2
) {
  if (objetivo === "deficit") return Math.round(gastoTotal * (1 - percentualAjuste));
  if (objetivo === "superavit") return Math.round(gastoTotal * (1 + percentualAjuste));
  return Math.round(gastoTotal);
}

export function calcularMacros(metaCalorica: number, objetivo: Objetivo) {
  // proteina 2g/kg fica a cargo do peso; aqui usamos % simples de calorias
  const percentuais =
    objetivo === "deficit"
      ? { proteina: 0.35, carboidrato: 0.35, gordura: 0.3 }
      : objetivo === "superavit"
      ? { proteina: 0.3, carboidrato: 0.45, gordura: 0.25 }
      : { proteina: 0.3, carboidrato: 0.4, gordura: 0.3 };

  return {
    proteina: Math.round((metaCalorica * percentuais.proteina) / 4),
    carboidrato: Math.round((metaCalorica * percentuais.carboidrato) / 4),
    gordura: Math.round((metaCalorica * percentuais.gordura) / 9),
  };
}
