import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_SERVER_URL || "http://localhost:3001/api";
const VORLD_APP_ID = process.env.NEXT_PUBLIC_VORLD_APP_ID || "";

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

export class VorldAuthService {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      "x-vorld-app-id": VORLD_APP_ID,
    },
    withCredentials: true,
  });

  constructor() {
    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("authToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  // Email/Password Authentication
  async loginWithEmail(email: string, password: string) {
    try {
      // Hash password with SHA-256 before sending to backend
      const hashedPassword = await sha256(password);

      const response = await this.api.post("/auth/login", {
        email,
        password: hashedPassword,
      });
      console.log("response:", response);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: err.response?.data?.message || "Login failed",
      };
    }
  }

  async verifyOTP(email: string, otp: string) {
    try {
      const response = await this.api.post("/auth/verify-otp", {
        email,
        otp,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: err.response?.data?.message || "OTP verification failed",
      };
    }
  }

  async getProfile() {
    try {
      const token = localStorage.getItem("authToken");
      console.log("Auth token found:", !!token);
      console.log("Token value:", token ? `${token.slice(0, 10)}...` : "null");

      if (!token) {
        return {
          success: false,
          error: "No authentication token found. Please login again.",
        };
      }

      const response = await this.api.get("/user/profile");
      console.log("profile response:", response);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { message?: string } };
      };
      console.error("Profile fetch error:", error);
      console.error("Error response:", err.response);

      // Handle token expiration
      if (err.response?.status === 401) {
        localStorage.removeItem("authToken");
        return {
          success: false,
          error: "Token expired - Please login again",
        };
      }
      return {
        success: false,
        error: err.response?.data?.message || "Failed to get profile",
      };
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem("authToken");
    return !!token;
  }

  // Logout user
  logout(): void {
    localStorage.removeItem("authToken");
  }
}
