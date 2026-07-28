import { Module } from '@nestjs/common';
import { createCrudController } from '../../common/crud/base-crud.controller';
import { CreateSpotTypeDto } from './dto/create-spot-type.dto';
import { UpdateSpotTypeDto } from './dto/update-spot-type.dto';

const SpotTypeController = createCrudController({
  path: 'spot-types',
  delegate: (prisma) => prisma.spotType,
  createDto: CreateSpotTypeDto,
  updateDto: UpdateSpotTypeDto,
});

@Module({
  controllers: [SpotTypeController],
})
export class SpotTypeModule {}
