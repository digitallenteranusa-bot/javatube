import { apiRoutes } from './app/routes/api.routes';
import { staticRoutes } from './app/routes/static.routes';

console.log('=== API Routes ===');
for (const route of apiRoutes as any[]) {
	console.log(`${route.methods.join(',')} ${route.path} [middlewares: ${route.middlewares.length}]`);
}

console.log('\n=== Static Routes ===');
for (const route of staticRoutes as any[]) {
	console.log(`${route.methods.join(',')} ${route.path}`);
}
