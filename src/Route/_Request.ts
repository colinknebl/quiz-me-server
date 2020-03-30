import { Request } from 'express';

export class _Request {
    #req: Request;

    constructor(req: Request) {
        this.#req = req;
    }

    public get raw(): Request {
        return this.#req;
    }
}