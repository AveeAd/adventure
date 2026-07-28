import { Module } from '@nestjs/common';
import { createCrudController } from '../../../common/crud/base-crud.controller';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

const CountryController = createCrudController({
  path: 'countries',
  delegate: (prisma) => prisma.country,
  createDto: CreateCountryDto,
  updateDto: UpdateCountryDto,
});

@Module({
  controllers: [CountryController],
})
export class CountryModule {}
