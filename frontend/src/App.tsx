import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './components/Home';
import AgentCreator from './components/AgentCreator/AgentCreator';
import ConversationView from './components/Conversation/ConversationView';
import AnalysisView from './components/Analysis/AnalysisView';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link to="/" className="flex items-center">
                <h1 className="text-2xl font-bold text-primary-600">🎙️ ConversAItion</h1>
              </Link>
              <div className="flex space-x-4">
                <Link
                  to="/"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  Home
                </Link>
                <Link
                  to="/agents"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  Agents
                </Link>
                <Link
                  to="/conversation"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  Conversation
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/agents" element={<AgentCreator />} />
            <Route path="/conversation" element={<ConversationView />} />
            <Route path="/analysis/:id" element={<AnalysisView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
