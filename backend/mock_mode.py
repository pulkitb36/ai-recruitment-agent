import os

# Mock mode only applies to OpenAI evaluation features now
IS_MOCK = os.getenv("OPENAI_API_KEY") in ("mock", "your_real_key", "", None)