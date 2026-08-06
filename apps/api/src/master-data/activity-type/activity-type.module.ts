import { Module } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { createCrudController } from '../../common/crud/base-crud.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateActivityTypeDto } from './dto/create-activity-type.dto';
import { UpdateActivityTypeDto } from './dto/update-activity-type.dto';

// walks from the proposed new parent up to the root, rejecting if `id`
// itself appears in that chain - that's what a cycle would look like
async function assertNoCycle(prisma: PrismaService, id: string, newParentId: string) {
  let currentId: string | null = newParentId;
  while (currentId) {
    if (currentId === id) {
      throw new BadRequestException(
        'This change would create a cycle in the activity type hierarchy',
      );
    }
    const current: { parentId: string | null } | null = await prisma.activityType.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = current?.parentId ?? null;
  }
}

const ActivityTypeController = createCrudController({
  path: 'activity-types',
  delegate: (prisma) => prisma.activityType,
  createDto: CreateActivityTypeDto,
  updateDto: UpdateActivityTypeDto,
  autoSlug: { from: 'name' },
  beforeUpdate: async (id, dto, prisma) => {
    const parentId = (dto as UpdateActivityTypeDto).parentId;
    if (typeof parentId === 'string') {
      await assertNoCycle(prisma, id, parentId);
    }
  },
});

@Module({
  controllers: [ActivityTypeController],
})
export class ActivityTypeModule {}
