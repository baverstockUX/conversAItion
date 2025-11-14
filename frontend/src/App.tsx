import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './components/Home';
import AgentCreator from './components/AgentCreator/AgentCreator';
import Scenarios from './components/Scenarios/Scenarios';
import ConversationView from './components/Conversation/ConversationView';
import AnalysisView from './components/Analysis/AnalysisView';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-950">
        {/* Navigation */}
        <nav className="glass border-b border-white/10 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link to="/" className="flex items-center group">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 group-hover:from-indigo-300 group-hover:via-purple-300 group-hover:to-pink-300 transition-all">
                  🎙️ ConversAItion
                </h1>
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  to="/"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  Home
                </Link>
                <Link
                  to="/scenarios"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  Scenarios
                </Link>
                <Link
                  to="/agents"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                >
                  Agents
                </Link>
                <Link
                  to="/conversation"
                  className="px-4 py-2 rounded-lg text-sm font-medium gradient-primary text-white hover:scale-105 transition-all glow-primary"
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
            <Route path="/scenarios" element={<Scenarios />} />
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
