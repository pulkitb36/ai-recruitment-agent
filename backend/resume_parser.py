import io
import re
import json
import PyPDF2
from docx import Document

# HuggingFace pipeline — downloads model on first run
from transformers import pipeline

# Load NER model once at startup (cached after first download)
print("Loading NER model from HuggingFace...")
ner = pipeline(
    "ner",
    model="dslim/bert-base-NER",
    aggregation_strategy="simple"
)
print("NER model loaded.")

# ── Text Extraction ────────────────────────────────────────────

def extract_text(file_bytes, filename=""):
    if filename.lower().endswith(".pdf"):
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        return " ".join(page.extract_text() or "" for page in reader.pages)
    elif filename.lower().endswith(".docx"):
        doc = Document(io.BytesIO(file_bytes))
        return " ".join(p.text for p in doc.paragraphs)
    return file_bytes.decode("utf-8", errors="ignore")

# ── Field Extractors ───────────────────────────────────────────

def extract_email(text):
    match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    return match.group(0) if match else ""

def extract_phone(text):
    match = re.search(r"(\+?\d[\d\s\-().]{7,}\d)", text)
    return match.group(0).strip() if match else ""

def extract_name(ner_results):
    """Pick the first PER entity as the candidate name"""
    for entity in ner_results:
        if entity["entity_group"] == "PER":
            return entity["word"].strip()
    return "Unknown"

def extract_orgs(ner_results):
    """Extract organization names (companies, universities)"""
    return list({
        e["word"].strip()
        for e in ner_results
        if e["entity_group"] == "ORG"
    })

def extract_skills(text):
    """
    Keyword-based skill extractor.
    Add more skills to this list as needed.
    """
    skill_keywords = [
        # Languages
        "python", "javascript", "typescript", "java", "c++", "c#", "go",
        "rust", "kotlin", "swift", "ruby", "php", "r", "scala", "matlab",
        # Web
        "react", "next.js", "vue", "angular", "html", "css", "tailwind",
        "node.js", "express", "fastapi", "django", "flask", "spring",
        # Data / ML
        "machine learning", "deep learning", "nlp", "computer vision",
        "tensorflow", "pytorch", "keras", "scikit-learn", "pandas",
        "numpy", "matplotlib", "huggingface", "transformers",
        # Databases
        "postgresql", "mysql", "mongodb", "sqlite", "redis", "elasticsearch",
        "chromadb", "pinecone", "weaviate",
        # Cloud / DevOps
        "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd",
        "github actions", "terraform", "linux",
        # Other
        "git", "rest api", "graphql", "websocket", "jwt", "oauth",
        "sql", "nosql", "agile", "scrum",
    ]
    text_lower = text.lower()
    found = [skill for skill in skill_keywords if skill in text_lower]
    # Deduplicate while preserving order
    return list(dict.fromkeys(found))

def extract_experience_years(text):
    """
    Look for patterns like '3 years of experience' or '5+ years'
    """
    patterns = [
        r"(\d+)\+?\s*years?\s*of\s*experience",
        r"(\d+)\+?\s*years?\s*experience",
        r"experience\s*of\s*(\d+)\+?\s*years?",
    ]
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            return int(match.group(1))
    return 0

def extract_education(text):
    """
    Look for common degree keywords
    """
    degrees = [
        "b.tech", "m.tech", "bsc", "msc", "b.sc", "m.sc",
        "bachelor", "master", "phd", "doctorate", "mba",
        "b.e", "m.e", "b.com", "m.com",
    ]
    text_lower = text.lower()
    found = [d for d in degrees if d in text_lower]
    return found[0].upper() if found else "Not specified"

# ── Main Parse Function ────────────────────────────────────────

def parse_resume(text):
    """
    Parses a resume text using HuggingFace NER + regex.
    Returns a structured dict — no OpenAI needed.
    """
    # Truncate for NER model (BERT has 512 token limit)
    truncated = text[:2000]

    try:
        ner_results = ner(truncated)
    except Exception as e:
        print(f"NER error: {e}")
        ner_results = []

    name            = extract_name(ner_results)
    email           = extract_email(text)
    phone           = extract_phone(text)
    skills          = extract_skills(text)
    orgs            = extract_orgs(ner_results)
    experience_years = extract_experience_years(text)
    education       = extract_education(text)

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "skills": skills,
        "experience_years": experience_years,
        "education": education,
        "organizations": orgs,
        "certifications": [],   # can add cert extraction later
        "projects": [],         # can add project extraction later
    }

# ── Scoring (no OpenAI) ────────────────────────────────────────

def score_candidate(parsed, jd):
    """
    Scores a candidate against a job description using
    keyword matching + skill overlap. No API needed.
    """
    if not jd:
        return {
            "score": 50,
            "skill_match": 50,
            "experience_match": 50,
            "reasons_selected": ["No JD provided — neutral score"],
            "reasons_rejected": []
        }

    jd_lower = jd.lower()

    # 1. Skill match
    candidate_skills = [s.lower() for s in parsed.get("skills", [])]
    jd_skills = [s for s in candidate_skills if s in jd_lower]
    skill_score = min(int((len(jd_skills) / max(len(candidate_skills), 1)) * 100), 100)

    # 2. Experience match
    exp_years = parsed.get("experience_years", 0)
    exp_match = re.search(r"(\d+)\+?\s*years?", jd_lower)
    required_years = int(exp_match.group(1)) if exp_match else 2
    if exp_years >= required_years:
        exp_score = 100
    elif exp_years > 0:
        exp_score = int((exp_years / required_years) * 100)
    else:
        exp_score = 30

    # 3. Education match
    edu_score = 80
    if any(d in jd_lower for d in ["b.tech", "bachelor", "bsc", "b.e"]):
        edu = parsed.get("education", "").lower()
        if any(d in edu for d in ["b.tech", "bachelor", "bsc", "b.e", "master", "m.tech"]):
            edu_score = 100
        else:
            edu_score = 50

    # 4. Overall weighted score
    overall = int(skill_score * 0.5 + exp_score * 0.3 + edu_score * 0.2)

    # 5. Reasons
    reasons_selected = []
    reasons_rejected = []

    if jd_skills:
        reasons_selected.append(f"Has {len(jd_skills)} matching skills: {', '.join(jd_skills[:4])}")
    if exp_years >= required_years:
        reasons_selected.append(f"{exp_years} years experience meets requirement")
    if skill_score < 40:
        reasons_rejected.append("Low skill overlap with job description")
    if exp_years < required_years:
        reasons_rejected.append(f"Only {exp_years} years experience, {required_years} required")

    return {
        "score": overall,
        "skill_match": skill_score,
        "experience_match": exp_score,
        "education_match": edu_score,
        "matched_skills": jd_skills,
        "reasons_selected": reasons_selected or ["Meets basic requirements"],
        "reasons_rejected": reasons_rejected or ["No major gaps identified"]
    }