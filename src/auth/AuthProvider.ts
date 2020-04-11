import { MongoClient, Db, ObjectID } from 'mongodb';
import crypto from 'crypto';

import { Token, TokenTypes } from '../utils/jwt';
import { AuthenticationError } from './AuthenticationError';

interface IEmailLogin {
    email: string;
    password: string;
}

interface IDBUser {
    _id: ObjectID;
    hashedPassword: string;
    email: string;
    salt: string;
    createdDate: string;
    token: string | null;
}

type WithID<U> = U & { id: string };

type LoginResponse<U> = {
    user: WithID<U>;
    accessToken: string;
    refreshToken: string;
};
interface IAuthProvider<U> {
    createUser(email: string, password: string, options?: U): Promise<string>;
    login(options: IEmailLogin): Promise<LoginResponse<U>>;
}

export class AuthProvider<User> implements IAuthProvider<User> {
    #mongoDbURI: string;
    #collectionName: 'users' = 'users';

    constructor(mongoDbURI: string) {
        this.#mongoDbURI = mongoDbURI;
    }

    private async _connect(): Promise<{ db: Db; closeConnectionCb: () => {} }> {
        return new Promise((resolve, reject) => {
            const client = new MongoClient(this.#mongoDbURI, { useUnifiedTopology: true });
            client.connect((err, client) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        db: client.db('users'),
                        closeConnectionCb: () => client.close(),
                    });
                }
            });
        });
    }

    private _sanitizeUser(user: IDBUser): WithID<User> {
        (user as any).id = user._id;
        delete user.hashedPassword;
        delete user.salt;
        delete user._id;
        delete user.token;
        return user as any;
    }

    private _generateSalt(): string {
        const length = 16;
        return crypto
            .randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length);
    }

    private _generateHash(password: string, salt: string): string {
        const hash = crypto.createHmac('sha512', salt);
        hash.update(password);
        return hash.digest('hex');
    }

    private _hashPassword(password: string, salt?: string): { salt: string; passwordHash: string } {
        const passwordSalt = this._generateSalt();
        const passwordHash = this._generateHash(password, passwordSalt);

        return {
            salt: passwordSalt,
            passwordHash,
        };
    }

    private _verifyPassword(password: string, user: IDBUser): boolean {
        try {
            const hashedPassword = this._generateHash(password, user.salt);
            return hashedPassword === user.hashedPassword;
        } catch (error) {
            return false;
        }
    }

    private async _userExists(db: Db, email: string): Promise<boolean> {
        const collection = db.collection<IDBUser>(this.#collectionName);
        const user = await collection.findOne({ email });
        return user ? user.email === email : false;
    }

    public async createUser(email: string, password: string, options?: any): Promise<string> {
        if (!email || !password) {
            throw new AuthenticationError(AuthenticationError.messages.email_or_password_not_provided);
        }

        const { db, closeConnectionCb } = await this._connect();

        if (await this._userExists(db, email)) {
            closeConnectionCb();
            throw new AuthenticationError(AuthenticationError.messages.email_in_use);
        }

        const { salt, passwordHash } = this._hashPassword(password);

        const collection = db.collection<IDBUser>(this.#collectionName);
        let user: Omit<IDBUser, '_id'> = {
            email,
            hashedPassword: passwordHash,
            salt,
            token: null,
            createdDate: new Date().toUTCString(),
        };
        if (options) {
            delete options.email;
            delete options.password;
            delete options.token;
            user = {
                ...user,
                ...options,
            };
        }
        const result = await collection.insertOne(user);

        closeConnectionCb();
        return result.insertedId as any;
    }

    public async login(options: IEmailLogin): Promise<LoginResponse<User>> {
        if (!options?.email || !options?.password) {
            throw new AuthenticationError(AuthenticationError.messages.email_or_password_not_provided);
        }

        const { db, closeConnectionCb } = await this._connect();

        const collection = db.collection<IDBUser>(this.#collectionName);
        const query = { email: options.email };
        const user = await collection.findOne(query);

        if (!user) {
            throw new AuthenticationError(
                AuthenticationError.messages.user_not_found,
                AuthenticationError.codes.not_found
            );
        }

        if (!this._verifyPassword(options.password, user)) {
            throw new AuthenticationError(AuthenticationError.messages.email_or_password_incorrect);
        }

        const accessToken = Token.encrypt({ userId: user._id }, TokenTypes.access);
        const refreshToken = Token.encrypt({ userId: user._id }, TokenTypes.refresh);

        closeConnectionCb();
        return {
            user: this._sanitizeUser(user),
            accessToken,
            refreshToken,
        };
    }

    public async getUserById(userId: string): Promise<User> {
        const { db, closeConnectionCb } = await this._connect();

        const collection = db.collection<IDBUser>(this.#collectionName);
        const user = await collection.findOne({ _id: new ObjectID(userId) });
        closeConnectionCb();

        if (!user) {
            throw new AuthenticationError(
                AuthenticationError.messages.user_not_found,
                AuthenticationError.codes.not_found
            );
        }

        return this._sanitizeUser(user);
    }
}
