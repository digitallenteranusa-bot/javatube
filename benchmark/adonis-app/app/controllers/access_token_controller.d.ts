import type { HttpContext } from '@adonisjs/core/http';
export default class AccessTokenController {
    store({ request, serialize }: HttpContext): Promise<any>;
    destroy({ auth }: HttpContext): Promise<{
        message: string;
    }>;
}
