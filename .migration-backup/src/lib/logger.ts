"use client";

/**
 * @fileOverview A simple client-side logging utility for development debugging.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
}

type LogListener = (logs: LogEntry[]) => void;

class Logger {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();

  log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      level,
      message,
      data,
    };
    this.logs = [entry, ...this.logs].slice(0, 50);
    this.listeners.forEach(l => l(this.logs));
    
    // Also log to browser console for traditional debugging
    const styles = {
      info: 'color: #8AB2F0',
      warn: 'color: #FFD699',
      error: 'color: #FF9999; font-weight: bold',
      success: 'color: #99FF99',
      debug: 'color: #C999FF'
    };
    console.log(`%c[${level.toUpperCase()}] %c${message}`, styles[level], 'color: inherit', data || '');
  }

  info(msg: string, data?: any) { this.log('info', msg, data); }
  warn(msg: string, data?: any) { this.log('warn', msg, data); }
  error(msg: string, data?: any) { this.log('error', msg, data); }
  success(msg: string, data?: any) { this.log('success', msg, data); }
  debug(msg: string, data?: any) { this.log('debug', msg, data); }

  subscribe(listener: LogListener) {
    this.listeners.add(listener);
    listener(this.logs);
    return () => this.listeners.delete(listener);
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(l => l(this.logs));
  }
}

export const logger = new Logger();
