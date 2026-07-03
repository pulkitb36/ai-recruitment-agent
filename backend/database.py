from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

engine = create_engine(
    "sqlite:///./recruitment.db",
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from models import User, Candidate, InterviewSession, Answer, Report, JobRole  # noqa
    Base.metadata.create_all(bind=engine)
    seed_admin()

def seed_admin():
    from models import User
    from auth import hash_password
    db = SessionLocal()
    try:
        existing = db.query(User).filter_by(email="admin").first()
        if not existing:
            admin = User(
                email="admin",
                hashed_password=hash_password("admin123"),
                role="admin"
            )
            db.add(admin)
            db.commit()
            print("Admin account created: admin / admin123")
    finally:
        db.close()