import jwt from 'jsonwebtoken';

import { APIError } from './APIError';

const secret = process.env.SECRET ?? '';

type Options = Partial<jwt.SignOptions>;

enum TokenMessages {
    expired = 'jwt expired',
}

export class Token {
    static options: Options = {
        expiresIn: '7d',
    };

    public static verify(this: typeof Token, token: string) {
        try {
            return jwt.verify(token, secret);
        } catch (error) {
            if (error.message === TokenMessages.expired) {
                throw new APIError(APIError.messages.user_not_logged_in, APIError.codes.invalid);
            } else {
                throw new APIError(APIError.messages.invalid_token, APIError.codes.forbidden);
            }
        }
    }

    public static encrypt(this: typeof Token, data: any, options?: Options) {
        return jwt.sign({ data }, secret, options ?? this.options);
    }
}
