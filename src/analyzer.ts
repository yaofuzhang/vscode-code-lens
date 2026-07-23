import { parse } from '@babel/parser';
import traverse, { type NodePath } from '@babel/traverse';

export interface FunctionMetrics {
  readonly name: string;
  readonly line: number;       // 函数起始行
  readonly endLine: number;   // 函数结束行
  readonly complexity: number;
  readonly lineCount: number;
  readonly todoCount: number;
}

export interface FileAnalysis {
  readonly metrics: readonly FunctionMetrics[];
}

const TODO_REGEX = /(?:\/\/|#|\/\*|\*)\s*(TODO|FIXME|HACK|XXX|BUG|OPTIMIZE|REVIEW)\b/gi;

/**
 * 分析文件，提取每个函数的指标。
 * 解析失败返回空结果。
 */
export function analyzeFile(code: string): FileAnalysis {
  const metrics: FunctionMetrics[] = [];

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties'],
      errorRecovery: true,
    });

    const lines = code.split('\n');

    traverse(ast, {
      FunctionDeclaration(path: NodePath) {
        const node = path.node as any;
        const name = node.id?.name || '<fn>';
        const startLine = node.loc?.start.line || 0;
        const endLine = node.loc?.end.line || startLine;
        metrics.push(buildMetrics(name, startLine, endLine, path, lines));
      },
      ArrowFunctionExpression(path: NodePath) {
        const parent = path.parent as any;
        if (parent.type === 'CallExpression' && parent.arguments?.includes(path.node)) return;
        const name = parent.type === 'VariableDeclarator' && parent.id?.name
          ? String(parent.id.name) : '<arrow>';
        const node = path.node as any;
        const startLine = node.loc?.start.line || 0;
        const endLine = node.loc?.end.line || startLine;
        metrics.push(buildMetrics(name, startLine, endLine, path, lines));
      },
      ObjectMethod(path: NodePath) {
        const node = path.node as any;
        const name = node.key?.name || '<method>';
        const startLine = node.loc?.start.line || 0;
        const endLine = node.loc?.end.line || startLine;
        metrics.push(buildMetrics(name, startLine, endLine, path, lines));
      },
      ClassMethod(path: NodePath) {
        const node = path.node as any;
        const name = node.key?.name || '<method>';
        const startLine = node.loc?.start.line || 0;
        const endLine = node.loc?.end.line || startLine;
        metrics.push(buildMetrics(name, startLine, endLine, path, lines));
      },
      FunctionExpression(path: NodePath) {
        if (['ObjectProperty', 'ObjectMethod', 'VariableDeclarator'].includes((path.parent as any).type)) return;
        const node = path.node as any;
        const name = node.id?.name || '<fn>';
        const startLine = node.loc?.start.line || 0;
        const endLine = node.loc?.end.line || startLine;
        metrics.push(buildMetrics(name, startLine, endLine, path, lines));
      },
    });
  } catch {
    return { metrics: [] };
  }

  return { metrics };
}

function buildMetrics(
  name: string,
  startLine: number,
  endLine: number,
  path: NodePath,
  lines: readonly string[]
): FunctionMetrics {
  const complexity = countComplexity(path);
  const lineCount = endLine - startLine + 1;
  const todoCount = countTodosInRange(lines, startLine, endLine);

  return { name, line: startLine, endLine, complexity, lineCount, todoCount };
}

function countComplexity(path: NodePath): number {
  let count = 1;
  path.traverse({
    IfStatement() { count++; },
    ForStatement() { count++; },
    ForInStatement() { count++; },
    ForOfStatement() { count++; },
    WhileStatement() { count++; },
    DoWhileStatement() { count++; },
    SwitchCase(p: NodePath) { if ((p.node as any).test) count++; },
    ConditionalExpression() { count++; },
    LogicalExpression(p: NodePath) {
      const op = (p.node as any).operator;
      if (op === '&&' || op === '||') count++;
    },
    CatchClause() { count++; },
  });
  return count;
}

function countTodosInRange(lines: readonly string[], start: number, end: number): number {
  let count = 0;
  // 每次创建新正则，避免 g flag 状态残留
  const regex = new RegExp(TODO_REGEX.source, 'gi');
  for (let i = start - 1; i < end && i < lines.length; i++) {
    if (regex.test(lines[i])) {
      count++;
    }
    regex.lastIndex = 0;
  }
  return count;
}
