import { io, Socket } from "socket.io-client";
import axios, { AxiosError } from "axios";

const GAME_API_URL = "https://dev.reactive.thevorld.com/api";
const VORLD_APP_ID = "app_mgs5crer_51c332b3";
const ARENA_GAME_ID = "arcade_mgs5dyjd_232b1df7";

export interface GamePlayer {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface GameEvent {
  id: string;
  eventName: string;
  isFinal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GamePackage {
  id: string;
  name: string;
  image: string;
  stats: Array<{
    name: string;
    currentValue: number;
    maxValue: number;
    description: string;
  }>;
  players: string[];
  type: string;
  cost: number;
  unlockAtPoints: number;
  metadata: {
    id: string;
    type: string;
    quantity: string;
  };
}

export interface EvaGameDetails {
  _id: string;
  gameId: string;
  vorldAppId: string;
  appName: string;
  gameDeveloperId: string;
  arcadeGameId: string;
  isActive: boolean;
  numberOfCycles: number;
  cycleTime: number;
  waitingTime: number;
  players: GamePlayer[];
  events: GameEvent[];
  packages: GamePackage[];
  createdAt: string;
  updatedAt: string;
}

export interface GameState {
  gameId: string;
  expiresAt: string;
  status: "pending" | "active" | "completed" | "cancelled";
  websocketUrl: string;
  evaGameDetails: EvaGameDetails;
  arenaActive: boolean;
  countdownStarted: boolean;
}

export interface BoostData {
  playerId: string;
  playerName: string;
  currentCyclePoints: number;
  totalPoints: number;
  arenaCoinsSpent: number;
  newArenaCoinsBalance: number;
}

export interface ItemDrop {
  itemId: string;
  itemName: string;
  targetPlayer: string;
  cost: number;
}

export class ArenaGameService {
  private socket: Socket | null = null;
  private gameState: GameState | null = null;
  private userToken: string = "";

  // Initialize game with stream URL
  async initializeGame(
    streamUrl: string,
    userToken: string
  ): Promise<{ success: boolean; data?: GameState; error?: string }> {
    try {
      this.userToken = userToken;
      console.log("User Token:", this.userToken);
      console.log("Stream URL:", streamUrl);

      const response = await axios.post(
        `${GAME_API_URL}/games/init`,
        {
          streamUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "X-Arena-Arcade-Game-ID": ARENA_GAME_ID,
            "X-Vorld-App-ID": VORLD_APP_ID,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("response initializeGame", response);

      this.gameState = response.data.data;

      // Connect to WebSocket
      if (this.gameState?.websocketUrl) {
        await this.connectWebSocket();
      }

      return {
        success: true,
        data: this.gameState ?? undefined,
      };
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: err.response?.data?.message || "Failed to initialize game",
      };
    }
  }

  private async connectWebSocket(): Promise<boolean> {
    try {
      if (!this.gameState?.websocketUrl) {
        console.error("No WebSocket URL provided");
        return false;
      }

      // Close existing connection if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      const providedUrl = "https://dev.reactive.thevorld.com/";
      console.log("Original WebSocket URL:", providedUrl);

      let wsUrl: string;
      let socketPath = "/socket.io/"; // Default Socket.IO path

      try {
        const parsed = new URL(providedUrl);

        // Convert ws/wss to http/https for Socket.IO client
        const protocol = parsed.protocol === "wss:" ? "https:" : "http:";

        // Extract the base URL (protocol + host)
        wsUrl = `${protocol}//${parsed.host}`;

        // If there's a custom path (like /ws/gameId), extract it
        if (
          parsed.pathname &&
          parsed.pathname !== "/" &&
          parsed.pathname !== "/socket.io/"
        ) {
          socketPath = parsed.pathname.endsWith("/")
            ? parsed.pathname
            : `${parsed.pathname}/`;
        }

        console.log("Parsed WebSocket URL:", wsUrl);
        console.log("Socket.IO Path:", socketPath);
      } catch (e) {
        console.error("Failed to parse WebSocket URL:", e);
        return false;
      }

      // Create Socket.IO connection
      this.socket = io(wsUrl, {
        path: socketPath,
        transports: ["websocket", "polling"],
        timeout: 30000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        reconnectionDelayMax: 5000,
        auth: {
          token: this.userToken,
          appId: VORLD_APP_ID,
        },
        extraHeaders: {
          "X-Arena-Arcade-Game-ID": ARENA_GAME_ID,
          "X-Vorld-App-ID": VORLD_APP_ID,
        },
      });

      this.setupEventListeners();

      return new Promise((resolve) => {
        const connectTimeout = setTimeout(() => {
          console.error("❌ WebSocket connection timeout");
          resolve(false);
        }, 30000);

        this.socket?.on("connect", () => {
          clearTimeout(connectTimeout);
          console.log("✅ WebSocket connected! Socket ID:", this.socket?.id);
          resolve(true);
        });

        this.socket?.on("connect_error", (error: Error) => {
          clearTimeout(connectTimeout);
          console.error("❌ WebSocket connection failed:", error.message);
          console.error("Error details:", error);
          resolve(false);
        });
      });
    } catch (error: unknown) {
      console.error("Failed to connect to WebSocket:", error);
      return false;
    }
  }

  // Set up WebSocket event listeners
  private setupEventListeners(): void {
    if (!this.gameState?.gameId) {
      console.error("Game ID is not set");
      return;
    }

    this.socket?.emit("join_game", this.gameState?.gameId);

    // Arena Events
    this.socket?.on("arena_countdown_started", (data: unknown) => {
      this.onArenaCountdownStarted?.(data);
      console.log("Arena countdown started:", data);
    });

    this.socket?.on("countdown_update", (data: unknown) => {
      this.onCountdownUpdate?.(data);
      console.log("Countdown update:", data);
    });

    this.socket?.on("arena_begins", (data: unknown) => {
      this.onArenaBegins?.(data);
      console.log("Arena begins:", data);
    });

    // Boost Events
    this.socket?.on("player_boost_activated", (data: unknown) => {
      this.onPlayerBoostActivated?.(data);
      console.log("Player boost activated:", data);
    });

    this.socket?.on("boost_cycle_update", (data: unknown) => {
      console.log("Boost cycle update:", data);
      this.onBoostCycleUpdate?.(data);
    });

    this.socket?.on("boost_cycle_complete", (data: unknown) => {
      console.log("Boost cycle complete:", data);
      this.onBoostCycleComplete?.(data);
    });

    // Package Events
    this.socket?.on("package_drop", (data: unknown) => {
      console.log("Package drop:", data);
      this.onPackageDrop?.(data);
    });

    this.socket?.on("immediate_item_drop", (data: unknown) => {
      console.log("Immediate item drop:", data);
      this.onImmediateItemDrop?.(data);
    });

    // Game Events
    this.socket?.on("event_triggered", (data: unknown) => {
      this.onEventTriggered?.(data);
    });

    this.socket?.on("player_joined", (data: unknown) => {
      this.onPlayerJoined?.(data);
    });

    this.socket?.on("game_completed", (data: unknown) => {
      this.onGameCompleted?.(data);
    });

    this.socket?.on("game_stopped", (data: unknown) => {
      this.onGameStopped?.(data);
    });
  }

  // Get game details
  async getGameDetails(
    gameId: string
  ): Promise<{ success: boolean; data?: GameState; error?: string }> {
    try {
      const response = await axios.get(`${GAME_API_URL}/games/${gameId}`, {
        headers: {
          Authorization: `Bearer ${this.userToken}`,
          "X-Arena-Arcade-Game-ID": ARENA_GAME_ID,
          "X-Vorld-App-ID": VORLD_APP_ID,
        },
      });

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: err.response?.data?.message || "Failed to get game details",
      };
    }
  }

  // Boost a player
  async boostPlayer(
    gameId: string,
    playerId: string,
    amount: number,
    username: string
  ): Promise<{ success: boolean; data?: BoostData; error?: string }> {
    try {
      if (!gameId || !playerId || !amount || !username) {
        console.error("Missing required parameters:", {
          gameId,
          playerId,
          amount,
          username,
        });
        return {
          success: false,
          error: "Missing required parameters",
        };
      }

      if (!this.userToken) {
        console.error("User token is missing");
        return {
          success: false,
          error: "Authentication token is missing",
        };
      }

      console.log("=== Boost Player Request ===");
      console.log("User Token:", this.userToken ? "Present" : "Missing");
      console.log("Arena Game ID:", ARENA_GAME_ID);
      console.log("Vorld App ID:", VORLD_APP_ID);
      console.log("Game API URL:", GAME_API_URL);
      console.log("Game ID:", gameId);
      console.log("Player ID:", playerId);
      console.log("Amount:", amount);
      console.log("Username:", username);
      console.log(
        "Full URL:",
        `${GAME_API_URL}/games/boost/player/${gameId}/${playerId}`
      );

      const response = await axios.post(
        `${GAME_API_URL}/games/boost/player/${gameId}/${playerId}`,
        {
          amount,
          username,
        },
        {
          headers: {
            Authorization: `Bearer ${this.userToken}`,
            "X-Arena-Arcade-Game-ID": ARENA_GAME_ID,
            "X-Vorld-App-ID": VORLD_APP_ID,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      console.log("✅ Boost response status:", response.status);
      console.log("✅ Boost response data:", response.data);

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: unknown) {
      console.error("❌ Boost Player Error - Full details:");

      if (axios.isAxiosError(error)) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Status:", error.response?.status);
        console.error("Response data:", error.response?.data);
        console.error("Request URL:", error.config?.url);
        console.error("Request headers:", error.config?.headers);
        console.error("Request body:", error.config?.data);

        return {
          success: false,
          error:
            (error.response?.data as { error?: { message?: string }; message?: string })?.error?.message ||
            (error.response?.data as { message?: string })?.message ||
            error.message ||
            "Failed to boost player",
        };
      }

      const err = error as Error;
      console.error("Non-Axios error:", err);
      return {
        success: false,
        error: err.message || "Failed to boost player",
      };
    }
  }

  // Update stream URL
  async updateStreamUrl(
    gameId: string,
    streamUrl: string,
    oldStreamUrl: string
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const response = await axios.put(
        `${GAME_API_URL}/games/${gameId}/stream-url`,
        {
          streamUrl,
          oldStreamUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${this.userToken}`,
            "X-Arena-Arcade-Game-ID": ARENA_GAME_ID,
            "X-Vorld-App-ID": VORLD_APP_ID,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: err.response?.data?.message || "Failed to update stream URL",
      };
    }
  }

  // Get items catalog
  async getItemsCatalog(): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }> {
    try {
      const response = await axios.get(`${GAME_API_URL}/items/catalog`, {
        headers: {
          Authorization: `Bearer ${this.userToken}`,
          "X-Arena-Arcade-Game-ID": ARENA_GAME_ID,
          "X-Vorld-App-ID": VORLD_APP_ID,
        },
      });

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: err.response?.data?.message || "Failed to get items catalog",
      };
    }
  }

  // Drop immediate item
  async dropImmediateItem(
    gameId: string,
    itemId: string,
    targetPlayer: string
  ): Promise<{ success: boolean; data?: ItemDrop; error?: string }> {
    try {
      const response = await axios.post(
        `${GAME_API_URL}/items/drop/${gameId}`,
        {
          itemId,
          targetPlayer,
        },
        {
          headers: {
            Authorization: `Bearer ${this.userToken}`,
            "X-Arena-Arcade-Game-ID": ARENA_GAME_ID,
            "X-Vorld-App-ID": VORLD_APP_ID,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      return {
        success: false,
        error: err.response?.data?.message || "Failed to drop item",
      };
    }
  }

  // Event handlers (to be set by components)
  onArenaCountdownStarted?: (data: unknown) => void;
  onCountdownUpdate?: (data: unknown) => void;
  onArenaBegins?: (data: unknown) => void;
  onPlayerBoostActivated?: (data: unknown) => void;
  onBoostCycleUpdate?: (data: unknown) => void;
  onBoostCycleComplete?: (data: unknown) => void;
  onPackageDrop?: (data: unknown) => void;
  onImmediateItemDrop?: (data: unknown) => void;
  onEventTriggered?: (data: unknown) => void;
  onPlayerJoined?: (data: unknown) => void;
  onGameCompleted?: (data: unknown) => void;
  onGameStopped?: (data: unknown) => void;

  // Disconnect from WebSocket
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.gameState = null;
  }

  // Get current game state
  getGameState(): GameState | null {
    return this.gameState;
  }
}
