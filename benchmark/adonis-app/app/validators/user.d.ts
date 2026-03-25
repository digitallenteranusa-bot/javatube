/**
 * Validator to use when performing self-signup
 */
export declare const signupValidator: import("@vinejs/vine").VineValidator<import("@vinejs/vine").VineObject<{
    fullName: import("@vinejs/vine/build/src/schema/base/literal").NullableModifier<import("@vinejs/vine").VineString>;
    email: any;
    password: import("@vinejs/vine").VineString;
    passwordConfirmation: import("@vinejs/vine").VineString;
}, {
    [x: string]: any;
}, {
    [x: string]: any;
}, {
    [x: string]: any;
}>, Record<string, any> | undefined>;
/**
 * Validator to use before validating user credentials
 * during login
 */
export declare const loginValidator: import("@vinejs/vine").VineValidator<import("@vinejs/vine").VineObject<{
    email: import("@vinejs/vine").VineString;
    password: import("@vinejs/vine").VineString;
}, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>, Record<string, any> | undefined>;
