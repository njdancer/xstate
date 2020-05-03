interface SchedulerOptions {
  deferEvents: boolean;
}

const defaultOptions: SchedulerOptions = {
  deferEvents: false
};

export class Scheduler {
  private processingEvent: boolean = false;
  private queue: Array<() => Promise<void>> = [];
  private initialized = false;

  // deferred feature
  private options: SchedulerOptions;

  constructor(options?: Partial<SchedulerOptions>) {
    this.options = { ...defaultOptions, ...options };
  }

  public async initialize(callback?: () => Promise<void>): Promise<void> {
    this.initialized = true;

    if (callback) {
      if (!this.options.deferEvents) {
        await this.schedule(callback);
        return;
      }

      await this.process(callback);
    }

    await this.flushEvents();
  }

  public async schedule(task: () => Promise<void>): Promise<void> {
    if (!this.initialized || this.processingEvent) {
      this.queue.push(task);
      return;
    }

    if (this.queue.length !== 0) {
      throw new Error(
        'Event queue should be empty when it is not processing events'
      );
    }

    await this.process(task);
    await this.flushEvents();
  }

  public clear(): void {
    this.queue = [];
  }

  private async flushEvents() {
    let nextCallback: (() => Promise<void>) | undefined = this.queue.shift();
    while (nextCallback) {
      await this.process(nextCallback);
      nextCallback = this.queue.shift();
    }
  }

  private async process(callback: () => Promise<void>) {
    this.processingEvent = true;
    try {
      await callback();
    } catch (e) {
      // there is no use to keep the future events
      // as the situation is not anymore the same
      this.clear();
      throw e;
    } finally {
      this.processingEvent = false;
    }
  }
}
