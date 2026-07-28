export interface CrudEntity {
  id: string;
  isActive: boolean;
}

// intentionally loose (`any`) - Prisma's generated delegate methods are too
// heavily overloaded to satisfy a strict structural interface, and the real
// input safety net is DTO validation upstream, not this bridge type
export interface CrudDelegate<TEntity extends CrudEntity> {
  findMany(args: { where: any; skip: number; take: number }): Promise<TEntity[]>;
  count(args: { where: any }): Promise<number>;
  findUnique(args: { where: { id: string } }): Promise<TEntity | null>;
  create(args: { data: any }): Promise<TEntity>;
  update(args: { where: { id: string }; data: any }): Promise<TEntity>;
}
