import { Module } from '@nestjs/common';
import { createCrudController } from '../../../common/crud/base-crud.controller';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';

const ProvinceController = createCrudController({
  path: 'provinces',
  delegate: (prisma) => prisma.province,
  createDto: CreateProvinceDto,
  updateDto: UpdateProvinceDto,
});

@Module({
  controllers: [ProvinceController],
})
export class ProvinceModule {}
