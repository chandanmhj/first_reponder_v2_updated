"""
Retrieval-augmented generation over the BCLS knowledge base.

Same technique as the original Telegram bot: each protocol chunk is embedded
and stored in a ChromaDB collection, then queried per user message to ground
the LLM's reply in real protocol text instead of its own unguided knowledge.

Embedding model: all-MiniLM-L6-v2, same as the original bot — but here via
ChromaDB's built-in DefaultEmbeddingFunction (ONNX runtime) instead of the
sentence-transformers package, which pulls in a multi-GB PyTorch + CUDA
install for no benefit on a CPU-only backend. Same model, same embeddings,
much lighter dependency footprint.
"""
import chromadb
from chromadb.utils import embedding_functions

from shared.config import get_settings

from .knowledge_base import BCLS_KNOWLEDGE_BASE

COLLECTION_NAME = "bcls_guidelines"

_client = None
_collection = None


def ensure_ready() -> None:
    """Forces the collection to exist and be ingested. Called at app startup
    (not left to happen lazily on the first user's chat request) so the
    embedding model download and ingestion cost is paid once at boot, not
    inflicted on whoever happens to send the first message."""
    _get_collection()


def _get_collection():
    global _client, _collection
    if _collection is None:
        settings = get_settings()
        _client = chromadb.PersistentClient(path=settings.chroma_db_path)
        ef = embedding_functions.DefaultEmbeddingFunction()  # all-MiniLM-L6-v2 via ONNX
        _collection = _client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"},
        )

    # Deliberately checked every call, not just once: if ingestion fails
    # (e.g. a transient network hiccup fetching the embedding model), the
    # collection object itself was already created successfully above and
    # would otherwise get cached as "ready" forever, permanently leaving
    # retrieval broken until a process restart. count() is a cheap local
    # check, so this makes ingestion self-healing on the next call instead.
    if _collection.count() == 0:
        _ingest(_collection)

    return _collection


def _ingest(collection) -> None:
    documents, metadatas, ids = [], [], []

    for chunk in BCLS_KNOWLEDGE_BASE:
        doc_text = f"{chunk['title']}. {chunk['content']}"
        metadatas.append({
            "scenario": chunk["scenario"],
            "step": chunk["step"],
            "title": chunk["title"],
            "keywords": ", ".join(chunk["keywords"]),
            "source": chunk["source"],
        })
        ids.append(f"{chunk['scenario']}_step_{chunk['step']}")
        documents.append(doc_text)

    collection.add(documents=documents, metadatas=metadatas, ids=ids)


def query_knowledge_base(user_message: str, n_results: int = 5) -> str:
    """Returns a formatted context string of the top-k most relevant BCLS
    chunks, or "" if retrieval fails or nothing relevant is found."""
    try:
        collection = _get_collection()
        results = collection.query(
            query_texts=[user_message],
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )

        if not results["documents"] or not results["documents"][0]:
            return ""

        context_parts = []
        for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
            context_parts.append(
                f"[Scenario: {meta['scenario']} | Step {meta['step']}: {meta['title']}]\n"
                f"{doc}\n"
                f"Source: {meta['source']}"
            )

        return "\n\n---\n\n".join(context_parts)

    except Exception as e:
        print(f"[RAG ERROR] {e}")
        return ""
