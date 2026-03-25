import type { HttpContext } from '@adonisjs/core/http';
export default class ProfileController {
    show({ auth, serialize }: HttpContext): Promise<any>;
}
