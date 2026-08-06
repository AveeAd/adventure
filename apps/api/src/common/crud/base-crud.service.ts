import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { slugify } from '../slugify';
import { CrudDelegate, CrudEntity } from './crud-delegate.interface';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export class BaseCrudService<TEntity extends CrudEntity> {
  constructor(protected readonly delegate: CrudDelegate<TEntity>) {}

  async list(page = 1, pageSize = 20, includeInactive = false): Promise<PaginatedResult<TEntity>> {
    const where = includeInactive ? {} : { isActive: true };
    const [data, total] = await Promise.all([
      this.delegate.findMany({ where, skip: (page - 1) * pageSize, take: pageSize }),
      this.delegate.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async get(id: string): Promise<TEntity> {
    const entity = await this.delegate.findUnique({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Record ${id} not found`);
    }
    return entity;
  }

  create(data: unknown): Promise<TEntity> {
    return this.wrapPrismaErrors(() => this.delegate.create({ data }));
  }

  // Used by autoSlug-configured CRUD resources (base-crud.controller.ts) so
  // no master-data create form ever asks a human to type a unique slug -
  // they have no way to know what's already taken. `scope` narrows
  // uniqueness for compound-unique slugs (e.g. District's `[provinceId,
  // slug]`); omit it for globally-unique slug columns.
  async generateUniqueSlug(source: string, scope: Record<string, unknown> = {}): Promise<string> {
    const base = slugify(source) || 'item';
    const existing = await this.delegate.findMany({
      where: { ...scope, slug: { startsWith: base } },
      skip: 0,
      take: 1000,
    });
    const taken = new Set(existing.map((entity) => (entity as unknown as { slug: string }).slug));
    if (!taken.has(base)) return base;
    for (let i = 2; ; i++) {
      const candidate = `${base}-${i}`;
      if (!taken.has(candidate)) return candidate;
    }
  }

  async update(id: string, data: unknown): Promise<TEntity> {
    await this.get(id);
    return this.wrapPrismaErrors(() => this.delegate.update({ where: { id }, data }));
  }

  async delete(id: string): Promise<TEntity> {
    await this.get(id);
    return this.delegate.update({ where: { id }, data: { isActive: false } });
  }

  private async wrapPrismaErrors<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A record with this value already exists');
      }
      throw error;
    }
  }
}
