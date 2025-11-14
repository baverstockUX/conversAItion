import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { conversationsApi } from '../../services/api';
import type { Conversation, ConversationAnalysis } from '../../types';

export default function AnalysisView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [convRes, analysisRes] = await Promise.all([
          conversationsApi.getById(id),
          conversationsApi.getAnalysis(id),
        ]);

        setConversation(convRes.data);
        setAnalysis(analysisRes.data);
      } catch (err: any) {
        console.error('Error fetching analysis:', err);
        setError(err.message || 'Failed to load analysis');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">Loading analysis...</div>
      </div>
    );
  }

  if (error || !conversation || !analysis) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-md">
          {error || 'Analysis not available'}
        </div>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-primary-400 hover:text-primary-300 mb-4"
        >
          ← Back to Home
        </button>
        <h1 className="text-3xl font-bold text-gray-100">{conversation.title}</h1>
        <p className="text-gray-400 mt-2">Topic: {conversation.topic}</p>
      </div>

      {/* Summary */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-3 text-gray-100">Summary</h2>
        <p className="text-gray-300">{analysis.summary}</p>
      </div>

      {/* Strengths */}
      <div className="bg-green-900/20 border border-green-700 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold text-green-400 mb-3">✅ Strengths</h2>
        <ul className="space-y-2">
          {analysis.userPerformance.strengths.map((strength, index) => (
            <li key={index} className="flex items-start">
              <span className="text-green-400 mr-2">•</span>
              <span className="text-gray-300">{strength}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Areas for Improvement */}
      <div className="bg-yellow-900/20 border border-yellow-700 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold text-yellow-400 mb-3">📈 Areas for Improvement</h2>
        <ul className="space-y-2">
          {analysis.userPerformance.improvements.map((improvement, index) => (
            <li key={index} className="flex items-start">
              <span className="text-yellow-400 mr-2">•</span>
              <span className="text-gray-300">{improvement}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Key Moments */}
      {analysis.userPerformance.keyMoments.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-700 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold text-blue-400 mb-3">💡 Key Moments</h2>
          <ul className="space-y-2">
            {analysis.userPerformance.keyMoments.map((moment, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span className="text-gray-300">{moment}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Feedback */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-6 border border-gray-700">
        <h2 className="text-xl font-semibold mb-3 text-gray-100">Detailed Feedback</h2>
        <div className="text-gray-300 whitespace-pre-wrap">{analysis.feedback}</div>
      </div>

      {/* Transcript */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-100">Full Transcript</h2>
        <div className="space-y-3">
          {conversation.messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg ${
                message.speaker === 'user' ? 'bg-blue-900/30 border border-blue-800' : 'bg-gray-700/50 border border-gray-600'
              }`}
            >
              <div className="flex items-center mb-1">
                <span className="font-semibold text-sm mr-2 text-gray-200">
                  {message.speaker === 'user' ? 'You' : 'Agent'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-gray-300">{message.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
