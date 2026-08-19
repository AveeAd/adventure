// Shared between AuthController (set/clear on login/logout) and
// UsersController (clear on account deletion) so both agree on the same
// cookie name/path rather than hand-copying string literals.
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const REFRESH_TOKEN_PATH = '/api/v1/auth';
