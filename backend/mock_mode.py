import os

# Mock mode is now OFF — using Gemini
IS_MOCK = False

MOCK_PARSED_RESUME = {
    "name": "Unknown",
    "email": "",
    "phone": "",
    "skills": ["python", "javascript", "machine learning"],
    "experience_years": 2,
    "education": "B.Tech",
    "organizations": [],
    "certifications": [],
    "projects": []
}

MOCK_SCORE = {
    "score": 75,
    "skill_match": 80,
    "experience_match": 70,
    "reasons_selected": ["Relevant skills found"],
    "reasons_rejected": ["Limited cloud experience"]
}

MOCK_QUESTIONS = [
    "Tell me about yourself and your background.",
    "What programming languages are you most comfortable with?",
    "Describe a challenging project you have worked on.",
    "How do you handle tight deadlines?",
    "Tell me about a conflict in a team and how you resolved it.",
    "What is your experience with version control systems like Git?",
    "How do you stay updated with new technologies?",
    "Where do you see yourself in 5 years?",
    "Why are you interested in this role?",
    "Do you have any questions for us?",
]

MOCK_EVALUATION = {
    "overall_score": 75,
    "technical_score": 78,
    "communication_score": 72,
    "problem_solving": 76,
    "confidence_score": 70,
    "role_fit_score": 74,
    "strengths": ["Good technical foundation", "Clear communication"],
    "weaknesses": ["Limited cloud experience"],
    "improvements": ["Practice system design", "Learn cloud platforms"],
    "recommendation": "Hire",
    "explanation": "Candidate shows solid foundation with relevant experience."
}