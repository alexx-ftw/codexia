export interface CodexEvent {
  id: string;
  msg: EventMsg;
}

export type EventMsg = 
  | { type: 'session_configured'; session_id: string; model: string; history_log_id?: number; history_entry_count?: number }
  | { type: 'task_started' }
  | { type: 'task_complete'; response_id?: string; last_agent_message?: string }
  | { type: 'agent_message'; message?: string; last_agent_message?: string }
  | { type: 'agent_message_delta'; delta: string }
  | { type: 'exec_approval_request'; call_id: string; command: string[]; cwd: string }
  | { type: 'patch_approval_request'; patch: string; files: string[] }
  | { type: 'apply_patch_approval_request'; call_id: string; changes: any }
  | { type: 'error'; message: string }
  | { type: 'turn_complete'; response_id?: string }
  | { type: 'exec_command_begin'; call_id: string; command: string[]; cwd: string }
  | { type: 'exec_command_output_delta'; call_id: string; stream: string; chunk: number[] }
  | { type: 'exec_command_end'; call_id: string; stdout: string; stderr: string; exit_code: number }
  | { type: 'shutdown_complete' }
  | { type: 'background_event'; message: string }
  | { type: 'turn_diff'; unified_diff: string };

export interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ApprovalRequest {
  id: string;
  type: 'exec' | 'patch' | 'apply_patch';
  command?: string;
  cwd?: string;
  patch?: string;
  files?: string[];
  call_id?: string;
  changes?: any;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  isActive: boolean;
  pendingApproval?: ApprovalRequest;
  config: CodexConfig;
  isLoading?: boolean;
}

export interface CodexConfig {
  workingDirectory: string;
  model: string;
  provider: string; // Support any provider from config.toml
  useOss: boolean;
  customArgs?: string[];
  approvalPolicy: 'untrusted' | 'on-failure' | 'on-request' | 'never';
  sandboxMode: 'read-only' | 'workspace-write' | 'danger-full-access';
  codexPath?: string;
}

export const DEFAULT_CONFIG: CodexConfig = {
  workingDirectory: '',
  model: 'llama3.2',
  provider: 'oss',
  useOss: true,
  approvalPolicy: 'on-request',
  sandboxMode: 'workspace-write',
};

export type McpServerConfig = 
  | {
      type: 'stdio';
      command: string;
      args: string[];
      env?: Record<string, string>;
    }
  | {
      type: 'http';
      url: string;
    };