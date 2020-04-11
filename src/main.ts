import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../config/.env` });

import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { AuthProvider } from './auth/AuthProvider';
import { Token, TokenTypes } from './utils/jwt';
import { APIError } from './utils/APIError';
import { RouteHandler } from './Route/Route';
RouteHandler.authKey = 'userId';

import type { IUser } from './models/User';
import { Deck } from './models/Deck';
import { Card } from './models/Card';
import { AuthenticationError } from './auth/AuthenticationError';

const mongoURI: string = process.env.MONGO_URI ?? 'mongodb://localhost:27017/quiz_me';
const authProvider = new AuthProvider<IUser>(mongoURI);

RouteHandler.authProvider = authProvider;
Deck.mongoURI = mongoURI;
Card.mongoURI = mongoURI;

const app = express();
app.use(
    cors({
        origin: process.env.CLIENT_URI,
        credentials: true,
    })
);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use((req, res, next) => {
    req.routeHandler = new RouteHandler(req, res, next);
    res.header('Access-Control-Allow-Credentials', 'true');

    /* // ! unused headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'DELETE, POST, PUT');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    */
    next();
});

app.post('/api/create-user', async (req: Request, res: Response) => {
    const userId = await authProvider.createUser(req.body.email, req.body.password, req.body).catch((error) => {
        req.routeHandler.error = APIError.from(error);
    });

    if (userId) {
        req.routeHandler.response.data = {
            userId: userId,
        };
    }

    req.routeHandler.response.send();
});

app.post('/api/login', async (req: Request, res: Response) => {
    try {
        const data = await authProvider.login({ email: req.body.email, password: req.body.password }).catch((error) => {
            req.routeHandler.error = error;
        });

        if (!data) {
            throw new APIError(AuthenticationError.messages.user_not_found, AuthenticationError.codes.not_found);
        }

        const { user, accessToken, refreshToken } = data;

        if (user) {
            res.cookie('jid', refreshToken, { httpOnly: true, path: '/api/refresh-token' });
            req.routeHandler.response.data = {
                user,
                accessToken,
            };
        }
    } catch (error) {
        req.routeHandler.error = error;
    }

    req.routeHandler.response.send();
});

app.get('/api/logout', (req, res) => {
    req.routeHandler.invalidateCookie('jid', 'undefined');
    req.routeHandler.response.send();
});

app.get('/api/refresh-token', async (req, res) => {
    try {
        const verify = Token.verify(req.cookies['jid'], TokenTypes.refresh);
        const user = await authProvider.getUserById(verify.data.userId);
        if (!user) {
            throw new AuthenticationError(
                AuthenticationError.messages.user_not_found,
                AuthenticationError.codes.not_found
            );
        }
        const data: any = {
            accessToken: Token.encrypt({ userId: user.id }, TokenTypes.access),
        };
        if (req.query?.withUser) {
            data.user = user;
        }
        req.routeHandler.response.data = data;
    } catch (error) {
        req.routeHandler.error = error;
    }
    req.routeHandler.response.send();
});

app.get('/api/protected-route', RouteHandler.protect, async (req, res) => {
    req.routeHandler.response.send();
});

app.get('/api/user', RouteHandler.protect, async (req, res) => {
    req.routeHandler.response.data = { user: req.user };
    req.routeHandler.response.send();
});

app.post('/api/create-deck', RouteHandler.protect, async (req, res) => {
    try {
        if (!req.body.title) {
            throw new APIError(`${APIError.messages.invalid_input}: deck title not privded`);
        }

        const deck = new Deck(req.user.id, req.body.title);
        const deckId = await deck.save();

        if (!deckId) {
            throw new APIError(APIError.messages.error_creating_deck);
        }

        req.routeHandler.response.data = { deckId };
    } catch (error) {
        req.routeHandler.error = error;
    }

    req.routeHandler.response.send();
});

app.post('/api/decks/:deckId/cards', RouteHandler.protect, async (req, res) => {
    try {
        const { sideA, sideB } = req.body;
        if (!sideA || !sideB) {
            throw new APIError(APIError.messages.invalid_input);
        }
        const card = new Card(req.user.id, req.params.deckId, sideA, sideB);
        const cardId = await card.save();
        if (!cardId) {
            throw new APIError(APIError.messages.error_creating_card);
        }
        req.routeHandler.response.data = { cardId };
    } catch (error) {
        req.routeHandler.error = error;
    }
    req.routeHandler.response.send();
});

app.get('/api/deck/:deckId/card/:cardId/toggleMarked', RouteHandler.protect, async (req, res) => {
    try {
        const { deckId, cardId } = req.params;
        if (!deckId || !cardId) {
            throw new APIError(APIError.messages.invalid_input);
        }
        const { user } = req;
        const marked = await Card.mark(user.id, deckId, cardId);
        req.routeHandler.response.data = { marked };
    } catch (error) {
        req.routeHandler.error = error;
    }
    req.routeHandler.response.send();
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`server started on http://localhost:${port}`);
});
