import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateAdventurePageDto } from './create-adventure-page.dto';

// metadata only - content changes always go through submit-revision
// (POST .../revisions), never a plain field update, per ADVENTURE_PAGES.md's
// service-layer notes
export class UpdateAdventurePageMetadataDto extends PartialType(
  OmitType(CreateAdventurePageDto, ['content'] as const),
) {}
