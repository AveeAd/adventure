export interface CrudEntity {
  id: string;
  isActive: boolean;
}

export interface CrudDelegate<TEntity extends CrudEntity> {
  findMany(args: {
    where: Record<string, unknown>;
    skip: number;
    take: number;
  }): Promise<TEntity[]>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
  findUnique(args: { where: { id: string } }): Promise<TEntity | null>;
  create(args: { data: unknown }): Promise<TEntity>;
  update(args: { where: { id: string }; data: unknown }): Promise<TEntity>;
}
