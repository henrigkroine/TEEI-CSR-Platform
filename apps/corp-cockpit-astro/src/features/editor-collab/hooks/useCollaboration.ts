/**
 * useCollaboration Hook
 *
 * React hook for managing real-time collaboration state and connections.
 * Handles WebSocket/SSE connections, operation synchronization, and offline queue.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  DocumentId,
  DocumentSnapshot,
  Operation,
  UserPresence,
  Comment,
  Suggestion,
  WSMessage,
  WSMessageType,
  WelcomePayload,
  CollabRole
} from '@teei/shared-types';
import { io, Socket } from 'socket.io-client';

interface CollabState {
  connected: boolean;
  snapshot: DocumentSnapshot | null;
  operations: Operation[];
  users: UserPresence[];
  comments: Comment[];
  suggestions: Suggestion[];
  role: CollabRole | null;
  sessionId: string | null;
  syncing: boolean;
  error: string | null;
}

interface UseCollaborationOptions {
  docId: DocumentId;
  token: string;
  transport?: 'websocket' | 'sse' | 'auto';
  onOperation?: (op: Operation) => void;
  onPresence?: (presence: UserPresence) => void;
  onComment?: (comment: Comment) => void;
  onSuggestion?: (suggestion: Suggestion) => void;
}

export function useCollaboration(options: UseCollaborationOptions) {
  const { docId, token, transport = 'auto', onOperation, onPresence, onComment, onSuggestion } = options;

  const [state, setState] = useState<CollabState>({
    connected: false,
    snapshot: null,
    operations: [],
    users: [],
    comments: [],
    suggestions: [],
    role: null,
    sessionId: null,
    syncing: false,
    error: null
  });

  const socketRef = useRef<Socket | null>(null);
  const offlineQueueRef = useRef<Operation[]>([]);
  const reconnectAttemptsRef = useRef(0);

  /**
   * Connect to collaboration server
   */
  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, syncing: true, error: null }));

      // Try WebSocket first
      if (transport === 'websocket' || transport === 'auto') {
        const socket = io('/collab/ws', {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        socketRef.current = socket;

        // Connection events
        socket.on('connect', () => {
          console.log('[Collab] Connected via WebSocket');
          setState(prev => ({ ...prev, connected: true, syncing: false, error: null }));
          reconnectAttemptsRef.current = 0;

          // Join document
          socket.emit('join', { docId, token });
        });

        socket.on('disconnect', () => {
          console.log('[Collab] Disconnected');
          setState(prev => ({ ...prev, connected: false }));
        });

        socket.on('connect_error', (err) => {
          console.error('[Collab] Connection error:', err);

          // Fallback to SSE after 3 failed attempts
          if (transport === 'auto' && reconnectAttemptsRef.current >= 3) {
            console.log('[Collab] Falling back to SSE');
            connectSSE();
          }

          reconnectAttemptsRef.current++;
          setState(prev => ({ ...prev, error: err.message }));
        });

        // Message events
        socket.on('message', (msg: WSMessage) => {
          handleMessage(msg);
        });

        // Ping/pong
        const pingInterval = setInterval(() => {
          if (socket.connected) {
            socket.emit('ping');
          }
        }, 30000);

        return () => {
          clearInterval(pingInterval);
        };
      }

      // SSE fallback
      if (transport === 'sse') {
        await connectSSE();
      }
    } catch (err) {
      console.error('[Collab] Connect failed:', err);
      setState(prev => ({ ...prev, syncing: false, error: (err as Error).message }));
    }
  }, [docId, token, transport]);

  /**
   * Connect via SSE
   */
  const connectSSE = async () => {
    try {
      const url = `/collab/sse/connect?docId=${encodeURIComponent(docId)}&token=${encodeURIComponent(token)}`;
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log('[Collab] Connected via SSE');
        setState(prev => ({ ...prev, connected: true, syncing: false, error: null }));
      };

      eventSource.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          handleMessage(msg);
        } catch (err) {
          console.error('[Collab] SSE parse error:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('[Collab] SSE error:', err);
        setState(prev => ({ ...prev, connected: false, error: 'SSE connection lost' }));
        eventSource.close();
      };

      // Store for cleanup
      (socketRef.current as any) = eventSource;
    } catch (err) {
      console.error('[Collab] SSE connect failed:', err);
      setState(prev => ({ ...prev, error: (err as Error).message }));
    }
  };

  /**
   * Handle incoming message
   */
  const handleMessage = (msg: WSMessage) => {
    switch (msg.type) {
      case 'welcome': {
        const payload = msg.payload as WelcomePayload;
        setState(prev => ({
          ...prev,
          snapshot: payload.snapshot,
          operations: payload.operations,
          users: payload.users,
          role: payload.role,
          sessionId: payload.sessionId
        }));

        // Replay offline queue
        replayOfflineQueue();
        break;
      }

      case 'operation_broadcast': {
        const { operations } = msg.payload;
        setState(prev => ({
          ...prev,
          operations: [...prev.operations, ...operations]
        }));

        operations.forEach((op: Operation) => {
          if (onOperation) onOperation(op);
        });
        break;
      }

      case 'presence_broadcast': {
        const presence = msg.payload as UserPresence;
        setState(prev => ({
          ...prev,
          users: updatePresence(prev.users, presence)
        }));

        if (onPresence) onPresence(presence);
        break;
      }

      case 'comment_broadcast': {
        const comment = msg.payload as Comment;
        setState(prev => ({
          ...prev,
          comments: [...prev.comments, comment]
        }));

        if (onComment) onComment(comment);
        break;
      }

      case 'suggestion_broadcast': {
        const suggestion = msg.payload as Suggestion;
        setState(prev => ({
          ...prev,
          suggestions: [...prev.suggestions, suggestion]
        }));

        if (onSuggestion) onSuggestion(suggestion);
        break;
      }

      case 'pong': {
        // Heartbeat response
        break;
      }

      case 'error': {
        console.error('[Collab] Server error:', msg.payload);
        setState(prev => ({ ...prev, error: msg.payload.message }));
        break;
      }

      default:
        console.warn('[Collab] Unknown message type:', msg.type);
    }
  };

  /**
   * Update presence list
   */
  const updatePresence = (users: UserPresence[], newPresence: UserPresence): UserPresence[] => {
    const existing = users.find(u => u.userId === newPresence.userId);

    if (newPresence.lastSeen === 0) {
      // User left
      return users.filter(u => u.userId !== newPresence.userId);
    }

    if (existing) {
      // Update existing
      return users.map(u => u.userId === newPresence.userId ? newPresence : u);
    }

    // Add new
    return [...users, newPresence];
  };

  /**
   * Send operation
   */
  const sendOperation = useCallback((operation: Operation) => {
    if (!state.connected) {
      // Add to offline queue
      offlineQueueRef.current.push(operation);
      console.log('[Collab] Operation queued (offline)');
      return;
    }

    const socket = socketRef.current;

    if (socket && (socket as any).emit) {
      (socket as Socket).emit('operation', { operation });
    } else {
      // SSE: use REST API for sending
      sendOperationREST(operation);
    }
  }, [state.connected]);

  /**
   * Send operation via REST API (for SSE clients)
   */
  const sendOperationREST = async (operation: Operation) => {
    try {
      const response = await fetch('/collab/operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ docId, operation })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('[Collab] Send operation failed:', err);
      offlineQueueRef.current.push(operation);
    }
  };

  /**
   * Replay offline queue
   */
  const replayOfflineQueue = async () => {
    const queue = offlineQueueRef.current.splice(0);

    if (queue.length === 0) return;

    console.log(`[Collab] Replaying ${queue.length} offline operations`);

    for (const op of queue) {
      sendOperation(op);
      await new Promise(resolve => setTimeout(resolve, 50)); // Throttle
    }
  };

  /**
   * Update presence
   */
  const updatePresence = useCallback((presence: Partial<UserPresence>) => {
    const socket = socketRef.current;

    if (socket && (socket as any).emit) {
      (socket as Socket).emit('presence', { presence });
    }
  }, []);

  /**
   * Add comment
   */
  const addComment = useCallback(async (comment: Comment) => {
    const socket = socketRef.current;

    if (socket && (socket as any).emit) {
      (socket as Socket).emit('comment', { comment });
    } else {
      // REST API
      await fetch('/collab/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(comment)
      });
    }
  }, [token]);

  /**
   * Add suggestion
   */
  const addSuggestion = useCallback(async (suggestion: Suggestion) => {
    const socket = socketRef.current;

    if (socket && (socket as any).emit) {
      (socket as Socket).emit('suggestion', { suggestion });
    } else {
      // REST API
      await fetch('/collab/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(suggestion)
      });
    }
  }, [token]);

  /**
   * Disconnect
   */
  const disconnect = useCallback(() => {
    const socket = socketRef.current;

    if (socket) {
      if ((socket as any).emit) {
        (socket as Socket).emit('leave');
        (socket as Socket).disconnect();
      } else {
        // SSE: close EventSource
        (socket as EventSource).close();
      }

      socketRef.current = null;
    }

    setState(prev => ({ ...prev, connected: false }));
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    sendOperation,
    updatePresence,
    addComment,
    addSuggestion,
    offlineQueueLength: offlineQueueRef.current.length
  };
}
