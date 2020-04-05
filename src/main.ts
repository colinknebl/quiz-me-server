import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../config/.env` });

import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { AuthProvider } from './auth/AuthProvider';
import { Token } from './utils/jwt';
import { APIError } from './utils/APIError';
import { RouteHandler } from './Route/Route';
RouteHandler.authKey = 'userId';

import type { IUser } from './models/User';
import { Deck } from './models/Deck';
import { Card } from './models/Card';

const mongoURI: string = process.env.MONGO_URI ?? 'mongodb://localhost:27017/quiz_me';
const authProvider = new AuthProvider<IUser>(mongoURI);

RouteHandler.authProvider = authProvider;
Deck.mongoURI = mongoURI;
Card.mongoURI = mongoURI;

const app = express();

const cookieParserSecret: string = process.env.SECRET || 'my-secret';

app.use(cookieParser(cookieParserSecret));
app.use(bodyParser.json());
app.use(cors());

app.use((req, res, next) => {
    req.routeHandler = new RouteHandler(req, res, next);
    req.routeHandler.invalidateCookie('userId');
    //     res.header('Access-Control-Allow-Origin', '*');
    //     res.header('Access-Control-Allow-Methods', 'DELETE, POST, PUT');
    //     res.header(
    //         'Access-Control-Allow-Headers',
    //         'Origin, X-Requested-With, Content-Type, Accept'
    //     );
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
    const { user, token } = await authProvider
        .login({ email: req.body.email, password: req.body.password })
        .catch((error) => {
            req.routeHandler.error = error;
        });

    if (user) {
        req.routeHandler.response.data = {
            user,
            token,
        };
    }

    req.routeHandler.response.send();
});

app.get('/api/logout', RouteHandler.protect, (req, res) => {
    console.log('req', req.user);
    if (req.user?.id) {
        authProvider.logout(req.user.id).catch((error) => (req.routeHandler.error = error));
    } else {
        req.routeHandler.error = new APIError(APIError.messages.invalid_token, APIError.codes.forbidden);
    }
    req.routeHandler.response.send();
});

app.get('/api/protected-route', RouteHandler.protect, async (req, res) => {
    console.log('enter protected-route');
    console.log(req.user);
    req.routeHandler.response.send();
});

app.post('/api/user/:userId/decks', RouteHandler.protect, async (req, res) => {
    try {
        const { user, routeHandler } = req;

        if (!req.body.title) {
            throw new APIError(`${APIError.messages.invalid_input}: deck title not privded`);
        }
        if (user) {
            if (String(req.params.userId) !== String(user.id)) {
                throw new APIError(APIError.messages.unable_to_verify_user);
            }

            const deck = new Deck(user.id, req.body.title);
            const deckId = await deck.save();

            if (!deckId) {
                throw new APIError(APIError.messages.error_creating_deck);
            }

            req.routeHandler.response.data = { deckId };
        }
    } catch (error) {
        req.routeHandler.error = error;
    }

    req.routeHandler.response.send();
});

app.post('/api/user/:userId/decks/:deckId/cards', RouteHandler.protect, async (req, res) => {
    try {
        if (!req.body.sideA || !req.body.sideB) {
            throw new APIError(APIError.messages.invalid_input);
        }
        const { user, routeHandler } = req;
        if (user) {
            if (String(req.params.userId) !== String(user.id)) {
                throw new APIError(APIError.messages.unable_to_verify_user);
            }
            const { sideA, sideB } = req.body;
            const card = new Card(user.id, req.params.deckId, sideA, sideB);
            const cardId = await card.save();
            if (!cardId) {
                throw new APIError(APIError.messages.error_creating_card);
            }
            req.routeHandler.response.data = { cardId };
        }
    } catch (error) {
        req.routeHandler.error = error;
    }
    req.routeHandler.response.send();
});

app.get('/api/user/:userId/decks/:deckId/cards/:cardId/toggleMarked', RouteHandler.protect, async (req, res) => {
    console.log('toggle maked...');
    try {
        const { userId, deckId, cardId } = req.params;
        if (!deckId || !cardId) {
            throw new APIError(APIError.messages.invalid_input);
        }
        const { user } = req;
        if (!user || String(userId) !== String(user.id)) {
            throw new APIError(APIError.messages.unable_to_verify_user);
        }
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
