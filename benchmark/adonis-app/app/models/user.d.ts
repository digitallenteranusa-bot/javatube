import { type AccessToken } from '@adonisjs/auth/access_tokens';
declare const User_base: any;
export default class User extends User_base {
    static accessTokens: any;
    currentAccessToken?: AccessToken;
    get initials(): string;
}
export {};
