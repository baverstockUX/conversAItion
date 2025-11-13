import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

export class STTService {
  /**
   * Transcribe audio to text using OpenAI Whisper
   * @param audioBuffer Audio data as Buffer
   * @param filename Optional filename (defaults to audio.webm)
   * @returns Transcribed text
   */
  static async transcribe(audioBuffer: Buffer, filename = 'audio.webm'): Promise<string> {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const formData = new FormData();

      // Convert buffer to stream for form-data
      const audioStream = Readable.from(audioBuffer);

      formData.append('file', audioStream, {
        filename,
        contentType: 'audio/webm',
      });
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // Can be made configurable
      formData.append('response_format', 'text');

      const response = await axios.post(WHISPER_API_URL, formData, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      const transcription = response.data;

      if (typeof transcription === 'string') {
        return transcription.trim();
      }

      throw new Error('Unexpected response format from Whisper API');
    } catch (error: any) {
      console.error('Error transcribing audio:', error.response?.data || error.message);

      if (error.response?.status === 401) {
        throw new Error('Invalid OpenAI API key');
      }

      if (error.response?.status === 413) {
        throw new Error('Audio file too large');
      }

      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Check if STT service is properly configured
   */
  static isConfigured(): boolean {
    return !!OPENAI_API_KEY && OPENAI_API_KEY.length > 0;
  }
}
