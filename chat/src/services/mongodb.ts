import { MongoClient, Db, Collection } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) return db;
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/soma_id_db';
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  console.log('[MONGODB] Connected directly to', uri);
  return db;
}

export async function getCollection(name: string): Promise<Collection> {
  const database = await connectMongo();
  return database.collection(name);
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
