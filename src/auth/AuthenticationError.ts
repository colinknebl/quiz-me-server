export class AuthenticationError extends Error {
    static messages = {
        unknown_error: 'Unknown authentication error',
        user_not_found: 'User not found',
        email_or_password_not_provided: 'Email and/or password not provided',
        email_or_password_incorrect: 'Email and/or password incorrect',
        email_in_use: 'Email provided is already in use',
        user_id_not_provided: 'User ID not provided',
    };
    static codes = {
        invalid: 400,
        not_found: 404,
        forbidden: 403,
    };

    #code: number;

    constructor(message: string, code?: number) {
        super(message ?? AuthenticationError.messages.unknown_error);
        this.name = 'AuthenticationError';
        this.#code = code ?? AuthenticationError.codes.invalid;
    }

    public get code(): number {
        return this.#code;
    }
}
