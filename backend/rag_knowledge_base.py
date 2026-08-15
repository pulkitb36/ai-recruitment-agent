import json
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
from config import settings

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

    if not reference_docs:
        return {
            "is_correct": None,
            "accuracy_score": 5,
            "key_points_covered": [],
            "missing_points": [],
            "corrections": "Could not verify"
        }

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)

        prompt = f"""Verify this interview answer against the reference knowledge.

Reference: {chr(10).join(reference_docs)}
Question: {question}
Answer: {candidate_answer}

Return ONLY valid JSON:
{{
  "is_correct": true,
  "accuracy_score": 7,
  "key_points_covered": ["point1"],
  "missing_points": ["missing1"],
  "corrections": ""
}}"""

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=300,
            )
        )
        text = response.text.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(text)

    except Exception as e:
        print(f"RAG verification error: {e}")
        return {
            "is_correct": None,
            "accuracy_score": 5,
            "key_points_covered": [],
            "missing_points": [],
            "corrections": "Could not verify"
        }