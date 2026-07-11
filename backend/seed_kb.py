import o
import uuid
from rag_knowledge_base import add_documents

KB_DIR = "../knowledge_base"

def chunk_text(text, chunk_size=300):
    words  = text.split()
    chunks = []
    step   = chunk_size - 50
    for i in range(0, len(words), step):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks

def seed():
    total = 0
    for filename in os.listdir(KB_DIR):
        if not filename.endswith(".txt"):
            continue
        path = os.path.join(KB_DIR, filename)
        with open(path, "r") as f:
            text = f.read()
        chunks = chunk_text(text)
        ids    = [f"{filename}_{i}_{uuid.uuid4().hex[:6]}" for i in range(len(chunks))]
        add_documents(chunks, ids)
        total += len(chunks)
        print(f"{filename} -> {len(chunks)} chunks added")
    print(f"Total chunks seeded: {total}")

if __name__ == "__main__":
    seed()
