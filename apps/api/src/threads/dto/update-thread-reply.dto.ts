import { PartialType } from '@nestjs/mapped-types';
import { CreateThreadReplyDto } from './create-thread-reply.dto';

export class UpdateThreadReplyDto extends PartialType(CreateThreadReplyDto) {}
