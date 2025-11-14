import axios from 'axios';
import { ElevenLabsVoice } from '../../../shared/types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export class TTSService {
  /**
   * Convert text to speech using ElevenLabs
   * @param text Text to convert
   * @param voiceId ElevenLabs voice ID
   * @returns Audio data as Buffer
   */
  static async synthesize(text: string, voiceId: string): Promise<Buffer> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    if (!text || !text.trim()) {
      throw new Error('No text to synthesize');
    }

    try {
      const response = await axios.post(
        `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
        {
          text: text,
          model_id: 'eleven_turbo_v2_5', // Fast, good quality, works with paid accounts
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: 1.0, // Normal speech speed
          },
        },
        {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          responseType: 'arraybuffer',
        }
      );

      return Buffer.from(response.data);
    } catch (error: any) {
      // Log full error details
      if (error.response?.data) {
        const errorData = Buffer.isBuffer(error.response.data)
          ? error.response.data.toString()
          : JSON.stringify(error.response.data);
        console.error('ElevenLabs API error:', errorData);
      } else {
        console.error('Error synthesizing speech:', error.message);
      }

      if (error.response?.status === 401) {
        throw new Error('Invalid ElevenLabs API key');
      }

      if (error.response?.status === 400) {
        throw new Error('Invalid voice ID or text');
      }

      throw new Error(`Speech synthesis failed: ${error.message}`);
    }
  }

  /**
   * Get list of available voices from ElevenLabs
   * @returns Array of voice objects
   */
  static async getVoices(): Promise<ElevenLabsVoice[]> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await axios.get(`${ELEVENLABS_BASE_URL}/voices`, {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      });

      const voices = response.data.voices;

      return voices.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        labels: voice.labels,
        description: voice.description,
        preview_url: voice.preview_url,
      }));
    } catch (error: any) {
      console.error('Error fetching voices:', error.response?.data || error.message);

      if (error.response?.status === 401) {
        throw new Error('Invalid ElevenLabs API key');
      }

      throw new Error(`Failed to fetch voices: ${error.message}`);
    }
  }

  /**
   * Stream text-to-speech (for lower latency)
   * @param text Text to convert
   * @param voiceId ElevenLabs voice ID
   * @returns Readable stream of audio data
   */
  static async synthesizeStream(text: string, voiceId: string): Promise<NodeJS.ReadableStream> {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    if (!text || !text.trim()) {
      throw new Error('No text to synthesize');
    }

    console.log(`[TTS] Synthesizing text (length: ${text.length}): "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);

    try {
      const response = await axios.post(
        `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}/stream`,
        {
          text: text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: 1.0, // Normal speech speed
          },
        },
        {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          responseType: 'stream',
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error streaming speech:', error.response?.data || error.message);
      throw new Error(`Speech streaming failed: ${error.message}`);
    }
  }

  /**
   * Check if TTS service is properly configured
   */
  static isConfigured(): boolean {
    return !!ELEVENLABS_API_KEY && ELEVENLABS_API_KEY.length > 0;
  }
}
