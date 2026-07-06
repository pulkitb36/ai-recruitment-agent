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
def signup(req: SignupRequest, db: Session = Depends(get_db)):
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
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name or ""
    })
    return {
        "token": token,
        "email": user.email,
        "role": user.role,
        "name": user.name or "",
        "sub": user.id
    }

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        return {"error": "Incorrect email or password."}

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name or ""
    })
    return {
        "token": token,
        "email": user.email,
        "role": user.role,
        "name": user.name or "",
        "sub": user.id
    }

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
        content = await file.read()
        from resume_parser import extract_text, parse_resume, score_candidate
        text   = extract_text(content, file.filename)
        parsed = parse_resume(text)
        score  = score_candidate(parsed, jd)

        # Use user's registered name as fallback if NER returns Unknown
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

# ── Interview ──────────────────────────────────────────────────
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

@app.websocket("/ws/interview/{session_id}")
async def interview_ws(websocket: WebSocket, session_id: str, db: Session = Depends(get_db)):
    await websocket.accept()
    candidate = None
    resume = {}
    jd = ""
    transcript = []
    start_time = time.time()

    try:
        from question_engine import get_intro, generate_next_question, generate_followup, should_end_interview
        from evaluator import evaluate_single_answer
        from interview import transcribe_audio, generate_tts

        session   = db.query(InterviewSession).filter_by(id=session_id).first()
        candidate = db.query(Candidate).filter_by(id=session.candidate_id).first()
        resume    = json.loads(candidate.parsed_data)
        jd        = candidate.jd_text

        history = []
        question_number = 0

        intro_audio = generate_tts(get_intro())
        await websocket.send_bytes(intro_audio)

        while True:
            elapsed = (time.time() - start_time) / 60
            if should_end_interview(question_number, elapsed):
                await websocket.send_text(json.dumps({"type": "interview_complete"}))
                break

            audio_bytes = await websocket.receive_bytes()

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            answer_text      = transcribe_audio(tmp_path)
            current_question = history[-1]["content"] if history else get_intro()
            scores           = evaluate_single_answer(current_question, answer_text)

            answer = Answer(
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
            db.add(answer)
            db.commit()

            transcript.append({"question": current_question, "answer": answer_text})
            history.append({"role": "user", "content": answer_text})

            await websocket.send_text(json.dumps({
                "type":     "transcript",
                "question": current_question,
                "answer":   answer_text,
                "scores":   scores
            }))

            followup = generate_followup(current_question, answer_text)
            next_q   = followup if followup else generate_next_question(
                resume, jd, history, question_number + 1
            )
            history.append({"role": "assistant", "content": next_q})
            question_number += 1

            tts_audio = generate_tts(next_q)
            await websocket.send_bytes(tts_audio)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass
    finally:
        if candidate:
            try:
                from evaluator import evaluate_full_interview
                from report import generate_pdf_report
                final = evaluate_full_interview(transcript, resume, jd)

                report = Report(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    overall_score=final["overall_score"],
                    technical_score=final["technical_score"],
                    communication_score=final["communication_score"],
                    problem_solving=final["problem_solving"],
                    confidence_score=final["confidence_score"],
                    role_fit_score=final["role_fit_score"],
                    strengths=json.dumps(final["strengths"]),
                    weaknesses=json.dumps(final["weaknesses"]),
                    improvements=json.dumps(final["improvements"]),
                    recommendation=final["recommendation"],
                    explanation=final["explanation"]
                )
                pdf_path = generate_pdf_report(
                    {"id": candidate.id, "name": candidate.name},
                    final,
                    {"duration_secs": int(time.time() - start_time)}
                )
                report.pdf_path      = pdf_path
                session.status       = "completed"
                session.transcript   = json.dumps(transcript)
                session.completed_at = datetime.datetime.utcnow()
                db.add(report)
                db.commit()
            except Exception as e:
                print(f"Final evaluation error: {e}")

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

    sessions = db.query(InterviewSession).filter_by(candidate_id=candidate_id).all()
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

    latest_session = sessions[-1]
    report = db.query(Report).filter_by(session_id=latest_session.id).first()
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
    return {"success": True
