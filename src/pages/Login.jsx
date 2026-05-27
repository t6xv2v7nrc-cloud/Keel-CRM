import { useState } from 'react';
import { signIn } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await signIn(email, password);
    if (err) setError(err.message);
    setLoading(false);
  };

  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-brand">
          <div className="brand-mark" style={{ width: 20, height: 20 }}></div>
          <div>
            <div className="brand-name">Keel Pipeline</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label>Email</label>
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
