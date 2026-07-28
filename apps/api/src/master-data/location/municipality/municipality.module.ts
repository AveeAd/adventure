import { Module } from '@nestjs/common';
import { createCrudController } from '../../../common/crud/base-crud.controller';
import { CreateMunicipalityDto } from './dto/create-municipality.dto';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto';

const MunicipalityController = createCrudController({
  path: 'municipalities',
  delegate: (prisma) => prisma.municipality,
  createDto: CreateMunicipalityDto,
  updateDto: UpdateMunicipalityDto,
});

@Module({
  controllers: [MunicipalityController],
})
export class MunicipalityModule {}
