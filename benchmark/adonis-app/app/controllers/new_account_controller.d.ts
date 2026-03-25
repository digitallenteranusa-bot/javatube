import type { HttpContext } from '@adonisjs/core/http';
export default class NewAccountController {
    store({ request, serialize }: HttpContext): Promise<any>;
}
