import { Module } from '@nestjs/common';
import { createCrudController } from '../../common/crud/base-crud.controller';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';

const SeasonController = createCrudController({
  path: 'seasons',
  delegate: (prisma) => prisma.season,
  createDto: CreateSeasonDto,
  updateDto: UpdateSeasonDto,
});

@Module({
  controllers: [SeasonController],
})
export class SeasonModule {}
