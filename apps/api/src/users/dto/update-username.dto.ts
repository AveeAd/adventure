import { Matches } from 'class-validator';
import { USERNAME_PATTERN } from '../../common/username';

export class UpdateUsernameDto {
  @Matches(USERNAME_PATTERN, {
    message: 'Username must be 3-30 characters, start with a letter, and use only lowercase letters, digits, and underscores',
  })
  username: string;
}
