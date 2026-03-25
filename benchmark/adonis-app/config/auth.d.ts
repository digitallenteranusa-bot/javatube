import type { InferAuthenticators, InferAuthEvents, Authenticators } from '@adonisjs/auth/types';
declare const authConfig: ConfigProvider<import("@adonisjs/auth/build/src/define_config").ResolvedAuthConfig<KnownGuards>>;
export default authConfig;
/**
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
    interface Authenticators extends InferAuthenticators<typeof authConfig> {
    }
}
declare module '@adonisjs/core/types' {
    interface EventsList extends InferAuthEvents<Authenticators> {
    }
}
