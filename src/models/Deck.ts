import { MongoClient, Db, ObjectID, FilterQuery } from 'mongodb';
import type { ICard } from './Card';

export interface IDeck {
    id: string;
    title: string;
    public: boolean;
    cards: ICard[];
}

export class Deck {
    public static mongoURI: string;
    public static collectionName = 'decks';
    #id: ObjectID;
    #userId: string;
    #client: MongoClient;
    #title: string;
    #public: boolean = true;

    constructor(userId: string, title: string) {
        this.#id = new ObjectID();
        this.#userId = userId;
        this.#title = title;
        this.#client = new MongoClient(Deck.mongoURI, { useUnifiedTopology: true });
    }

    public get id(): string {
        return String(this.#id);
    }

    public json() {
        return {
            id: this.#id,
            title: this.#title,
            public: this.#public,
            cards: []
        }
    }

    public async save(): Promise<string | null> {
        try {
            const connection = await this.#client.connect()
            const db = connection.db('users');
            const collection = db.collection('users');
            const filter = { _id: new ObjectID(this.#userId) };

            const result = await collection.updateOne(
                filter,
                { $push: { decks: this.json() } }
            );

            connection.close();
            return result.modifiedCount === 1 ? this.id : null;
        } catch (error) {
            return null;
        }
    }
}