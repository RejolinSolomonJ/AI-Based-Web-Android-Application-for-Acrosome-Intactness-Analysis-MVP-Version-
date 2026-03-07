import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

async def cleanup():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.acrosome_db
    collection = db.analyses
    
    print("Connecting to acrosome_db.analyses for final cleanup...")
    cursor = collection.find().sort("created_at", -1)
    records = await cursor.to_list(length=None)
    
    if not records:
        print("No records found.")
        return

    to_delete_ids = []
    seen_pairs = set() # (patient_id, sample_id)
    
    for rec in records:
        p_id = rec.get("patient_id")
        s_id = rec.get("sample_id")
        
        # If we have a patient/sample ID, we only want the LATEST one for today.
        # This will remove the duplicates the user is seeing.
        if p_id and s_id:
            pair_key = (p_id, s_id)
            if pair_key in seen_pairs:
                print(f"Marking duplicate for deletion: {p_id} | {s_id} | Created: {rec['created_at']}")
                to_delete_ids.append(rec["_id"])
            else:
                seen_pairs.add(pair_key)
        else:
            # For records without IDs, use session_id or just allow them
            pass

    if not to_delete_ids:
        print("No additional duplicates found.")
    else:
        print(f"\nDeleting {len(to_delete_ids)} records...")
        result = await collection.delete_many({"_id": {"$in": to_delete_ids}})
        print(f"Successfully deleted {result.deleted_count} records!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(cleanup())
