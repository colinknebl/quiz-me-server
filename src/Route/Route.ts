import { Response, Request, NextFunction } from 'express';
import { AuthProvider } from '../auth/AuthProvider';

import { APIError } from '../utils/APIError';
import { _Response } from './_Response';
import { _Request } from './_Request';
import { Token, TokenTypes } from '../utils/jwt';
import type { IUser } from '../models/User';

export class RouteHandler {
    #res: _Response;
    #req: _Request;

    public static authKey: string = '';
    public static authProvider: AuthProvider<IUser>;

    constructor(req: Request, res: Response, next: NextFunction) {
        this.#req = new _Request(req);
        this.#res = new _Response(res, {});
    }

    public static async protect(req: Request, res: Response, next: NextFunction): Promise<void> {
        let user: IUser | null = null;
        const invalidTokenError = new APIError(APIError.messages.invalid_token, APIError.codes.forbidden);
        try {
            if (!req.headers.authorization) {
                throw invalidTokenError;
            }
            const authHeader = req.headers.authorization?.split(' ');
            const token = (authHeader as string[])[1];
            if (!token) {
                throw invalidTokenError;
            }

            const verified = Token.verify(token, TokenTypes.access) as object;
            const userId = (verified as any)?.data[RouteHandler.authKey];
            user = await RouteHandler.authProvider.getUserById(userId as string);
            if (!user) {
                throw new APIError(APIError.messages.invalid_user_id);
            }
            req.user = user;
            next();
        } catch (error) {
            let apiError = APIError.from(error, APIError.messages.unable_to_verify_user);
            req.routeHandler.error = apiError;
            req.routeHandler.response.send();
        }
    }

    public set error(error: unknown) {
        this.#res.setError(error);
    }

    public get response(): _Response {
        return this.#res;
    }

    public invalidateCookie(key: string, value?: string) {
        return this.#res.invalidateCookie(key, value);
    }
}
