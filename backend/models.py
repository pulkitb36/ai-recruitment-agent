import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Text, DateTime, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id               = Column(String, primary_key=True, default=gen_uuid)
    name             = Column(String, nullable=True)
    email            = Column(String, unique=True, nullable=False)
    hashed_password  = Column(String, nullable=False)
    role             = Column(String, default="user")
    created_at       = Column(DateTime, default=datetime.utcnow)

class JobRole(Base):
    __tablename__ = "job_roles"
    id          = Column(String, primary_key=True, default=gen_uuid)
    title       = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    created_by  = Column(String, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    is_active   = Column(Boolean, default=True)

class Candidate(Base):
    __tablename__ = "candidates"
    id          = Column(String, primary_key=True, default=gen_uuid)
    user_id     = Column(String, ForeignKey("users.id"), nullable=True)
    name        = Column(String, nullable=False)
    email       = Column(String, nullable=True)
    resume_text = Column(Text)
    parsed_data = Column(Text)
    match_score = Column(Float)
    jd_text     = Column(Text)
    created_at  = Column(DateTime, default=datetime.utcnow)
    sessions    = relationship("InterviewSession", back_populates="candidate")


class InterviewSession(Base):
    __tablename__ = "sessions"
    id              = Column(String, primary_key=True, default=gen_uuid)
    candidate_id    = Column(String, ForeignKey("candidates.id"), nullable=False)
    status          = Column(String, default="pending")
    question_count  = Column(Integer, default=0)
    duration_secs   = Column(Integer, default=0)
    transcript      = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow)
    completed_at    = Column(DateTime, nullable=True)
    candidate       = relationship("Candidate", back_populates="sessions")
    answers         = relationship("Answer", back_populates="session")
    report          = relationship("Report", back_populates="session", uselist=False)


class Answer(Base):
    __tablename__ = "answers"
    id                  = Column(String, primary_key=True, default=gen_uuid)
    session_id          = Column(String, ForeignKey("sessions.id"), nullable=False)
    question_number     = Column(Integer)
    question_text       = Column(Text)
    answer_text         = Column(Text)
    technical_score     = Column(Float)
    communication_score = Column(Float)
    confidence_score    = Column(Float)
    is_verified         = Column(Boolean, default=False)
    created_at          = Column(DateTime, default=datetime.utcnow)
    session             = relationship("InterviewSession", back_populates="answers")


class Report(Base):
    __tablename__ = "reports"
    id                  = Column(String, primary_key=True, default=gen_uuid)
    session_id          = Column(String, ForeignKey("sessions.id"), nullable=False)
    overall_score       = Column(Float)
    technical_score     = Column(Float)
    communication_score = Column(Float)
    problem_solving     = Column(Float)
    confidence_score    = Column(Float)
    role_fit_score      = Column(Float)
    strengths           = Column(Text)
    weaknesses          = Column(Text)
    improvements        = Column(Text)
    recommendation      = Column(String)
    explanation         = Column(Text)
    pdf_path            = Column(String, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    session             = relationship("InterviewSession", back_populates="report")