import { MongoClient, Db, ObjectID, FilterQuery } from 'mongodb';
import { IUser } from './User';
import { APIError } from '../utils/APIError';

export interface ICard {
    id: string;
    sideA: string;
    sideB: string;
    marked: boolean;
}

//#region Example DB Queries

/**
    1. Update marked
        db.users.update(
            {
                _id: ObjectId("5e83de8c2ccc382223c740b1")
            },
            {
                $set: {
                    "decks.$[d].cards.$[c].marked": true
                }
            },
            {
                arrayFilters: [
                    { "d.id": ObjectId("5e83df5190f4d82270ee84b1")},
                    { "c.id": ObjectId("5e83dfc590f4d82270ee84b4")}
                ]
            }
        )
    ==================================================================

    2. match on deckId, push to the cards array
        db.users.update(
            { "decks.id": ObjectId("5e81402b2a840c07101b1cff") },
            { $push: { "decks.$.cards": {foo:"bar"} } }
        )

        // match on userId, and deckId, push to the cards array
        db.users.update(
            { 
                _id: ObjectId("5e810f067aef716cea8bbc07"), 
                "decks.id": ObjectId("5e8333f4afb2010dacc52c95") 
            },
            { 
                $push: { 
                    "decks.$.cards": { foo:"bar" } 
                } 
            }
        )
        ==============================================================
 */
//#endregion Example DB Queries

export class Card {

    public static async mark(userId: string, deckId: string, cardId: string) {
        const connection = await Card.client.connect()
        const db = connection.db('users');
        const collection = db.collection<IUser>('users');
        const filter = {
            _id: new ObjectID(userId)
        };

        const userDoc = await collection.findOne(filter);

        if (!userDoc) {
            throw new APIError(APIError.messages.unable_to_verify_user);
        }
        const card = userDoc.decks
            .find(d => String(d.id) === deckId)
            ?.cards.find(c => String(c.id) === cardId);

        if (!card) {
            throw new APIError('Card not founf');
        }

        let nextMarkedState = !card.marked;

        const result = await collection.updateOne(
            filter,
            {
                $set: {
                    "decks.$[d].cards.$[c].marked": nextMarkedState
                }
            },
            {
                arrayFilters: [
                    { "d.id": new ObjectID(deckId) },
                    { "c.id": new ObjectID(cardId) }
                ]
            }
        );
        connection.close();

        if (!result.result.ok) {
            throw new APIError(APIError.messages.error_updating_card, APIError.codes.server_error)
        }

        return nextMarkedState;
    }

    public static mongoURI: string;
    public static get client(): MongoClient {
        return new MongoClient(Card.mongoURI, { useUnifiedTopology: true })
    }
    #userId: string;
    #deckId: string;
    #id: ObjectID;
    #sideA: string;
    #sideB: string;
    #marked: boolean = false;

    constructor(userId: string, deckId: string, sideA: string, sideB: string) {
        this.#id = new ObjectID;
        this.#userId = userId;
        this.#deckId = deckId;
        this.#sideA = sideA;
        this.#sideB = sideB;
    }

    public get id(): string {
        return String(this.#id);
    }

    public json() {
        return {
            id: this.#id,
            sideA: this.#sideA,
            sideB: this.#sideB,
            marked: this.#marked
        }
    }

    public async save(): Promise<string | null> {
        try {
            const connection = await Card.client.connect()
            const db = connection.db('users');
            const collection = db.collection('users');
            const filter = {
                _id: new ObjectID(this.#userId),
                "decks.id": new ObjectID(this.#deckId)
            };
            const result = await collection.updateOne(
                filter,
                {
                    $push: {
                        "decks.$.cards": this.json()
                    }
                }
            );
            connection.close();
            return result.modifiedCount === 1 ? this.id : null;
        } catch (error) {
            console.error(error);
            return null;
        }
    }
}