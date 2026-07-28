import { Module } from '@nestjs/common';
import { createCrudController } from '../../../common/crud/base-crud.controller';
import { CreateDistrictDto } from './dto/create-district.dto';
import { UpdateDistrictDto } from './dto/update-district.dto';

const DistrictController = createCrudController({
  path: 'districts',
  delegate: (prisma) => prisma.district,
  createDto: CreateDistrictDto,
  updateDto: UpdateDistrictDto,
});

@Module({
  controllers: [DistrictController],
})
export class DistrictModule {}
