import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Bot, AlertTriangle, GitBranch, Settings, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/agents', label: 'Agents', icon: Bot },
  { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/workflows', label: 'Workflows', icon: GitBranch },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const Sidebar = () => {
  const { pathname } = useLocation();
  const { logout, company } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-dark-900 border-r border-dark-700 flex flex-col">
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">HelixAI</h1>
            <p className="text-xs text-dark-400">{company?.name || 'Multi-Agent System'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              pathname === path
                ? 'bg-primary-600/20 text-primary-400 border-l-2 border-primary-500'
                : 'text-dark-300 hover:bg-dark-800 hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-dark-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
