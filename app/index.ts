import { defineBootstrap } from '../src/index';
import { composeException } from '../src/compose';
import { initDatabase } from './database/init';
import { apiRoutes } from './routes/api.routes';
import { staticRoutes } from './routes/static.routes';

// Initialize database and directories
await initDatabase();

const globalException = composeException((err, ctx) => {
	Log.error(err);
	return Res.error({}, { status: 500, message: 'Internal Server Error' });
});

defineBootstrap((app) => {
	app.mount(globalException);
	app.mount(apiRoutes);
	app.mount(staticRoutes);

	const port = parseInt(process.env.PORT || '3000');
	const host = process.env.HOST || '0.0.0.0';

	app.mountServer({
		http: {
			port,
			host,
			maxRequestBodySize: 500 * 1024 * 1024, // 500MB
		},
	});
});
