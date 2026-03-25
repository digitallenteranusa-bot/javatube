import { BaseSerializer } from '@adonisjs/core/transformers';
import { type SimplePaginatorMetaKeys } from '@adonisjs/lucid/types/querybuilder';
/**
 * Custom serializer for API responses that ensures consistent JSON structure
 * across all API endpoints. Wraps response data in a 'data' property and handles
 * pagination metadata for Lucid ORM query results.
 */
declare class ApiSerializer extends BaseSerializer<{
    Wrap: 'data';
    PaginationMetaData: SimplePaginatorMetaKeys;
}> {
    /**
     * Wraps all serialized data under this key in the response object.
     * Example: { data: [...] } instead of returning raw arrays/objects
     */
    wrap: 'data';
    /**
     * Validates and defines pagination metadata structure for paginated responses.
     * Ensures that pagination info from Lucid queries is properly formatted.
     *
     * @throws Error if metadata doesn't match Lucid's pagination structure
     */
    definePaginationMetaData(metaData: unknown): SimplePaginatorMetaKeys;
}
declare const serialize: ApiSerializer["serialize"] & {
    withoutWrapping: ApiSerializer["serializeWithoutWrapping"];
};
/**
 * Module augmentation to add the serialize method to HttpContext.
 * This allows controllers to use ctx.serialize() for consistent API responses.
 */
declare module '@adonisjs/core/http' {
    interface HttpContext {
        serialize: typeof serialize;
    }
}
export {};
