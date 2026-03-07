import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.acrosome_db
    collection = db.analyses
    records = await collection.find().sort('created_at', -1).to_list(None)
    print(f"{'Patient ID':<20} | {'Sample ID':<20} | {'Pct':<10} | {'Created At'}")
    print("-" * 75)
    for r in records:
        print(f"{str(r.get('patient_id') or '-'):<20} | {str(r.get('sample_id') or '-'):<20} | {r.get('intact_percentage'):<10} | {r.get('created_at')}")
    client.close()

if __name__ == "__main__":
    asyncio.run(check())
