import type { IDeck } from './Deck';

export interface IUser {
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    decks: IDeck[];
}