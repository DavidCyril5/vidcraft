"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Terminal, ChevronDown, ChevronUp, Trash2, ShieldCheck, Info, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { logger, LogEntry } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function DevLogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs([...newLogs]);
    });
    return unsubscribe;
  }, []);

  const getIcon = (level: string) => {
    switch (level) {
      case 'info': return <Info className="w-3 h-3 text-blue-400" />;
      case 'warn': return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
      case 'error': return <XCircle className="w-3 h-3 text-red-400" />;
      case 'success': return <CheckCircle2 className="w-3 h-3 text-green-400" />;
      default: return <Terminal className="w-3 h-3 text-purple-400" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-blue-400';
      case 'warn': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      default: return 'text-purple-400';
    }
  };

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-[100] transition-all duration-300 ease-in-out border-t border-white/10 bg-black/90 backdrop-blur-xl",
      isOpen ? "h-[300px]" : "h-10"
    )}>
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 h-10 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            System Console
            {logs.length > 0 && (
              <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px]">
                {logs.length}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-white/10" 
            onClick={(e) => {
              e.stopPropagation();
              logger.clear();
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {/* Logs Body */}
      {isOpen && (
        <ScrollArea className="h-[260px] p-4 font-mono text-[11px]">
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-muted-foreground italic flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                No system logs yet. Start an operation to see activity.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border-b border-white/5 pb-1 last:border-0">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getIcon(log.level)}
                      <span className={cn("font-bold uppercase", getLevelColor(log.level))}>
                        {log.level}:
                      </span>
                    </div>
                    <span className="text-white/90 break-words">{log.message}</span>
                  </div>
                  {log.data && (
                    <pre className="mt-1 ml-14 p-2 bg-white/5 rounded text-[10px] text-muted-foreground overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
