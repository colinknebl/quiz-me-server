import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../config/.env` });

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { AuthProvider } from 'auth';
import { Token } from './utils/jwt';
import { APIError } from './utils/APIError';
import { Route } from './Route/Route';
Route.cookieKeyToVerify = 'userId';

import type { IUser } from './models/User';
import { Deck } from './models/Deck';


const mongoURI: string = process.env.MONGO_URI ?? 'mongodb://localhost:27017/quiz_me';
const authProvider = new AuthProvider<IUser>(mongoURI);

Deck.mongoURI = mongoURI;

const app = express();

const cookieParserSecret: string = process.env.SECRET || 'my-secret';

app.use(cookieParser(cookieParserSecret));
app.use(bodyParser.json());
app.use(cors());

app.use((req, res, next) => {
    // res.header('Access-Control-Allow-Origin', '*');
    // res.header('Access-Control-Allow-Methods', 'DELETE, POST, PUT');
    // res.header(
    //     'Access-Control-Allow-Headers',
    //     'Origin, X-Requested-With, Content-Type, Accept'
    // );
    next();
});

app.post('/api/create-user', async (req: Request, res: Response) => {
    const route = new Route(req, res);
    const userId = await authProvider.createUser(req.body.email, req.body.password, req.body).catch(error => {
        route.error = APIError.from(error);
    });

    if (userId) {
        route.response.data = {
            userId: userId
        }
    }

    route.response.send();
});

app.post('/api/login', async (req: Request, res: Response) => {
    const route = new Route(req, res);
    const user = await authProvider.login({ email: req.body.email, password: req.body.password }).catch(error => {
        route.error = error;
    });

    if (user) {
        route.response.data = { user };
        route.response.setCookie('userId', Token.encrypt({ userId: user.id }));
    }

    route.response.send();
});

app.get('/api/logout', (req, res) => {
    const route = new Route(req, res);
    if (req.signedCookies?.userId) {
        route.invalidateCookie('userId');
    }
    route.response.send();
});

app.get('/api/protected-route', async (req, res) => {
    const route = new Route(req, res);
    try {
        const { user } = await route.protect(authProvider);

        if (user) {
            route.response.data = { user }
        }

    } catch (error) {
    }
    route.response.send();
});

app.post('/api/user/:userId/decks', async (req, res) => {
    const route = new Route(req, res);
    try {
        if (!req.body.title) {
            throw new APIError(`${APIError.messages.invalid_input}: deck title not privded`);
        }
        const { user } = await route.protect(authProvider);

        if (user) {
            if (String(req.params.userId) !== String(user.id)) {
                throw new APIError(APIError.messages.unable_to_verify_user);
            }

            const deck = new Deck(user.id, req.body.title);
            const deckId = await deck.save();

            if (!deckId) {
                const error = new APIError(APIError.messages.error_creating_deck);
                route.response.setError(error);
                throw error;
            }

            route.response.data = { deckId }
        }

    } catch (error) {
        route.response.setError(error);
    }

    route.response.send();
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`server started on http://localhost:${port}`);
});
