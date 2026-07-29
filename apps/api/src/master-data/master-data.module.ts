import { Module } from '@nestjs/common';
import { ActivityTypeModule } from './activity-type/activity-type.module';
import { DifficultyLevelModule } from './difficulty-level/difficulty-level.module';
import { LanguageModule } from './language/language.module';
import { SeasonModule } from './season/season.module';
import { SpotTypeModule } from './spot-type/spot-type.module';
import { TagModule } from './tag/tag.module';
import { CountryModule } from './location/country/country.module';
import { ProvinceModule } from './location/province/province.module';
import { DistrictModule } from './location/district/district.module';
import { MunicipalityModule } from './location/municipality/municipality.module';

@Module({
  imports: [
    ActivityTypeModule,
    DifficultyLevelModule,
    SeasonModule,
    SpotTypeModule,
    TagModule,
    LanguageModule,
    CountryModule,
    ProvinceModule,
    DistrictModule,
    MunicipalityModule,
  ],
})
export class MasterDataModule {}
