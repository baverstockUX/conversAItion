import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { TTSService } from './tts.service';
import { STTService } from './stt.service';
import { LMStudioService } from './lmstudio.service';
import axios from 'axios';

export interface ValidationResult {
  service: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

export class StartupValidationService {
  /**
   * Validate all API services on startup
   */
  static async validateAllServices(): Promise<ValidationResult[]> {
    console.log('\n🔍 Validating API services...\n');

    const results: ValidationResult[] = [];

    // Validate LM Studio (local inference for agent responses)
    results.push(await this.validateLMStudio());

    // Validate AWS Bedrock (Claude) - used for scoring only in hybrid mode
    results.push(await this.validateBedrock());

    // Validate ElevenLabs
    results.push(await this.validateElevenLabs());

    // Validate OpenAI Whisper
    results.push(await this.validateWhisper());

    // Print summary
    this.printSummary(results);

    return results;
  }

  /**
   * Validate AWS Bedrock (Claude) access
   */
  private static async validateBedrock(): Promise<ValidationResult> {
    try {
      const awsProfile = process.env.AWS_PROFILE;
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      const region = process.env.AWS_REGION || 'us-east-1';

      // Check if credentials are configured (either profile or explicit keys)
      if (!awsProfile && (!accessKeyId || !secretAccessKey)) {
        return {
          service: 'AWS Bedrock (Claude)',
          status: 'error',
          message: 'Missing AWS credentials. Set AWS_PROFILE or AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in .env',
        };
      }

      // Create client configuration
      const clientConfig: any = { region };

      // Only set explicit credentials if not using AWS_PROFILE
      if (!awsProfile && accessKeyId) {
        clientConfig.credentials = {
          accessKeyId,
          secretAccessKey: secretAccessKey || '',
          sessionToken: process.env.AWS_SESSION_TOKEN,
        };
      }

      // Try to invoke Claude with a simple test
      const client = new BedrockRuntimeClient(clientConfig);

      const modelId = process.env.CLAUDE_MODEL_HAIKU || 'anthropic.claude-3-5-haiku-20241022-v1:0';

      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      await client.send(command);

      const authMethod = awsProfile ? `profile: ${awsProfile}` : 'explicit credentials';
      return {
        service: 'AWS Bedrock (Claude)',
        status: 'success',
        message: `Connected successfully (region: ${region}, ${authMethod})`,
      };
    } catch (error: any) {
      return {
        service: 'AWS Bedrock (Claude)',
        status: 'error',
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate ElevenLabs API
   */
  private static async validateElevenLabs(): Promise<ValidationResult> {
    try {
      const apiKey = process.env.ELEVENLABS_API_KEY;

      if (!apiKey) {
        return {
          service: 'ElevenLabs (TTS)',
          status: 'error',
          message: 'Missing API key. Set ELEVENLABS_API_KEY in .env',
        };
      }

      // Try to fetch voices list (lightweight test)
      const voices = await TTSService.getVoices();

      return {
        service: 'ElevenLabs (TTS)',
        status: 'success',
        message: `Connected successfully (${voices.length} voices available)`,
      };
    } catch (error: any) {
      let message = 'Connection failed';

      if (error.message.includes('Invalid ElevenLabs API key')) {
        message = 'Invalid API key';
      } else if (error.message.includes('401')) {
        message = 'Authentication failed - check API key';
      } else {
        message = `Connection failed: ${error.message}`;
      }

      return {
        service: 'ElevenLabs (TTS)',
        status: 'error',
        message,
      };
    }
  }

  /**
   * Validate OpenAI Whisper API
   */
  private static async validateWhisper(): Promise<ValidationResult> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        return {
          service: 'OpenAI Whisper (STT)',
          status: 'error',
          message: 'Missing API key. Set OPENAI_API_KEY in .env',
        };
      }

      // Check if API key format is valid
      if (!apiKey.startsWith('sk-')) {
        return {
          service: 'OpenAI Whisper (STT)',
          status: 'warning',
          message: 'API key format looks incorrect (should start with "sk-")',
        };
      }

      // Try to verify the API key by making a lightweight request
      // We'll just check if we can access the models endpoint
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 5000,
      });

      if (response.status === 200) {
        return {
          service: 'OpenAI Whisper (STT)',
          status: 'success',
          message: 'Connected successfully',
        };
      }

      return {
        service: 'OpenAI Whisper (STT)',
        status: 'warning',
        message: 'Unexpected response from API',
      };
    } catch (error: any) {
      let message = 'Connection failed';

      if (error.response?.status === 401) {
        message = 'Invalid API key or unauthorized';
      } else if (error.response?.status === 429) {
        message = 'Rate limited or quota exceeded';
      } else if (error.response?.data?.error?.message) {
        message = error.response.data.error.message;
      } else if (error.message) {
        message = error.message;
      }

      // If we can't verify but have a key, give a warning instead of error
      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        return {
          service: 'OpenAI Whisper (STT)',
          status: 'warning',
          message: `Network error: ${message}. API key present but couldn't verify connection.`,
        };
      }

      return {
        service: 'OpenAI Whisper (STT)',
        status: 'error',
        message,
      };
    }
  }

  /**
   * Validate LM Studio local server connection
   */
  private static async validateLMStudio(): Promise<ValidationResult> {
    try {
      const result = await LMStudioService.testConnection();

      if (!result.available) {
        return {
          service: 'LM Studio (Local Inference)',
          status: 'error',
          message: result.error || 'Connection failed',
        };
      }

      return {
        service: 'LM Studio (Local Inference)',
        status: 'success',
        message: `Connected successfully (model: ${result.model})`,
      };
    } catch (error: any) {
      return {
        service: 'LM Studio (Local Inference)',
        status: 'error',
        message: error.message || 'Connection failed',
      };
    }
  }

  /**
   * Print validation summary
   */
  private static printSummary(results: ValidationResult[]): void {
    console.log('\n📋 API Validation Summary:\n');

    const maxServiceLength = Math.max(...results.map(r => r.service.length));

    results.forEach((result) => {
      const statusIcon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      const serviceName = result.service.padEnd(maxServiceLength);
      console.log(`${statusIcon} ${serviceName}  ${result.message}`);
    });

    const errors = results.filter(r => r.status === 'error');
    const warnings = results.filter(r => r.status === 'warning');

    console.log('');

    if (errors.length > 0) {
      console.log('❌ Critical errors detected! Some features will not work.');
      console.log('   Please check your API keys and credentials in backend/.env\n');
    } else if (warnings.length > 0) {
      console.log('⚠️  Warnings detected. Some features may have issues.');
      console.log('   Check the messages above for details.\n');
    } else {
      console.log('✅ All API services validated successfully!\n');
    }
  }

  /**
   * Check if server should start despite errors
   */
  static shouldAllowStartup(results: ValidationResult[]): boolean {
    // Always allow startup - services will gracefully fallback if needed
    // Log warnings but don't block server startup
    return true;
  }
}
