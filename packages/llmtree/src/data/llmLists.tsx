import AnthropicIcon from '@/assets/anthropic.webp'
import GoogleIcon from '@/assets/google.png'
import GroqIcon from '@/assets/groq.png'
import OpenAIIcon from '@/assets/openai.svg'

interface LlmProviderInfo {
  name: string
  icon: React.ReactNode
  defaultBaseUrl?: string
  modelList: string[]
}

export const LLM_PROVIDER_INFO: Record<string, LlmProviderInfo> = {
  openai: {
    name: 'OpenAI',
    icon: <img src={OpenAIIcon} alt="OpenAI" className="w-4 h-4" />,
    modelList: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  },
  anthropic: {
    name: 'Anthropic',
    icon: <img src={AnthropicIcon} alt="Anthropic" className="w-4 h-4" />,
    modelList: [
      'claude-3-5-sonnet-20240620',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
  },
  groq: {
    name: 'Groq',
    icon: <img src={GroqIcon} alt="Groq" className="w-4 h-4" />,
    modelList: [
      'gemma2-9b-it',
      'gemma-7b-it',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'llama3-70b-8192',
      'llama3-8b-8192',
      'mixtral-8x7b-32768',
    ],
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
  },
  google: {
    name: 'Google',
    icon: <img src={GoogleIcon} alt="Google" className="w-4 h-4" />,
    modelList: [
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest',
      'gemini-1.0-pro-latest',
    ],
  },
}
