import { Module } from '@nestjs/common';
import { createCrudController } from '../../common/crud/base-crud.controller';
import { CreateDifficultyLevelDto } from './dto/create-difficulty-level.dto';
import { UpdateDifficultyLevelDto } from './dto/update-difficulty-level.dto';

const DifficultyLevelController = createCrudController({
  path: 'difficulty-levels',
  delegate: (prisma) => prisma.difficultyLevel,
  createDto: CreateDifficultyLevelDto,
  updateDto: UpdateDifficultyLevelDto,
});

@Module({
  controllers: [DifficultyLevelController],
})
export class DifficultyLevelModule {}
