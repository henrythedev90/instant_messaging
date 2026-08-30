"use client";
import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";

export function useTypingEmitter(
  socket: Socket | null,
  roomId: string,
  threadKey: string
) {
  const typingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emit = (isTyping: boolean) => {
    if (!socket || !roomId) {
      return;
    }
    socket.emit("typing", { roomId, isTyping, threadKey });
  };

  const start = () => {
    typingRef.current = true;
    emit(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      typingRef.current = false;
      emit(false);
    }, 1600);
  };

  const stop = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (typingRef.current) {
      typingRef.current = false;
      emit(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (typingRef.current && socket && roomId) {
        socket.emit("typing", { roomId, isTyping: false, threadKey });
      }
      typingRef.current = false;
    };
  }, [socket, roomId, threadKey]);

  return { start, stop };
}
