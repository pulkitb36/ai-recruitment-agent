import json
from mock_mode import IS_MOCK, MOCK_EVALUATION
from rag_knowledge_base import verify_answer
from config import settings

def evaluate_single_answer(question, answer):
    if IS_MOCK:
        return {"technical_score": 7, "communication_score": 7, "confidence_score": 7,
                "problem_solving_score": 7, "brief_feedback": "Mock evaluation", "rag_verified": None}
    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key)
    verification = verify_answer(question, answer)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": f"""Score this answer.
        Question: {question}
        Answer: {answer}
        RAG result: {json.dumps(verification)}
        Return JSON: {{"technical_score": 0-10, "communication_score": 0-10,
        "confidence_score": 0-10, "problem_solving_score": 0-10, "brief_feedback": ""}}"""}],
        temperature=0.2,
        max_tokens=200
    )
    scores = json.loads(response.choices[0].message.content)
    scores["rag_verified"] = verification.get("is_correct")
    return scores

def evaluate_full_interview(transcript, resume, jd):
    if IS_MOCK:
        return MOCK_EVALUATION
    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": f"""Evaluate this complete interview.
        Resume: {json.dumps(resume)}
        JD: {jd}
        Transcript: {json.dumps(transcript)}
        Return JSON: {{"overall_score":0,"technical_score":0,"communication_score":0,
        "problem_solving":0,"confidence_score":0,"role_fit_score":0,
        "strengths":[],"weaknesses":[],"improvements":[],
        "recommendation":"Strong Hire/Hire/Consider/Reject","explanation":""}}"""}],
        temperature=0.3,
        max_tokens=600
    )
    return json.loads(response.choices[0].message.content)