import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Building, User, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({ companyName: '', firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 relative overflow-hidden py-12">

      <Link 
        to="/dashboard" 
        style={{
          position: "absolute",
          top: "2rem",
          left: "2.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          color: "#94a3b8",
          textDecoration: "none",
          fontWeight: 500,
          zIndex: 50,
          transition: "color 0.2s ease",
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = "#f8fafc"}
        onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"}
      >
        <ArrowLeft size={20} />
        Back
      </Link>
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-purple-900/20" />
      
      <div className="relative z-10 w-full max-w-md p-8">
        <div className="bg-dark-900/80 backdrop-blur-xl border border-dark-700 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Get Started</h1>
            <p className="text-dark-400 mt-2">Create your HelixAI account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">{error}</div>}
            
            <div className="relative">
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Company Name" className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name" className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500" required />
              </div>
              <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500" required />
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500" required />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password" className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500" required minLength={8} />
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-dark-400 mt-6">Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
