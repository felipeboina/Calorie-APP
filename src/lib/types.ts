export type Sexo = "masculino" | "feminino";
export type NivelAtividade =
  | "sedentario"
  | "leve"
  | "moderado"
  | "ativo"
  | "muito_ativo";
export type Objetivo = "deficit" | "superavit" | "manutencao";
export type Refeicao =
  | "cafe_da_manha"
  | "almoco"
  | "lanche"
  | "jantar"
  | "outro";
export type FonteRegistro = "manual" | "ia" | "base";

export interface Profile {
  id: string;
  nome: string | null;
  idade: number | null;
  sexo: Sexo | null;
  altura_cm: number | null;
  peso_atual: number | null;
  nivel_atividade: NivelAtividade;
  objetivo: Objetivo;
  meta_calorica: number | null;
  meta_proteina: number | null;
  meta_carboidrato: number | null;
  meta_gordura: number | null;
  onboarding_completo: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  peso: number;
  data: string;
  created_at: string;
}

export interface Food {
  id: string;
  nome: string;
  calorias_100g: number;
  proteina_100g: number;
  carboidrato_100g: number;
  gordura_100g: number;
  fibra_100g: number;
  porcao_padrao_g: number | null;
  porcao_padrao_desc: string | null;
  fonte: string;
  created_by: string | null;
}

export interface FoodLog {
  id: string;
  user_id: string;
  food_id: string | null;
  nome_alimento: string;
  quantidade_g: number;
  calorias: number;
  proteina: number;
  carboidrato: number;
  gordura: number;
  refeicao: Refeicao;
  foto_url: string | null;
  fonte: FonteRegistro;
  data: string;
  horario: string;
  created_at: string;
}

export interface ExerciseLog {
  id: string;
  user_id: string;
  nome: string;
  calorias_queimadas: number;
  duracao_min: number | null;
  data: string;
  created_at: string;
}

export const REFEICAO_LABELS: Record<Refeicao, string> = {
  cafe_da_manha: "Café da manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  outro: "Outro",
};

export const ATIVIDADE_LABELS: Record<NivelAtividade, string> = {
  sedentario: "Sedentário (pouco ou nenhum exercício)",
  leve: "Leve (exercício leve 1-3x/semana)",
  moderado: "Moderado (exercício moderado 3-5x/semana)",
  ativo: "Ativo (exercício intenso 6-7x/semana)",
  muito_ativo: "Muito ativo (exercício intenso diário + trabalho físico)",
};

export const OBJETIVO_LABELS: Record<Objetivo, string> = {
  deficit: "Déficit calórico (emagrecer)",
  superavit: "Superávit calórico (ganhar massa)",
  manutencao: "Manutenção (manter o peso)",
};
