import { Module } from '@nestjs/common';
import { createCrudController } from '../../common/crud/base-crud.controller';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

const TagController = createCrudController({
  path: 'tags',
  delegate: (prisma) => prisma.tag,
  createDto: CreateTagDto,
  updateDto: UpdateTagDto,
});

@Module({
  controllers: [TagController],
})
export class TagModule {}
