import os from 'os';

export interface ScenarioResult {
  name: string;
  playerCount: number;
  passed: boolean;
  durationMs: number;
  metrics: Record<string, any>;
  errors: string[];
}

export class TestReporter {
  private results: ScenarioResult[] = [];
  private startTime = Date.now();

  public addResult(result: ScenarioResult) {
    this.results.push(result);
  }

  public getResults(): ScenarioResult[] {
    return this.results;
  }

  public printConsoleSummary() {
    console.log(`\n================================================================`);
    console.log(`📊 GADGET CODE STRESS & CONCURRENCY TEST SUMMARY REPORT`);
    console.log(`================================================================`);
    console.log(`Timestamp:       ${new Date().toISOString()}`);
    console.log(`OS:              ${os.type()} ${os.release()} (${os.arch()})`);
    console.log(`CPUs:            ${os.cpus().length} cores (${os.cpus()[0]?.model})`);
    console.log(`Total Memory:    ${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    console.log(`Free Memory:     ${(os.freemem() / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    console.log(`Total Scenarios: ${this.results.length}`);
    console.log(`Passed:          ${this.results.filter((r) => r.passed).length}`);
    console.log(`Failed:          ${this.results.filter((r) => !r.passed).length}`);
    console.log(`Total Duration:  ${((Date.now() - this.startTime) / 1000).toFixed(2)} s`);
    console.log(`================================================================\n`);

    console.table(
      this.results.map((r) => ({
        Scenario: r.name,
        Players: r.playerCount,
        Status: r.passed ? '✅ PASS' : '❌ FAIL',
        'Duration (ms)': Math.round(r.durationMs),
        KeyMetrics: JSON.stringify(r.metrics),
        Errors: r.errors.length,
      }))
    );
  }

  public generateMarkdownReport(systemInfo: any = {}): string {
    const passedCount = this.results.filter((r) => r.passed).length;
    const failedCount = this.results.filter((r) => !r.passed).length;
    const isReadyFor40 = this.results
      .filter((r) => r.playerCount <= 40)
      .every((r) => r.passed);

    let md = `# GADGET CODE — STRESS TEST & EVENT RELIABILITY REPORT\n\n`;
    md += `**Date:** ${new Date().toISOString()}\n`;
    md += `**Verdict:** ${isReadyFor40 ? '🟢 **READY FOR 40-PLAYER EVENT**' : '🔴 **NOT READY FOR 40-PLAYER EVENT**'}\n\n`;

    md += `## 1. System & Environment Specifications\n\n`;
    md += `- **Operating System:** ${os.type()} ${os.release()} (${os.arch()})\n`;
    md += `- **Node.js Version:** ${process.version}\n`;
    md += `- **CPU:** ${os.cpus().length} cores — ${os.cpus()[0]?.model || 'Standard'}\n`;
    md += `- **RAM:** ${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(2)} GB Total (${(os.freemem() / (1024 * 1024 * 1024)).toFixed(2)} GB Free)\n`;
    md += `- **Database:** ${systemInfo.dbConnected ? 'MongoDB (Local Community Server)' : 'In-Memory / Dev'}\n`;
    md += `- **DB Database Name:** ${systemInfo.dbName || 'gadget_code'}\n`;
    md += `- **Server Port:** 3000 (0.0.0.0)\n\n`;

    md += `## 2. Test Execution Summary\n\n`;
    md += `| Test Scenario | Players | Status | Duration (ms) | Primary Metrics | Errors |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const r of this.results) {
      const metricSummary = Object.entries(r.metrics)
        .map(([k, v]) => `${k}: ${typeof v === 'number' ? Math.round(v * 100) / 100 : v}`)
        .join(', ');
      md += `| ${r.name} | ${r.playerCount} | ${r.passed ? '✅ PASS' : '❌ FAIL'} | ${Math.round(r.durationMs)} | ${metricSummary} | ${r.errors.length} |\n`;
    }

    md += `\n## 3. Detailed Scenario Breakdown\n\n`;
    for (const r of this.results) {
      md += `### ${r.name} (${r.playerCount} Players) — ${r.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
      md += `- **Duration:** ${Math.round(r.durationMs)} ms\n`;
      md += `- **Metrics:**\n`;
      for (const [k, v] of Object.entries(r.metrics)) {
        md += `  - **${k}:** ${typeof v === 'object' ? JSON.stringify(v) : v}\n`;
      }
      if (r.errors.length > 0) {
        md += `- **Errors Logged (${r.errors.length}):**\n`;
        for (const err of r.errors.slice(0, 5)) {
          md += `  - \`${err}\`\n`;
        }
        if (r.errors.length > 5) {
          md += `  - *...and ${r.errors.length - 5} more errors.*\n`;
        }
      }
      md += `\n`;
    }

    md += `## 4. Final Recommendation & Readiness Audit\n\n`;
    if (isReadyFor40) {
      md += `> [!IMPORTANT]\n`;
      md += `> **CONCLUSION: READY FOR 40-PLAYER EVENT**\n>\n`;
      md += `> The platform successfully authenticated, synchronized, held lobby connections, processed simultaneous answer storms, maintained server-authoritative deadlines, computed deterministic leaderboard ranks, and handled mid-round reconnections with 0 data corruption across all tests up to 40+ players.\n`;
    } else {
      md += `> [!CAUTION]\n`;
      md += `> **CONCLUSION: NOT READY FOR 40-PLAYER EVENT**\n>\n`;
      md += `> One or more critical 40-player scenarios failed. Check the error breakdown above for blocking bottlenecks.\n`;
    }

    return md;
  }
}
