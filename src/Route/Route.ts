import { Response, Request } from "express";
import { AuthProvider } from "../auth/AuthProvider";

import { APIError } from '../utils/APIError';
import { _Response } from './_Response';
import { _Request } from './_Request'
import { Token } from '../utils/jwt';
import type { IUser } from '../models/User';

export class Route {
    #res: _Response;
    #req: _Request;

    private static _protectedCookieToVerify: string;
    static set cookieKeyToVerify(key: string) {
        Route._protectedCookieToVerify = key;
    }

    constructor(req: Request, res: Response) {
        this.#req = new _Request(req);
        this.#res = new _Response(res, {});
    }

    public async protect(authProvider: AuthProvider<IUser>): Promise<{ user: IUser | null }> {
        let user: IUser | null = null
        const cookieKey = Route._protectedCookieToVerify;
        const signedCookies = this.#req.raw.signedCookies;

        try {
            if (!cookieKey || !signedCookies) {
                throw new APIError(APIError.messages.unable_to_verify_user);
            }

            if (signedCookies[cookieKey]) {
                const verified = Token.verify(signedCookies[cookieKey]) as object
                const userId = (verified as any)?.data[cookieKey];
                user = await authProvider.getUserById(userId as string);
                if (!user) {
                    throw new APIError(APIError.messages.invalid_user_id);
                }
            } else {
                this.#res.setError(new APIError(APIError.messages.user_not_logged_in, APIError.codes.invalid));
            }
        } catch (error) {
            let apiError = APIError.from(error, APIError.messages.unable_to_verify_user);
            this.#res.setError(apiError);
            throw apiError;
        }

        return {
            user
        }
    }

    public set error(error: unknown) {
        console.log('setting error', error);
        this.#res.setError(error);
    }

    public get response(): _Response {
        return this.#res;
    }

    public invalidateCookie(key: string) {
        return this.#res.invalidateCookie(key);
    }
}