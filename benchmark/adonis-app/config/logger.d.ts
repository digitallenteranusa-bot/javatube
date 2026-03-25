declare const loggerConfig: any;
export default loggerConfig;
/**
 * Inferring types for the list of loggers you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
    interface LoggersList extends InferLoggers<typeof loggerConfig> {
    }
}
