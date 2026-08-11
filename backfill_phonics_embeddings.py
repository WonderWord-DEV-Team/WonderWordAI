"""
Backfills the `embedding` column for phonics_knowledge rows that don't have
one yet.

WHY THIS IS A SEPARATE SCRIPT, NOT A MIGRATION:
The embedding must come from the exact same model the running ml-service
uses (all-MiniLM-L6-v2, see services/embedding_service.py) so it lands in
the same vector space that match_phonics_knowledge compares against. That
model only runs where it's installed -- your machine, or the ml-service's
own environment -- not from plain SQL.

CURRENT STATE (as of this writing):
  - dev     (tvcbdhekuzwljabbqfgc): 44 rows, embeddings already generated
  - staging (vepdtpnjhtqcmcwoyydv): 44 rows, embeddings ALL NULL  <-- run this

match_phonics_knowledge skips rows where embedding IS NULL, so until this
runs against staging, /phonics-lookup returns 404 in production. That's the
safe failure mode (no match beats a wrong match), but the feature is off.

USAGE (PowerShell / Windows)
----------------------------
1. Install dependencies:
     pip install sentence-transformers supabase

2. Point at STAGING (this is the one that needs it). Get the service_role
   key from the Supabase dashboard: Project Settings -> API -> service_role.
   It must be service_role, not anon -- writes bypass RLS.

     $env:SUPABASE_URL="https://vepdtpnjhtqcmcwoyydv.supabase.co"
     $env:SUPABASE_SERVICE_ROLE_KEY="<staging service_role key>"

3. Run it:
     python backfill_phonics_embeddings.py

   First run downloads the model (~90 MB), so give it a minute.

4. Verify in the Supabase SQL editor:
     SELECT count(*) AS total, count(embedding) AS with_embedding
     FROM phonics_knowledge;
   Expect total = with_embedding = 44.

RUNNING IT AGAIN LATER
----------------------
Safe to re-run any time -- it only touches rows where embedding IS NULL, so
it's the standard follow-up step after inserting new phonics categories.
Point SUPABASE_URL at whichever project has the new rows.
"""

import os
import sys

from sentence_transformers import SentenceTransformer
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print(
        "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.\n"
        "See the usage notes at the top of this file.",
        file=sys.stderr,
    )
    sys.exit(1)

print(f"Target project: {SUPABASE_URL}")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

try:
    result = (
        supabase.table("phonics_knowledge")
        .select("id, category, text")
        .is_("embedding", "null")
        .execute()
    )
except Exception as exc:
    print(f"Could not read phonics_knowledge: {exc}", file=sys.stderr)
    sys.exit(1)

rows = result.data or []
if not rows:
    print("Nothing to backfill -- every row already has an embedding.")
    sys.exit(0)

print(f"Found {len(rows)} row(s) missing an embedding:")
for row in rows:
    print(f"  - {row['category']}")

print("\nLoading all-MiniLM-L6-v2 (first run downloads the model)...")
model = SentenceTransformer("all-MiniLM-L6-v2")

failures = 0
for index, row in enumerate(rows, start=1):
    try:
        embedding = model.encode(row["text"]).tolist()
        supabase.table("phonics_knowledge").update(
            {"embedding": embedding}
        ).eq("id", row["id"]).execute()
        print(f"[{index}/{len(rows)}] {row['category']}")
    except Exception as exc:
        failures += 1
        print(f"[{index}/{len(rows)}] FAILED {row['category']}: {exc}", file=sys.stderr)

if failures:
    print(f"\nDone with {failures} failure(s). Re-run to retry just those.", file=sys.stderr)
    sys.exit(1)

print("\nDone. Verify with:")
print("  SELECT count(*) AS total, count(embedding) AS with_embedding FROM phonics_knowledge;")