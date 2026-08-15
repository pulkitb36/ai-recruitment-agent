FROM python:3.11-slim

WORKDIR /app

RUN pip install --upgrade pip setuptools wheel

<<<<<<< HEAD
=======
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

>>>>>>> dcf3fac66f80988cf53ac47854638e7e94065e0f
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY knowledge_base/ ./knowledge_base/

WORKDIR /app/backend

<<<<<<< HEAD
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
=======
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
>>>>>>> dcf3fac66f80988cf53ac47854638e7e94065e0f
