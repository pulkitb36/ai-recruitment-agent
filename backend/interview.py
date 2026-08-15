from config import settings

def transcribe_audio(audio_path):
    """
    Whisper-based transcription.
    Falls back to mock if not available.
    """
    try:
        import whisper
        model = whisper.load_model(settings.whisper_model)
        result = model.transcribe(audio_path)
        return result["text"]
    except Exception as e:
        print(f"Whisper error: {e}")
        return "mock answer for testing"

def generate_tts(text):
    """
    ElevenLabs TTS — human-like voice.
    Falls back to empty bytes if key not available.
    """
    try:
        from elevenlabs.client import ElevenLabs
        client = ElevenLabs(api_key=settings.elevenlabs_api_key)
        audio = client.text_to_speech.convert(
            voice_id="EXAVITQu4vr4xnSDxMaL",  # Sarah — natural female voice
            text=text,
            model_id="eleven_turbo_v2",         # fastest + most natural
            output_format="mp3_44100_128",
        )
        # audio is a generator — collect all bytes
        audio_bytes = b"".join(audio)
        return audio_bytes
    except Exception as e:
        print(f"TTS error: {e}")
        return b""