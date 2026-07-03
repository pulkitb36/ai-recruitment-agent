import json
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
from config import settings

# Use local sentence-transformers model instead of ChromaDB's auto-download
embedding_fn = SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

chroma = chromadb.PersistentClient(path=settings.chroma_db_path)
kb = chroma.get_or_create_collection(
    "knowledge_base",
    embedding_function=embedding_fn
)

def add_documents(texts, ids):
    kb.add(documents=texts, ids=ids)

def verify_answer(question, candidate_answer):
    try:
        results = kb.query(
            query_texts=[question + " " + candidate_answer],
            n_results=3
        )
        reference_docs = results["documents"][0] if results["documents"] else []
    except Exception:
        reference_docs = []

    # If no OpenAI key, return neutral verification
    from mock_mode import IS_MOCK
    if IS_MOCK or not reference_docs:
        return {
            "is_correct": None,
            "accuracy_score": 5,
            "key_points_covered": [],
            "missing_points": [],
            "corrections": "Could not verify"
        }

    from openai import OpenAI
    from config import settings
    client = OpenAI(api_key=settings.openai_api_key)

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": f"""Evaluate this interview answer.
            Reference: {chr(10).join(reference_docs)}
            Question: {question}
            Answer: {candidate_answer}
            Return ONLY valid JSON: {{"is_correct": true/false/null,
            "accuracy_score": 0-10, "key_points_covered": [],
            "missing_points": [], "corrections": ""}}"""}],
            temperature=0.1,
            max_tokens=300
        )
        return json.loads(response.choices[0].message.content)
    except Exception:
        return {
            "is_correct": None,
            "accuracy_score": 5,
            "key_points_covered": [],
            "missing_points": [],
            "corrections": "Could not verify"
        }