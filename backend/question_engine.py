import json
from mock_mode import IS_MOCK, MOCK_QUESTIONS
from config import settings

INTRO_MESSAGE = "Hello, thank you for joining today. I am your AI interviewer. Please introduce yourself."

def get_intro():
    return INTRO_MESSAGE

def generate_next_question(resume, jd, conversation_history, question_number):
    if IS_MOCK:
        idx = min(question_number, len(MOCK_QUESTIONS) - 1)
        return MOCK_QUESTIONS[idx]
    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"""You are a professional AI interviewer.
            Resume: {json.dumps(resume)}
            Job Description: {jd}
            Ask ONE relevant interview question. Do not repeat questions."""},
            *conversation_history
        ],
        temperature=0.7,
        max_tokens=200
    )
    return response.choices[0].message.content.strip()

def generate_followup(last_question, last_answer):
    if IS_MOCK:
        return None
    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": f"""Should I ask a follow-up?
        Question: {last_question}
        Answer: {last_answer}
        Return follow-up question OR exactly "NO_FOLLOWUP"."""}],
        max_tokens=150
    )
    result = response.choices[0].message.content.strip()
    return None if result == "NO_FOLLOWUP" else result

def should_end_interview(question_number, elapsed_minutes):
    return question_number >= settings.max_questions or elapsed_minutes >= settings.max_interview_minutes