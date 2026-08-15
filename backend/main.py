import json
import time
import uuid
import tempfile
import datetime
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, Depends, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from config import settings
from database import get_db, init_db
from models import User, Candidate, InterviewSession, Answer, Report, JobRole
from auth import hash_password, verify_password, create_access_token, get_current_user
<<<<<<< HEAD

# from slowapi import Limiter, _rate_limit_exceeded_handler
# from slowapi.util import get_remote_address
# from slowapi.errors import RateLimitExceeded

# limiter= Limiter(key_func=get_remote_address)
# app.state.limiter = limiter
# app.add_exception_handler(RateLimitExceeded,_rate_limit_exceeded_handler)

=======
# change the name of app
>>>>>>> dcf3fac66f80988cf53ac47854638e7e94065e0f
app = FastAPI(title="AI Recruitment Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

@app.get("/")
def root():
    return {"status": "AI Recruitment Agent is running"}

# ── Auth Models ────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str = ""
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class JobRoleRequest(BaseModel):
    title: str
    description: str

# ── Auth Endpoints ─────────────────────────────────────────────
@app.post("/api/auth/signup")
# @limiter.limit("3minutes")
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if len(req.password) < 8:
        return {"error": "Password must be at least 8 characters."}
    if not any(c.isupper() for c in req.password):
        return {"error": "Password must contain at least one uppercase letter."}
    if not any(c.isdigit() for c in req.password):
        return {"error": "Password must contain at least one number."}
    existing = db.query(User).filter_by(email=req.email).first()
    if existing:
        return {"error": "An account with this email already exists."}
    user = User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
        role="user"
    )
    db.add(user)
    db.commit()
    token = create_access_token({
        "sub": user.id, "email": user.email,
        "role": user.role, "name": user.name or ""
    })
    return {"token": token, "email": user.email, "role": user.role,
            "name": user.name or "", "sub": user.id}

@app.post("/api/auth/login")
# @limiter.limit("5/minute")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        return {"error": "Incorrect email or password."}
    token = create_access_token({
        "sub": user.id, "email": user.email,
        "role": user.role, "name": user.name or ""
    })
    return {"token": token, "email": user.email, "role": user.role,
            "name": user.name or "", "sub": user.id}

@app.get("/api/auth/me")
def me(current_user: dict = Depends(get_current_user)):
    return current_user

# ── Resume Upload ──────────────────────────────────────────────
@app.post("/api/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    jd: str = Form(""),
    user_id: str = Form(None),
    db: Session = Depends(get_db)
):
    try:
        # Read file content
        content = await file.read()
        print(f"Received file: {file.filename}, size: {len(content)} bytes, type: {file.content_type}")

        if len(content) == 0:
            return {"error": "Uploaded file is empty. Please try uploading again."}
        from resume_parser import extract_text, parse_resume, score_candidate
        text   = extract_text(content, file.filename)
        parsed = parse_resume(text)
        score  = score_candidate(parsed, jd)

        extracted_name = parsed.get("name", "Unknown")
        if extracted_name == "Unknown" and user_id:
            user_obj = db.query(User).filter_by(id=user_id).first()
            if user_obj and user_obj.name:
                extracted_name = user_obj.name

        candidate = Candidate(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=extracted_name,
            email=parsed.get("email", ""),
            resume_text=text,
            parsed_data=json.dumps(parsed),
            match_score=score.get("score", 0),
            jd_text=jd
        )
        db.add(candidate)
        db.commit()
        return {"candidate_id": candidate.id, "parsed": parsed, "score": score}
    except Exception as e:
        return {"error": str(e)}

# ── Start Interview ────────────────────────────────────────────
@app.post("/api/start-interview/{candidate_id}")
def start_interview(candidate_id: str, db: Session = Depends(get_db)):
    try:
        from question_engine import get_intro
        session = InterviewSession(
            id=str(uuid.uuid4()),
            candidate_id=candidate_id,
            status="active"
        )
        db.add(session)
        db.commit()
        return {"session_id": session.id, "intro": get_intro()}
    except Exception as e:
        return {"error": str(e)}

# ── WebSocket Interview ────────────────────────────────────────
@app.websocket("/ws/interview/{session_id}")
async def interview_ws(
    websocket: WebSocket,
    session_id: str,
    db: Session = Depends(get_db)
):
    await websocket.accept()

    candidate      = None
    resume         = {}
    jd             = ""
    transcript     = []
    history        = []
    question_number = 0
    start_time     = time.time()

    try:
        from question_engine import (
            get_intro, generate_next_question,
            generate_followup, should_end_interview
        )
        from evaluator import evaluate_single_answer
        from interview import generate_tts

        session = db.query(InterviewSession).filter_by(id=session_id).first()
        if not session:
            await websocket.send_text(json.dumps({
                "type": "error", "message": "Session not found"
            }))
            return

        candidate = db.query(Candidate).filter_by(
            id=session.candidate_id
        ).first()
        if not candidate:
            await websocket.send_text(json.dumps({
                "type": "error", "message": "Candidate not found"
            }))
            return

        resume = json.loads(candidate.parsed_data)
        jd     = candidate.jd_text or ""

        async def send_question(text, num):
            await websocket.send_text(json.dumps({
                "type":            "question",
                "text":            text,
                "question_number": num
            }))
            try:
                tts_audio = generate_tts(text)
                if tts_audio:
                    await websocket.send_bytes(tts_audio)
            except Exception as e:
                print(f"TTS send error: {e}")

        # Main message loop
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except Exception:
                continue

            msg_type = data.get("type", "")

            if msg_type == "start":
                intro = get_intro()
                history.append({"role": "assistant", "content": intro})
                await send_question(intro, 0)

            elif msg_type == "answer":
                answer_text = data.get("text", "").strip()
                if not answer_text:
                    continue

                current_question = history[-1]["content"] if history else get_intro()

                # Safe evaluation
                try:
                    scores = evaluate_single_answer(current_question, answer_text)
                except Exception as e:
                    print(f"Evaluation error: {e}")
                    scores = {
                        "technical_score": 5,
                        "communication_score": 5,
                        "confidence_score": 5,
                        "problem_solving_score": 5,
                        "rag_verified": None
                    }

                # Save answer to DB
                try:
                    answer_obj = Answer(
                        id=str(uuid.uuid4()),
                        session_id=session_id,
                        question_number=question_number,
                        question_text=current_question,
                        answer_text=answer_text,
                        technical_score=scores.get("technical_score", 5),
                        communication_score=scores.get("communication_score", 5),
                        confidence_score=scores.get("confidence_score", 5),
                        is_verified=scores.get("rag_verified") is not None
                    )
                    db.add(answer_obj)
                    db.commit()
                except Exception as e:
                    print(f"DB save error: {e}")

                transcript.append({
                    "question": current_question,
                    "answer": answer_text
                })
                history.append({"role": "user", "content": answer_text})
                question_number += 1

                # Check end condition
                elapsed = (time.time() - start_time) / 60
                if should_end_interview(question_number, elapsed):
                    await websocket.send_text(json.dumps({
                        "type": "interview_complete"
                    }))
                    break

                # Generate next question
                try:
                    followup = generate_followup(current_question, answer_text)
                    next_q = followup if followup else generate_next_question(
                        resume, jd, history, question_number
                    )
                except Exception as e:
                    print(f"Question gen error: {e}")
                    from mock_mode import MOCK_QUESTIONS
                    idx    = min(question_number, len(MOCK_QUESTIONS) - 1)
                    next_q = MOCK_QUESTIONS[idx]

                history.append({"role": "assistant", "content": next_q})
                await send_question(next_q, question_number)

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error", "message": str(e)
            }))
        except Exception:
            pass
    finally:
     if candidate and transcript:
        try:
            from evaluator import evaluate_full_interview
            from report import generate_pdf_report

            print(f"Generating report for {len(transcript)} answers...")
            final = evaluate_full_interview(transcript, resume, jd)
            print(f"Evaluation done: {final.get('recommendation')}")

            report = Report(
                id=str(uuid.uuid4()),
                session_id=session_id,
                overall_score=float(final.get("overall_score", 75)),
                technical_score=float(final.get("technical_score", 75)),
                communication_score=float(final.get("communication_score", 75)),
                problem_solving=float(final.get("problem_solving", 75)),
                confidence_score=float(final.get("confidence_score", 75)),
                role_fit_score=float(final.get("role_fit_score", 75)),
                strengths=json.dumps(final.get("strengths", [])),
                weaknesses=json.dumps(final.get("weaknesses", [])),
                improvements=json.dumps(final.get("improvements", [])),
                recommendation=final.get("recommendation", "Consider"),
                explanation=final.get("explanation", "Interview completed.")
            )

            try:
                pdf_path = generate_pdf_report(
                    {"id": candidate.id, "name": candidate.name},
                    final,
                    {"duration_secs": int(time.time() - start_time)}
                )
                report.pdf_path = pdf_path
            except Exception as pdf_err:
                print(f"PDF generation error: {pdf_err}")
                report.pdf_path = None

            session.status       = "completed"
            session.transcript   = json.dumps(transcript)
            session.completed_at = datetime.datetime.utcnow()

            db.add(report)
            db.commit()
            print(f"Report saved successfully: {report.id}")

        except Exception as e:
            import traceback
            print(f"Final evaluation error: {e}")
            traceback.print_exc()

# ── Report ─────────────────────────────────────────────────────
@app.get("/api/report/{session_id}")
def get_report(session_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter_by(session_id=session_id).first()
    if not report:
        return {"error": "Report not found"}
    return {
        "overall_score":       report.overall_score,
        "technical_score":     report.technical_score,
        "communication_score": report.communication_score,
        "problem_solving":     report.problem_solving,
        "confidence_score":    report.confidence_score,
        "role_fit_score":      report.role_fit_score,
        "strengths":           json.loads(report.strengths or "[]"),
        "weaknesses":          json.loads(report.weaknesses or "[]"),
        "improvements":        json.loads(report.improvements or "[]"),
        "recommendation":      report.recommendation,
        "explanation":         report.explanation,
        "pdf_path":            report.pdf_path
    }

# ── Candidates ─────────────────────────────────────────────────
@app.get("/api/candidates")
def list_candidates(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.get("role") == "admin":
        candidates = db.query(Candidate).all()
    else:
        candidates = db.query(Candidate).filter_by(
            user_id=current_user.get("sub")
        ).all()
    return [
        {
            "id":          c.id,
            "name":        c.name,
            "email":       c.email,
            "match_score": c.match_score,
            "created_at":  str(c.created_at)
        }
        for c in candidates
    ]

@app.delete("/api/candidates/{candidate_id}")
def delete_candidate(
    candidate_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    candidate = db.query(Candidate).filter_by(id=candidate_id).first()
    if not candidate:
        return {"error": "Candidate not found"}
    sessions = db.query(InterviewSession).filter_by(
        candidate_id=candidate_id
    ).all()
    for s in sessions:
        db.query(Answer).filter_by(session_id=s.id).delete()
        db.query(Report).filter_by(session_id=s.id).delete()
        db.delete(s)
    db.delete(candidate)
    db.commit()
    return {"success": True}

@app.get("/api/candidates/{candidate_id}/report")
def get_candidate_report(
    candidate_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(InterviewSession).filter_by(
        candidate_id=candidate_id,
        status="completed"
    ).all()
    if not sessions:
        return {"error": "No completed interviews found"}
    latest  = sessions[-1]
    report  = db.query(Report).filter_by(session_id=latest.id).first()
    if not report:
        return {"error": "No report found"}
    return {
        "overall_score":       report.overall_score,
        "technical_score":     report.technical_score,
        "communication_score": report.communication_score,
        "problem_solving":     report.problem_solving,
        "confidence_score":    report.confidence_score,
        "role_fit_score":      report.role_fit_score,
        "strengths":           json.loads(report.strengths or "[]"),
        "weaknesses":          json.loads(report.weaknesses or "[]"),
        "recommendation":      report.recommendation,
        "explanation":         report.explanation,
    }

# ── Job Roles ──────────────────────────────────────────────────
@app.get("/api/roles")
def get_roles(db: Session = Depends(get_db)):
    roles = db.query(JobRole).filter_by(is_active=True).all()
    return [
        {"id": r.id, "title": r.title, "description": r.description}
        for r in roles
    ]

@app.post("/api/roles")
def create_role(
    req: JobRoleRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    role = JobRole(
        id=str(uuid.uuid4()),
        title=req.title,
        description=req.description,
        created_by=current_user.get("sub")
    )
    db.add(role)
    db.commit()
    return {"id": role.id, "title": role.title, "description": role.description}

@app.delete("/api/roles/{role_id}")
def delete_role(
    role_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    role = db.query(JobRole).filter_by(id=role_id).first()
    if not role:
        return {"error": "Role not found"}
    db.delete(role)
    db.commit()
    return {"success": True}
