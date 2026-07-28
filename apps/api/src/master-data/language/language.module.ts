import { Module } from '@nestjs/common';
import { createCrudController } from '../../common/crud/base-crud.controller';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

const LanguageController = createCrudController({
  path: 'languages',
  delegate: (prisma) => prisma.language,
  createDto: CreateLanguageDto,
  updateDto: UpdateLanguageDto,
});

@Module({
  controllers: [LanguageController],
})
export class LanguageModule {}
