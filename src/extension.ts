import * as vscode from 'vscode';
import { CodeLensProvider } from './lens-provider';
import type { FunctionMetrics } from './analyzer';

/**
 * Zero | Code Lens — 代码内联增强
 */
export function activate(context: vscode.ExtensionContext): void {
  // ─── 注册 CodeLensProvider ──────────────────────
  const lensProvider = new CodeLensProvider();

  const selector: vscode.DocumentSelector = [
    { language: 'typescript' },
    { language: 'javascript' },
    { language: 'typescriptreact' },
    { language: 'javascriptreact' },
  ];

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(selector, lensProvider)
  );

  // ─── 命令：显示详情 ──────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'codeLens.showDetail',
      (metrics: FunctionMetrics, filePath: string) => {
        const level = metrics.complexity > 15 ? '🔴' : metrics.complexity > 8 ? '🟡' : '🟢';
        vscode.window.showInformationMessage(
          `${level} ${metrics.name}: CCN ${metrics.complexity} · ${metrics.lineCount} 行 · TODO ${metrics.todoCount}`,
          '打开 Code Pulse'
        ).then((choice) => {
          if (choice === '打开 Code Pulse') {
            // 尝试调用 Code Pulse 仪表盘（如果已安装）
            vscode.commands.executeCommand('codePulse.showDashboard', filePath);
          }
        });
      }
    )
  );

  // ─── 命令：切换 Pro ──────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('codeLens.togglePro', async () => {
      const code = await vscode.window.showInputBox({
        title: 'Code Lens Pro · ¥9.9 永久买断',
        placeHolder: 'XXXX-XXXX-XXXX-YYYY',
        prompt: '解锁自定义颜色、详细类型提示、调用链分析',
      });
      if (code) {
        // 复用 Code Pulse 的同款离线验证算法
        const valid = validateLicenseLocally(code.trim());
        if (valid) {
          await context.globalState.update('codeLens.proActivated', true);
          await vscode.window.showInformationMessage('✅ Pro 激活成功！');
        } else {
          await vscode.window.showErrorMessage('激活码无效');
        }
      }
    })
  );

  // ─── 监听配置变更 ──────────────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('codeLens')) {
        lensProvider.refresh();
      }
    })
  );

  // ─── 监听编辑器切换，刷新 CodeLens ─────────────
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      lensProvider.refresh();
    })
  );

  const proStatus = context.globalState.get<boolean>('codeLens.proActivated', false) ? 'Pro' : 'Free';
  console.log(`[Code Lens] 已激活 (${proStatus}) · Zero Labs`);
}

export function deactivate(): void {}

/**
 * 离线许可证验证（与 Code Pulse 同款算法）。
 */
function validateLicenseLocally(code: string): boolean {
  const now = Date.now();
  const parts = code.split('-');
  if (parts.length !== 4) return false;

  const ts = parseInt(parts[0], 36);
  if (isNaN(ts) || ts < 1700000000000 || ts > now + 86400000) return false;

  const computed = ((ts * 7 + 13) % 99991).toString(16).padStart(5, '0');
  return parts[3] === computed;
}
