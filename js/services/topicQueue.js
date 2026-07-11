import { generateTopics } from "./gemini.js";

const BATCH_SIZE = 5;
const REFILL_THRESHOLD = 1;

export class TopicQueue {
  constructor(apiKey, params) {
    this.apiKey = apiKey;
    this.params = params; // { mode, purpose, specifyTopic }
    this.queue = [];
    this.refilling = null;
  }

  async init() {
    const topics = await generateTopics(this.apiKey, this.params, BATCH_SIZE);
    this.queue = topics;
    return this._takeNext();
  }

  async next() {
    if (this.queue.length > 0) {
      return this._takeNext();
    }
    if (this.refilling) {
      await this.refilling;
    }
    if (this.queue.length === 0) {
      const topics = await generateTopics(this.apiKey, this.params, BATCH_SIZE);
      this.queue.push(...topics);
    }
    return this._takeNext();
  }

  _takeNext() {
    const topic = this.queue.shift();
    this._maybeRefill();
    return topic;
  }

  _maybeRefill() {
    if (this.queue.length <= REFILL_THRESHOLD && !this.refilling) {
      this.refilling = generateTopics(this.apiKey, this.params, BATCH_SIZE)
        .then((topics) => {
          this.queue.push(...topics);
        })
        .catch(() => {
          // Silent: next() will retry fetching if the queue is still empty when needed.
        })
        .finally(() => {
          this.refilling = null;
        });
    }
  }
}
