from fastapi import FastAPI
from sentence_transformers import SentenceTransformer

app = FastAPI()

model = SentenceTransformer('all-MiniLM-L6-v2')

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/health/embeddings")
def health_embeddings():
    test = model.encode("test")
    return {
        "status": "healthy",
        "model": "all-MiniLM-L6-v2",
        "embedding_dim": len(test)
    }
