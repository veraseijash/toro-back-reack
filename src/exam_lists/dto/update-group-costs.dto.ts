export const COST_FIELDS = [
  'cost1',
  'cost2',
  'cost3',
  'cost4',
  'cost5',
  'cost6',
] as const;

export type CostField = (typeof COST_FIELDS)[number];

export class UpdateGroupCostsDto {
  // Cero aplica los cambios a todos los registros, sin filtrar por grupo.
  group_id: number;
  cambios: {
    aplicar: CostField;
    incremento: number;
    sobre: CostField;
  }[];
}
