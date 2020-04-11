import { CookieOptions, Response } from 'express';
import cookieParser from 'cookie-parser';

export class Cookie {
    #options?: CookieOptions;
    #key: string;
    #value: string;

    constructor(key: string, value: string, options?: CookieOptions) {
        this.#key = key;
        this.#value = value;
        this.#options = options;
    }

    private get _options(): CookieOptions {
        return this.#options || {};
    }

    static get parser() {
        return () => cookieParser();
    }

    set value(value: string) {
        this.#value = value;
    }

    static set(response: Response, cookie: Cookie) {
        response.cookie(cookie.#key, cookie.#value, cookie._options);
    }

    static setRegistered(response: Response, key: string, value: string): boolean {
        const cookie = Cookie._registeredCookies.get(key);
        if (!cookie) return false;
        cookie.#value = value;
        Cookie.set(response, cookie);
        return true;
    }

    static invalidate(response: Response, cookie: Cookie) {
        response.cookie(cookie.#key, undefined, {
            ...cookie._options,
            expires: new Date(0),
        });
    }

    private static _registeredCookies: Map<string, Cookie> = new Map();

    static register(cookie: Cookie): boolean {
        if (Cookie._registeredCookies.has(cookie.#key)) return false;

        Cookie._registeredCookies.set(cookie.#key, cookie);
        return true;
    }

    static getRegistered(key: string): Cookie | undefined {
        return Cookie._registeredCookies.get(key);
    }

    static setHeaders(response: Response): void {
        response.header('Access-Control-Allow-Credentials', 'true');
    }

    static enableCORS({ clientURI }: { clientURI: string }) {
        return {
            origin: clientURI,
            credentials: true,
        };
    }
}
