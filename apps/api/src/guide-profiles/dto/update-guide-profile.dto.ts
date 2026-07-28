import { PartialType } from '@nestjs/mapped-types';
import { CreateGuideProfileDto } from './create-guide-profile.dto';

// verificationStatus is deliberately not editable here - manual-review-only,
// via the dedicated ADMIN endpoint, per GUIDES.md
export class UpdateGuideProfileDto extends PartialType(CreateGuideProfileDto) {}
