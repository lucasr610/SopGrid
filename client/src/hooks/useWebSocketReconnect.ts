import { useEffect, useRef, useCallback, useState } from 'react';

interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnecting?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastError: string | null;
}

export function useWebSocketReconnect(config: WebSocketConfig) {
  const {
    url,
    protocols,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    onMessage,
    onConnect,
    onDisconnect,
    onReconnecting,
    onReconnectFailed
  } = config;

  const [state, setState] = useState<WebSocketState>({
    socket: null,
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastError: null
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const shouldReconnectRef = useRef(true);
  const urlRef = useRef(url);

  // Update URL ref when it changes
  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  const connect = useCallback(() => {
    try {
      console.log(`🔌 Attempting WebSocket connection to ${urlRef.current}`);
      
      const ws = new WebSocket(urlRef.current, protocols);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setState(prev => ({
          ...prev,
          socket: ws,
          isConnected: true,
          isReconnecting: false,
          reconnectAttempts: 0,
          lastError: null
        }));
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', event.data);
          onMessage?.(event.data);
        }
      };

      ws.onclose = (event) => {
        console.log(`🔌 WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);
        
        setState(prev => ({
          ...prev,
          socket: null,
          isConnected: false,
          lastError: event.reason || `Connection closed (${event.code})`
        }));

        onDisconnect?.();

        // Attempt to reconnect if it wasn't a manual close
        if (shouldReconnectRef.current && event.code !== 1000) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setState(prev => ({
          ...prev,
          lastError: 'WebSocket connection error'
        }));
      };

      setState(prev => ({ ...prev, socket: ws }));

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }));
      scheduleReconnect();
    }
  }, [protocols, onMessage, onConnect, onDisconnect]);

  const scheduleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current) return;

    setState(prev => {
      if (prev.reconnectAttempts >= maxReconnectAttempts) {
        console.log(`❌ Max reconnection attempts (${maxReconnectAttempts}) reached`);
        onReconnectFailed?.();
        return {
          ...prev,
          isReconnecting: false
        };
      }

      const nextAttempt = prev.reconnectAttempts + 1;
      console.log(`🔄 Scheduling reconnection attempt ${nextAttempt}/${maxReconnectAttempts} in ${reconnectInterval}ms`);
      
      onReconnecting?.(nextAttempt);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectInterval);

      return {
        ...prev,
        isReconnecting: true,
        reconnectAttempts: nextAttempt
      };
    });
  }, [maxReconnectAttempts, reconnectInterval, onReconnectFailed, onReconnecting, connect]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      state.socket.close(1000, 'Manual disconnect');
    }

    setState(prev => ({
      ...prev,
      socket: null,
      isConnected: false,
      isReconnecting: false,
      reconnectAttempts: 0
    }));
  }, [state.socket]);

  const reconnect = useCallback(() => {
    shouldReconnectRef.current = true;
    setState(prev => ({
      ...prev,
      reconnectAttempts: 0,
      lastError: null
    }));
    connect();
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      state.socket.send(messageStr);
      return true;
    } else {
      console.warn('Cannot send message: WebSocket is not connected');
      return false;
    }
  }, [state.socket]);

  // Initial connection
  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (state.socket) {
        state.socket.close();
      }
    };
  }, [connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    ...state,
    connect: reconnect,
    disconnect,
    sendMessage
  };
}