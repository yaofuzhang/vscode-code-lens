import * as vscode from 'vscode';

export interface LensConfig {
  readonly showComplexity: boolean;
  readonly showLineCount: boolean;
  readonly showTodoCount: boolean;
  readonly colorCode: boolean;
  readonly complexityThreshold: number;
}

export function getLensConfig(): LensConfig {
  const cfg = vscode.workspace.getConfiguration('codeLens');
  return {
    showComplexity: cfg.get<boolean>('showComplexity', true),
    showLineCount: cfg.get<boolean>('showLineCount', true),
    showTodoCount: cfg.get<boolean>('showTodoCount', true),
    colorCode: cfg.get<boolean>('colorCode', true),
    complexityThreshold: cfg.get<number>('complexityThreshold', 15),
  };
}
