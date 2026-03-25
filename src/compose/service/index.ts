export type ServiceFn = (...args: any[]) => any;
export type ServiceFactory<
	TReturn extends object,
	Args extends any[] = any[],
> = (...args: Args) => TReturn;

export function composeService<
	TReturn extends Record<string, ServiceFn>,
	Args extends any[] = any[],
>(factory: ServiceFactory<TReturn, Args>): ServiceFactory<TReturn, Args> {
	return factory;
}
