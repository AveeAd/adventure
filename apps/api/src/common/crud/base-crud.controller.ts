import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Type } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedUser, CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseCrudService } from './base-crud.service';
import { CrudDelegate, CrudEntity } from './crud-delegate.interface';
import { validateDto } from './validate-dto';

export interface CrudControllerOptions<TEntity extends CrudEntity> {
  path: string;
  delegate: (prisma: PrismaService) => CrudDelegate<TEntity>;
  createDto: Type<object>;
  updateDto: Type<object>;
  // per-module extension point - e.g. ActivityType's cycle-prevention check,
  // which the generic service has no reason to know about
  beforeUpdate?: (id: string, dto: object, prisma: PrismaService) => Promise<void>;
  // opts a resource with a `slug` column out of ever accepting one from the
  // client - createDto/updateDto must not declare a `slug` field. `from`
  // names the dto field the slug is derived from (always `name` today);
  // `scope` narrows uniqueness for compound-unique slugs (e.g. District's
  // `[provinceId, slug]`) - omit for globally-unique slug columns.
  autoSlug?: {
    from: string;
    scope?: (dto: Record<string, unknown>) => Record<string, unknown>;
  };
}

export function createCrudController<TEntity extends CrudEntity>(
  options: CrudControllerOptions<TEntity>,
): Type<unknown> {
  @Controller(options.path)
  class CrudController {
    private readonly service: BaseCrudService<TEntity>;

    constructor(private readonly prisma: PrismaService) {
      this.service = new BaseCrudService<TEntity>(options.delegate(prisma));
    }

    // master-data reads are public - needed for filter UI on pages
    // anonymous visitors load, per PUBLIC_PAGES.md
    @Public()
    @Get()
    list(
      @Query('page') page?: string,
      @Query('pageSize') pageSize?: string,
      @Query('includeInactive') includeInactive?: string,
      @CurrentUser() user?: AuthenticatedUser,
    ) {
      const wantsIncludeInactive = includeInactive === 'true' && user?.role === Role.ADMIN;
      return this.service.list(Number(page) || 1, Number(pageSize) || 20, wantsIncludeInactive);
    }

    @Public()
    @Get(':id')
    get(@Param('id') id: string) {
      return this.service.get(id);
    }

    @Roles(Role.ADMIN)
    @Post()
    async create(@Body() body: Record<string, unknown>) {
      const dto = await validateDto(options.createDto, body);
      if (options.autoSlug) {
        const source = (dto as Record<string, unknown>)[options.autoSlug.from];
        const scope = options.autoSlug.scope?.(dto as Record<string, unknown>) ?? {};
        const slug = await this.service.generateUniqueSlug(String(source ?? ''), scope);
        return this.service.create({ ...dto, slug });
      }
      return this.service.create(dto);
    }

    @Roles(Role.ADMIN)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
      const dto = await validateDto(options.updateDto, body);
      if (options.beforeUpdate) {
        await options.beforeUpdate(id, dto, this.prisma);
      }
      return this.service.update(id, dto);
    }

    @Roles(Role.ADMIN)
    @Delete(':id')
    delete(@Param('id') id: string) {
      return this.service.delete(id);
    }
  }

  return CrudController;
}
