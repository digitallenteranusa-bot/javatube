/**
 * Hashing configuration.
 *
 * This starter uses Node.js scrypt under the hood.
 * Node.js reference: https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback
 */
declare const hashConfig: any;
export default hashConfig;
/**
 * Inferring types for the list of hashers you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
    interface HashersList extends InferHashers<typeof hashConfig> {
    }
}
