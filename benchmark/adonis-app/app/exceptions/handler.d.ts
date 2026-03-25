import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http';
export default class HttpExceptionHandler extends ExceptionHandler {
    /**
     * In debug mode, the exception handler will display verbose errors
     * with pretty printed stack traces.
     */
    protected debug: boolean;
    /**
     * The method is used for handling errors and returning
     * response to the client
     */
    handle(error: unknown, ctx: HttpContext): Promise<any>;
    /**
     * The method is used to report error to the logging service or
     * the a third party error monitoring service.
     *
     * @note You should not attempt to send a response from this method.
     */
    report(error: unknown, ctx: HttpContext): Promise<any>;
}
