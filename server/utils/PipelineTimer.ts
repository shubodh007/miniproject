export class PipelineTimer {
  private timings: Record<string, number> = {}
  private starts: Record<string, number> = {}

  start(label: string) {
    this.starts[label] = Date.now()
  }

  end(label: string): number {
    const startVal = this.starts[label];
    const rawDuration = startVal !== undefined ? (Date.now() - startVal) : 0;
    const duration = rawDuration > 0 ? rawDuration : 1;
    this.timings[label] = duration;
    return duration;
  }

  getAll(): Record<string, number> {
    return this.timings;
  }

  getTotal(): number {
    return Object.values(this.timings)
      .reduce((a, b) => a + b, 0);
  }

  getSlowest(): string {
    const entries = Object.entries(this.timings);
    if (entries.length === 0) return 'none';
    return entries.sort(([,a], [,b]) => b - a)[0][0];
  }
}
