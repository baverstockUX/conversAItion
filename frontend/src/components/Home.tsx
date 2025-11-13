import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-gray-950 to-purple-950">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-block mb-6">
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300">
              AI-Powered Conversations
            </span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-gradient">ConversAItion</span>
          </h1>

          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Create realistic multi-agent conversations powered by AI. Practice interviews, run D&D adventures,
            or engage in dynamic roleplay with up to 3 distinct AI agents.
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              to="/conversation"
              className="group px-8 py-4 gradient-primary rounded-xl font-semibold text-white hover:scale-105 transition-all duration-300 glow-primary flex items-center gap-2"
            >
              <span>Start Conversation</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/agents"
              className="px-8 py-4 glass glass-hover rounded-xl font-semibold text-white flex items-center gap-2"
            >
              <span>Manage Agents</span>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="glass glass-hover rounded-2xl p-8 group">
            <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform glow-primary">
              👥
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Create Agents</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Design AI agents with custom personalities, voices, and auto-generated avatars
            </p>
            <Link
              to="/agents"
              className="inline-flex items-center text-indigo-400 hover:text-indigo-300 font-medium group/link"
            >
              Manage Agents
              <svg className="w-4 h-4 ml-1 group-hover/link:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="glass glass-hover rounded-2xl p-8 group">
            <div className="w-14 h-14 rounded-xl gradient-accent flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform glow-accent">
              💬
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Start Conversation</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Engage in natural, voice-based conversations with your AI agents in real-time
            </p>
            <Link
              to="/conversation"
              className="inline-flex items-center text-cyan-400 hover:text-cyan-300 font-medium group/link"
            >
              Start Talking
              <svg className="w-4 h-4 ml-1 group-hover/link:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="glass glass-hover rounded-2xl p-8 group">
            <div className="w-14 h-14 rounded-xl gradient-secondary flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform glow-secondary">
              📊
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Get Feedback</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Receive AI-powered analysis and insights on your conversation performance
            </p>
            <div className="inline-flex items-center text-gray-500 font-medium cursor-not-allowed">
              After Conversation
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="glass rounded-3xl p-10 backdrop-blur-2xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Quick Start Guide</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center font-bold text-white">1</div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Create Agents</h4>
                <p className="text-gray-400 text-sm leading-relaxed">Create 1-3 AI agents with unique personalities and voices</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center font-bold text-white">2</div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Start Conversation</h4>
                <p className="text-gray-400 text-sm leading-relaxed">Select your agents and topic to begin the conversation</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg gradient-secondary flex items-center justify-center font-bold text-white">3</div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Speak Naturally</h4>
                <p className="text-gray-400 text-sm leading-relaxed">Agents will listen and respond in turn, creating dynamic conversations</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white">4</div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Get Feedback</h4>
                <p className="text-gray-400 text-sm leading-relaxed">End the conversation and view AI-generated analysis</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
