declare const encryptionConfig: any;
export default encryptionConfig;
/**
 * Inferring types for the list of encryptors you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
    interface EncryptorsList extends InferEncryptors<typeof encryptionConfig> {
    }
}
