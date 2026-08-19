import { IsOptional, IsString, MinLength } from 'class-validator';

export class AppleMobileLoginDto {
  @IsString()
  @MinLength(1)
  identityToken!: string;

  // Apple only ever includes the user's name in the *first* authorization
  // response on-device (ASAuthorizationAppleIDCredential.fullName), never in
  // the identity token itself and never again on a later sign-in - the
  // client has to capture and forward it the one time it's available.
  @IsOptional()
  @IsString()
  fullName?: string;
}
