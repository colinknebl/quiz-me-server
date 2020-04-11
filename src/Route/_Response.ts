import { Response } from 'express';

import { APIError } from '../utils/APIError';

interface I_ResponseOptions {
    data?: any;
    error?: Error;
}

export class _Response {
    public data: any;
    #error: APIError | undefined;
    #res: Response;

    constructor(res: Response, options?: I_ResponseOptions) {
        this.#res = res;
        this.data = options?.data;
    }

    public get raw(): Response {
        return this.#res;
    }

    public setError(error: unknown) {
        this.#error = APIError.from(error);
    }

    public invalidateCookie(key: string, value?: string) {
        this.#res.cookie(key, value ?? '', { expires: new Date(0) });
    }

    public get error(): Error | undefined {
        return this.#error;
    }

    public send(): void {
        this.#res.status(this.#error ? this.#error.code : 200);
        this.#res.json({
            code: this.#res.statusCode,
            error: this.#error?.message ?? null,
            data: this.data ?? null,
        });
    }
}
