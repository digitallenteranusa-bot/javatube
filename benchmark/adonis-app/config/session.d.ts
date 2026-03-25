declare const sessionConfig: ConfigProvider<import("@adonisjs/session/build/src/types").SessionConfig & {
    store: keyof KnownStores;
    stores: { [K in keyof KnownStores]: import("@adonisjs/session/build/src/types").SessionStoreFactory; };
}>;
export default sessionConfig;
