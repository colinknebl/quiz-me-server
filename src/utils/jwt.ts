import jwt from 'jsonwebtoken';

import { APIError } from './APIError';

type Options = Partial<jwt.SignOptions>;

enum TokenMessages {
    expired = 'jwt expired',
}

export enum TokenTypes {
    access,
    refresh,
}

type VerifyReturn = {
    data: { userId: string };
    iat: number;
    exp: number;
};

export class Token {
    static options: Options = {
        expiresIn: '7d',
    };

    static get accessTokenSecret(): string {
        return process.env.ACCESS_TOKEN_SECRET!;
    }

    static get refreshTokenSecret(): string {
        return process.env.REFRESH_TOKEN_SECRET!;
    }

    private static getSecret(tokenType: TokenTypes): string {
        return tokenType === TokenTypes.access ? Token.accessTokenSecret : Token.refreshTokenSecret;
    }

    public static verify(this: typeof Token, token: string, tokenType: TokenTypes): VerifyReturn {
        try {
            return jwt.verify(token, Token.getSecret(tokenType)) as VerifyReturn;
        } catch (error) {
            if (error.message === TokenMessages.expired) {
                throw new APIError(APIError.messages.user_not_logged_in, APIError.codes.invalid);
            } else {
                throw new APIError(APIError.messages.invalid_token, APIError.codes.forbidden);
            }
        }
    }

    public static encrypt(this: typeof Token, data: any, tokenType: TokenTypes, options?: Options) {
        return jwt.sign({ data }, Token.getSecret(tokenType), options ?? this.options);
    }
}
