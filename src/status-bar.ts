import type { TokenUsage } from "@aws-sdk/client-bedrock-runtime";
import * as vscode from "vscode";

import type { BedrockChatModelProvider } from "./provider";

/**
 * Format a token count for compact status bar display.
 * Values under 1000 are shown as-is; 1000+ are rounded to whole kilo (e.g., `1k`, `45k`).
 */
export function formatTokenCount(n: number): string {
  if (n < 1000) {
    return String(n);
  }
  return `${Math.round(n / 1000)}k`;
}

/**
 * Register a status bar item that displays token usage from the Bedrock provider.
 * Call this from `extension.ts` and push the returned disposable to `context.subscriptions`.
 */
export function registerTokenUsageStatusBar(provider: BedrockChatModelProvider): vscode.Disposable {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.name = "Bedrock Token Usage";

  const subscription = provider.onDidUpdateTokenUsage((usage) => {
    if (usage.inputTokens == null || usage.outputTokens == null) {
      return;
    }
    item.text = `$(mcp) ↑${formatTokenCount(usage.inputTokens)} ↓${formatTokenCount(usage.outputTokens)}`;
    item.tooltip = buildTooltip(usage);
    item.show();
  });

  return new vscode.Disposable(() => {
    subscription.dispose();
    item.dispose();
  });
}

/**
 * Build a detailed tooltip from token usage data.
 */
function buildTooltip(usage: TokenUsage): vscode.MarkdownString {
  const rows: [string, string][] = [
    ["Input", `${usage.inputTokens!.toLocaleString()}`],
    ["Output", `${usage.outputTokens!.toLocaleString()}`],
  ];

  if (usage.totalTokens !== undefined) {
    rows.push(["Total", `${usage.totalTokens.toLocaleString()}`]);
  }
  if (usage.cacheReadInputTokens !== undefined && usage.cacheReadInputTokens > 0) {
    rows.push(["Cache read", `${usage.cacheReadInputTokens.toLocaleString()}`]);
  }
  if (usage.cacheWriteInputTokens !== undefined && usage.cacheWriteInputTokens > 0) {
    rows.push(["Cache write", `${usage.cacheWriteInputTokens.toLocaleString()}`]);
  }

  const lines = [
    "**Bedrock Token Usage**",
    "",
    "|        |        |",
    "|--------|-------:|",
    ...rows.map(([label, value]) => `| ${label} | ${value} |`),
  ];

  const md = new vscode.MarkdownString(lines.join("\n"));
  md.isTrusted = true;
  return md;
}
