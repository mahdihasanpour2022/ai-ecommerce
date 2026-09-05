import { ApiProperty } from '@nestjs/swagger';

export class CsrfResponseDto {
  @ApiProperty({ description: 'Stable session-bound CSRF token also issued as a readable cookie.' })
  csrfToken!: string;
}

export class CurrentAdminDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  displayName!: string;
}

export class CurrentAuthorizationDto {
  @ApiProperty({ type: [String], example: ['SUPER_ADMIN'] })
  roles!: string[];

  @ApiProperty({ type: [String], example: ['admin.access'] })
  permissions!: string[];
}

export class CurrentAuthenticationResponseDto {
  @ApiProperty({ type: CurrentAdminDto })
  admin!: CurrentAdminDto;

  @ApiProperty({ type: CurrentAuthorizationDto })
  authorization!: CurrentAuthorizationDto;
}

export class AuthenticationBootstrapResponseDto extends CurrentAuthenticationResponseDto {
  @ApiProperty({ description: 'Session-bound CSRF token also issued as a readable cookie.' })
  csrfToken!: string;
}
