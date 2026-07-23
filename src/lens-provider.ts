import * as vscode from 'vscode';
import { analyzeFile, type FunctionMetrics } from './analyzer';
import { getLensConfig } from './config';

/**
 * CodeLensProvider：在 JS/TS 函数上方显示内联指标。
 */
export class CodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  /** 主动通知 VS Code 刷新 CodeLens */
  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const config = getLensConfig();
    if (!config.showComplexity && !config.showLineCount && !config.showTodoCount) {
      return [];
    }

    const analysis = analyzeFile(document.getText());
    return analysis.metrics.map((m) => this.buildLens(m, document, config));
  }

  resolveCodeLens(
    lens: vscode.CodeLens,
    _token: vscode.CancellationToken
  ): vscode.CodeLens {
    return lens;
  }

  private buildLens(
    m: FunctionMetrics,
    document: vscode.TextDocument,
    config: ReturnType<typeof getLensConfig>
  ): vscode.CodeLens {
    const range = new vscode.Range(
      new vscode.Position(m.line - 1, 0),
      new vscode.Position(m.line - 1, 0)
    );

    const parts: string[] = [];
    if (config.showComplexity) {
      const label = this.colorize(`CCN ${m.complexity}`, m.complexity, config);
      parts.push(label);
    }
    if (config.showLineCount) {
      parts.push(`${m.lineCount} 行`);
    }
    if (config.showTodoCount && m.todoCount > 0) {
      parts.push(`📝 ${m.todoCount}`);
    }

    const title = `${m.name}: ${parts.join(' · ')}`;

    const lens = new vscode.CodeLens(range, {
      title,
      command: 'codeLens.showDetail',
      tooltip: [
        `函数: ${m.name}`,
        `圈复杂度: ${m.complexity}`,
        `行数: ${m.lineCount} (L${m.line}-L${m.endLine})`,
        `TODO 数: ${m.todoCount}`,
      ].join('\n'),
      arguments: [m, document.uri.fsPath],
    });

    return lens;
  }

  private colorize(
    text: string,
    complexity: number,
    config: ReturnType<typeof getLensConfig>
  ): string {
    if (!config.colorCode) return text;
    if (complexity > config.complexityThreshold) return `🔴 ${text}`;
    if (complexity > config.complexityThreshold * 0.6) return `🟡 ${text}`;
    return `🟢 ${text}`;
  }
}
