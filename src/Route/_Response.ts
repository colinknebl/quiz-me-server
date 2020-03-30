import { Response } from "express";
import { AuthenticationError } from 'auth';

import { APIError } from '../utils/APIError';

interface I_ResponseOptions {
    data?: any;
    error?: Error;
}

export class _Response {
    public data: any;
    #error: APIError | undefined;
    #res: Response;
    #cookie: Record<string, any> = {};

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

    private _setResponseCookies(): void {
        for (let key in this.#cookie) {
            this.#res.cookie(key, this.#cookie[key], { signed: true });
        }
    }

    public setCookie(key: string, val: any): void {
        this.#cookie[key] = val;
    }

    public invalidateCookie(key: string) {
        this.#res.cookie(key, '', { signed: true, expires: new Date(0) });
    }

    public get error(): Error | undefined {
        return this.#error;
    }

    public send(): void {
        this.#res.status(this.#error ? this.#error.code : 200);
        this._setResponseCookies();
        this.#res.json({
            code: this.#res.statusCode,
            error: this.#error?.message ?? null,
            data: this.data ?? null
        });
    }
}