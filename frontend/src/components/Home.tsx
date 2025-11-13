import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to ConversAItion
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Create realistic multi-agent conversations powered by AI. Practice interviews, run D&D adventures,
          or engage in dynamic roleplay with up to 3 distinct AI agents.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold mb-2">Create Agents</h3>
            <p className="text-gray-600 mb-4">
              Design AI agents with custom personalities, voices, and avatars
            </p>
            <Link
              to="/agents"
              className="inline-block px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Manage Agents
            </Link>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-semibold mb-2">Start Conversation</h3>
            <p className="text-gray-600 mb-4">
              Engage in natural, voice-based conversations with your AI agents
            </p>
            <Link
              to="/conversation"
              className="inline-block px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Start Talking
            </Link>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">Get Feedback</h3>
            <p className="text-gray-600 mb-4">
              Receive AI-powered analysis and insights on your performance
            </p>
            <div className="inline-block px-4 py-2 bg-gray-300 text-gray-600 rounded-md cursor-not-allowed">
              After Conversation
            </div>
          </div>
        </div>

        <div className="mt-16 bg-blue-50 p-8 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start Guide</h2>
          <ol className="text-left max-w-2xl mx-auto space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="font-bold text-primary-600 mr-2">1.</span>
              <span>Create 1-3 AI agents with unique personalities and voices</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-primary-600 mr-2">2.</span>
              <span>Start a conversation, select your agents and topic</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-primary-600 mr-2">3.</span>
              <span>Speak naturally - agents will listen and respond in turn</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-primary-600 mr-2">4.</span>
              <span>End the conversation and view AI-generated analysis</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
