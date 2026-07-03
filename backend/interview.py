from config import settings

try:
    import whisper
    stt_model = whisper.load_model(settings.whisper_model)
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    print("Whisper not available — using mock transcription")

def transcribe_audio(audio_path):
    if not WHISPER_AVAILABLE:
        return "This is a mock transcription since Whisper is not installed."
    result = stt_model.transcribe(audio_path)
    return result["text"]

def generate_tts(text):
    from mock_mode import IS_MOCK
    if IS_MOCK:
        return b""
    try:
        from elevenlabs import generate
        return generate(text=text, voice="Rachel", api_key=settings.elevenlabs_api_key)
    except Exception as e:
        print(f"TTS error: {e}")
        return b""