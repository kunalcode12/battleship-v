import { useState } from "react";
import { VorldAuthService } from "../../lib/authservice";

export default function EmailLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const authService = new VorldAuthService();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Password will be automatically hashed with SHA-256 in authService
      const result = await authService.loginWithEmail(email, password);

      if (result.success) {
        if (result.data.requiresOTP) {
          setShowOtp(true);
        } else {
          // Login successful, redirect to dashboard
          window.location.href = "/dashboard";
        }
      } else {
        alert(result.error);
      }
    } catch {
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await authService.verifyOTP(email, otp);

      if (result.success) {
        window.location.href = "/dashboard";
      } else {
        alert(result.error);
      }
    } catch {
      alert("OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-gray-800 ">
      {!showOtp ? (
        <form onSubmit={handleLogin}>
          <h2 className="text-2xl font-bold text-white mb-6">Login</h2>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpVerification}>
          <h2 className="text-2xl font-bold text-white mb-6">Verify OTP</h2>
          <p className="text-gray-300 mb-4">
            Enter the 6-digit code sent to your email
          </p>
          <div className="mb-6">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white p-3 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      )}
    </div>
  );
}
