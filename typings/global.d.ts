import { IUser } from '../src/models/User';
import { RouteHandler } from '../src/Route/Route';

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
            routeHandler: RouteHandler;
        }
    }
}
