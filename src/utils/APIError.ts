import { AuthenticationError } from '../auth/AuthenticationError';

export class APIError extends Error {
    public static messages = {
        error_creating_deck: 'Error creating deck',
        error_creating_card: 'Error creating card',
        error_updating_card: 'Error updating card',
        invalid_input: 'Invalid input',
        invalid_token: 'Invalid token, please login',
        invalid_user_id: 'Invalid user ID',
        unable_to_verify_user: 'Unable to verify user status',
        unknown_error: 'Unknown error occurred',
        user_not_logged_in: 'User not logged in',
    };

    public static codes = {
        invalid: 400,
        forbidden: 403,
        not_found: 404,
        server_error: 500,
    };

    static from(error: unknown, message?: string, code?: number): APIError {
        let apiError: APIError;
        if (error instanceof AuthenticationError) {
            apiError = new APIError(error.message, error.code);
        } else if (error instanceof APIError) {
            apiError = error;
        } else {
            apiError = new APIError(message, code);
        }
        return apiError;
    }

    #code: number;

    constructor(message?: string, code?: number) {
        super(message ?? APIError.messages.unknown_error);
        this.name = 'APIError';
        this.#code = code ?? 500;
    }

    public set code(code: number) {
        if (Object.values(APIError.codes).includes(code)) {
            this.#code = code;
        } else {
            console.error('Unrecognized error code');
        }
    }

    public get code(): number {
        return this.#code ?? 500;
    }

    public get message(): string {
        return this.message ?? APIError.messages.unknown_error;
    }
}
