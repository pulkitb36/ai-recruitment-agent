import json
from config import settings

INTRO_MESSAGE = (
    "Hello, thank you for joining today. I am your AI interviewer. "
    "Let's begin — please tell me a brief introduction about yourself, "
    "your background, and what you have been working on recently."
)

def get_intro():
    return INTRO_MESSAGE

def call_gemini(prompt: str, temperature: float = 0.7) -> str:
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=settings.gemini_api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=300,
        )
    )
    return response.text.strip()

def generate_next_question(resume, jd, conversation_history, question_number):
    try:
        # Build conversation context
        history_text = ""
        for msg in conversation_history[-6:]:  # last 6 messages for context
            role = "Interviewer" if msg["role"] == "assistant" else "Candidate"
            history_text += f"{role}: {msg['content']}\n"

        prompt = f"""You are a professional AI interviewer conducting a job interview.

Candidate Resume:
- Name: {resume.get('name', 'Candidate')}
- Skills: {', '.join(resume.get('skills', []))}
- Experience: {resume.get('experience_years', 0)} years
- Education: {resume.get('education', 'Not specified')}

Job Description: {jd[:500] if jd else 'General technical role'}

Recent conversation:
{history_text}

This is question {question_number + 1} of 10.

Rules:
- Ask ONE specific, relevant interview question
- Base it on the candidate's resume and job description
- If they mentioned something interesting, dig deeper
- Vary between technical, behavioral, and situational questions
- Keep it concise and clear
- Do NOT repeat previous questions
- Return ONLY the question, nothing else"""

        return call_gemini(prompt, temperature=0.8)
    except Exception as e:
        print(f"Gemini question generation error: {e}")
        from mock_mode import MOCK_QUESTIONS
        idx = min(question_number, len(MOCK_QUESTIONS) - 1)
        return MOCK_QUESTIONS[idx]

def generate_followup(last_question, last_answer):
    try:
        prompt = f"""You are an AI interviewer. A candidate just answered an interview question.

Question asked: {last_question}
Candidate's answer: {last_answer}

Decide if a follow-up is needed:
- If the answer was vague, incomplete, or interesting: return a specific follow-up question
- If the answer was complete and thorough: return exactly "NO_FOLLOWUP"

Return ONLY the follow-up question OR "NO_FOLLOWUP", nothing else."""

        result = call_gemini(prompt, temperature=0.5)
        return None if "NO_FOLLOWUP" in result else result
    except Exception as e:
        print(f"Gemini followup error: {e}")
        return None

def should_end_interview(question_number, elapsed_minutes):
    return (
        question_number >= settings.max_questions or
        elapsed_minutes >= settings.max_interview_minutes
    )