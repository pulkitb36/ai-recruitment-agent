import io
import re
import json
import PyPDF2
from docx import Document

# Load NER model once at startup
print("Loading NER model from HuggingFace...")
try:
    from transformers import pipeline
    ner = pipeline(
        "ner",
        model="dslim/bert-base-NER",
        aggregation_strategy="simple"
    )
    NER_AVAILABLE = True
    print("NER model loaded.")
except Exception as e:
    print(f"NER model failed to load: {e}")
    NER_AVAILABLE = False

# ── Text Extraction ────────────────────────────────────────────

def extract_text(file_bytes, filename=""):
    text = ""

    if filename.lower().endswith(".pdf"):
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + " "
        except Exception as e:
            print(f"PDF extraction error: {e}")

        # If PyPDF2 failed or returned empty, try raw decode
        if not text.strip():
            try:
                text = file_bytes.decode("utf-8", errors="ignore")
            except Exception:
                text = ""

    elif filename.lower().endswith(".docx"):
        try:
            doc = Document(io.BytesIO(file_bytes))
            text = " ".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            print(f"DOCX extraction error: {e}")

    else:
        try:
            text = file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            text = ""

    text = text.strip()
    print(f"Extracted {len(text)} characters from {filename}")
    return text if text else "No text could be extracted from this file."

# ── Field Extractors ───────────────────────────────────────────

def extract_email(text):
    match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    return match.group(0) if match else ""

def extract_phone(text):
    match = re.search(r"(\+?\d[\d\s\-().]{7,}\d)", text)
    return match.group(0).strip() if match else ""

def extract_name(ner_results):
    for entity in ner_results:
        if entity["entity_group"] == "PER":
            name = entity["word"].strip()
            if len(name) > 2:
                return name
    return "Unknown"

def extract_orgs(ner_results):
    return list({
        e["word"].strip()
        for e in ner_results
        if e["entity_group"] == "ORG" and len(e["word"].strip()) > 2
    })

def extract_skills(text):
    skill_keywords = [
        "python", "javascript", "typescript", "java", "c++", "c#", "go",
        "rust", "kotlin", "swift", "ruby", "php", "r", "scala", "matlab",
        "react", "next.js", "vue", "angular", "html", "css", "tailwind",
        "node.js", "express", "fastapi", "django", "flask", "spring",
        "machine learning", "deep learning", "nlp", "computer vision",
        "tensorflow", "pytorch", "keras", "scikit-learn", "pandas",
        "numpy", "matplotlib", "huggingface", "transformers",
        "postgresql", "mysql", "mongodb", "sqlite", "redis",
        "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd",
        "git", "rest api", "graphql", "websocket", "jwt", "sql",
        "agile", "scrum", "linux", "socket.io", "xterm.js",
    ]
    text_lower = text.lower()
    found = [s for s in skill_keywords if s in text_lower]
    return list(dict.fromkeys(found))

def extract_experience_years(text):
    patterns = [
        r"(\d+)\+?\s*years?\s*of\s*experience",
        r"(\d+)\+?\s*years?\s*experience",
        r"experience\s*of\s*(\d+)\+?\s*years?",
        r"(\d+)\+?\s*yrs?\s*of\s*experience",
    ]
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            return int(match.group(1))
    return 0

def extract_education(text):
    degrees = [
        "b.tech", "m.tech", "bsc", "msc", "b.sc", "m.sc",
        "bachelor", "master", "phd", "doctorate", "mba",
        "b.e", "m.e", "b.com", "m.com", "b.ca", "m.ca"
    ]
    text_lower = text.lower()
    found = [d for d in degrees if d in text_lower]
    return found[0].upper() if found else "Not specified"

# ── Main Parse Function ────────────────────────────────────────

def parse_resume(text):
    if not text or text == "No text could be extracted from this file.":
        return {
            "name": "Unknown",
            "email": "",
            "phone": "",
            "skills": [],
            "experience_years": 0,
            "education": "Not specified",
            "organizations": [],
            "certifications": [],
            "projects": []
        }

    # Truncate for NER (BERT has 512 token limit)
    truncated = text[:2000]

    ner_results = []
    if NER_AVAILABLE:
        try:
            ner_results = ner(truncated)
        except Exception as e:
            print(f"NER error: {e}")

    name             = extract_name(ner_results)
    email            = extract_email(text)
    phone            = extract_phone(text)
    skills           = extract_skills(text)
    orgs             = extract_orgs(ner_results)
    experience_years = extract_experience_years(text)
    education        = extract_education(text)

    print(f"Parsed: name={name}, email={email}, skills={skills[:5]}, exp={experience_years}yrs")

    return {
        "name":             name,
        "email":            email,
        "phone":            phone,
        "skills":           skills,
        "experience_years": experience_years,
        "education":        education,
        "organizations":    orgs,
        "certifications":   [],
        "projects":         []
    }

# ── Scoring ────────────────────────────────────────────────────

def score_candidate(parsed, jd):
    if not jd or jd.strip() == "":
        return {
            "score": 50,
            "skill_match": 50,
            "experience_match": 50,
            "reasons_selected": ["No job description provided"],
            "reasons_rejected": []
        }

    jd_lower = jd.lower()

    # Skill match
    candidate_skills = [s.lower() for s in parsed.get("skills", [])]
    jd_skills        = [s for s in candidate_skills if s in jd_lower]
    skill_score      = min(int((len(jd_skills) / max(len(candidate_skills), 1)) * 100), 100) if candidate_skills else 30

    # Experience match
    exp_years  = parsed.get("experience_years", 0)
    exp_match  = re.search(r"(\d+)\+?\s*years?", jd_lower)
    req_years  = int(exp_match.group(1)) if exp_match else 2
    if exp_years >= req_years:
        exp_score = 100
    elif exp_years > 0:
        exp_score = int((exp_years / req_years) * 100)
    else:
        exp_score = 30

    # Education match
    edu_score = 80
    if any(d in jd_lower for d in ["b.tech", "bachelor", "bsc", "b.e", "degree"]):
        edu = parsed.get("education", "").lower()
        edu_score = 100 if any(d in edu for d in ["b.tech", "bachelor", "bsc", "b.e", "master", "m.tech"]) else 50

    # Overall score
    overall = int(skill_score * 0.5 + exp_score * 0.3 + edu_score * 0.2)

    reasons_selected = []
    reasons_rejected = []

    if jd_skills:
        reasons_selected.append(f"Matched {len(jd_skills)} skills: {', '.join(jd_skills[:4])}")
    if exp_years >= req_years:
        reasons_selected.append(f"{exp_years} years experience meets requirement")
    elif not reasons_selected:
        reasons_selected.append("Meets basic requirements")

    if skill_score < 40:
        reasons_rejected.append("Low skill overlap with job description")
    if exp_years < req_years:
        reasons_rejected.append(f"Only {exp_years} years experience, {req_years} required")
    if not reasons_rejected:
        reasons_rejected.append("No major gaps identified")

    return {
        "score":            overall,
        "skill_match":      skill_score,
        "experience_match": exp_score,
        "education_match":  edu_score,
        "matched_skills":   jd_skills,
        "reasons_selected": reasons_selected,
        "reasons_rejected": reasons_rejected
    }