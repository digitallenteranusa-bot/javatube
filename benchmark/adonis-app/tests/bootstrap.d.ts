import type { Config } from '@japa/runner/types';
import type { Registry } from '../.adonisjs/client/registry/schema.d.ts';
/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */
declare module '@japa/api-client/types' {
    interface RoutesRegistry extends Registry {
    }
}
/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */
/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export declare const plugins: Config['plugins'];
/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export declare const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>>;
/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export declare const configureSuite: Config['configureSuite'];
