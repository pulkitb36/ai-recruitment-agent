import json
from config import settings

def call_gemini_json(prompt: str) -> dict:
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=settings.gemini_api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=600,
        )
    )
    text = response.text.strip()
    text = text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)

def evaluate_single_answer(question, answer):
    try:
        prompt = f"""You are an expert interviewer evaluating a candidate's answer.

Question: {question}
Answer: {answer}

Score this answer and return ONLY valid JSON (no markdown, no explanation):
{{
  "technical_score": <0-10>,
  "communication_score": <0-10>,
  "confidence_score": <0-10>,
  "problem_solving_score": <0-10>,
  "brief_feedback": "<one sentence feedback>",
  "rag_verified": null
}}"""

        return call_gemini_json(prompt)
    except Exception as e:
        print(f"Gemini evaluation error: {e}")
        return {
            "technical_score": 6,
            "communication_score": 6,
            "confidence_score": 6,
            "problem_solving_score": 6,
            "brief_feedback": "Answer recorded.",
            "rag_verified": None
        }

def evaluate_full_interview(transcript, resume, jd):
    try:
        # Format transcript for Gemini
        transcript_text = ""
        for i, entry in enumerate(transcript):
            transcript_text += f"Q{i+1}: {entry['question']}\n"
            transcript_text += f"A{i+1}: {entry['answer']}\n\n"

        prompt = f"""You are a senior recruiter evaluating a complete job interview.

Candidate Profile:
- Skills: {', '.join(resume.get('skills', []))}
- Experience: {resume.get('experience_years', 0)} years
- Education: {resume.get('education', 'Not specified')}

Job Description: {jd[:400] if jd else 'General technical role'}

Interview Transcript:
{transcript_text}

Evaluate the candidate thoroughly and return ONLY valid JSON (no markdown):
{{
  "overall_score": <0-100>,
  "technical_score": <0-100>,
  "communication_score": <0-100>,
  "problem_solving": <0-100>,
  "confidence_score": <0-100>,
  "role_fit_score": <0-100>,
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "improvements": ["<area1>", "<area2>"],
  "recommendation": "<Strong Hire|Hire|Consider|Reject>",
  "explanation": "<2-3 sentence explanation of recommendation>"
}}"""

        return call_gemini_json(prompt)
    except Exception as e:
        print(f"Gemini full evaluation error: {e}")
        from mock_mode import MOCK_EVALUATION
        return MOCK_EVALUATION