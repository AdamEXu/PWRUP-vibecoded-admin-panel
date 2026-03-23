const { EventEmitter } = require("events");

// Force the Node ws implementation in Electron main.
// The built-in undici WebSocket can recurse through onerror -> close() with
// autobahn-client's current error handler and crash the process.
if (typeof global.WebSocket !== "function" || global.WebSocket.name !== "WebSocket") {
  global.WebSocket = require("ws");
} else {
  try {
    const NodeWebSocket = require("ws");
    global.WebSocket = NodeWebSocket;
  } catch {
    // Fall back to the existing global if ws resolution fails unexpectedly.
  }
}

const { Address, AutobahnClient } = require("autobahn-client");

if (!AutobahnClient.__pwrupPatchedForElectronMain) {
  const originalConnect = AutobahnClient.prototype.connect;

  AutobahnClient.prototype.connect = function patchedConnect(...args) {
    originalConnect.apply(this, args);

    if (this.ws) {
      this.ws.onerror = () => {
        this.connected = false;
      };
    }
  };

  Object.defineProperty(AutobahnClient, "__pwrupPatchedForElectronMain", {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });
}

class AutobahnBroker extends EventEmitter {
  constructor() {
    super();
    this.snapshot = null;
    this.client = null;
    this.clientKey = "";
    this.isConnected = false;
    this.statusPollHandle = null;
    this.retryDelay = 2000;
    this.retryHandle = null;
    this.nextSubscriptionId = 1;
    this.subscriptions = new Map();
    this.topicEntries = new Map();
  }

  initialize(snapshot) {
    this.snapshot = snapshot;
    this.#ensureClient();
  }

  updateSettingsSnapshot(snapshot) {
    this.snapshot = snapshot;
    this.#rebindClient();
  }

  getStatus() {
    return this.isConnected;
  }

  subscribe(sender, params) {
    const subscriptionId = this.nextSubscriptionId++;
    let entry = this.topicEntries.get(params.topic);

    if (!entry) {
      entry = {
        topic: params.topic,
        subscribers: new Map(),
        latestPayload: null,
        flushScheduled: false,
        callback: null,
      };
      this.topicEntries.set(params.topic, entry);
    }

    entry.subscribers.set(subscriptionId, sender);
    this.subscriptions.set(subscriptionId, {
      senderId: sender.id,
      topic: params.topic,
    });

    this.#bindTopicEntry(entry);

    return {
      subscriptionId,
      initial: {
        subscriptionId,
        topic: params.topic,
        payload: entry.latestPayload ? Uint8Array.from(entry.latestPayload) : null,
        isConnected: this.isConnected,
      },
    };
  }

  unsubscribe(subscriptionId) {
    const meta = this.subscriptions.get(subscriptionId);
    if (!meta) return;

    this.subscriptions.delete(subscriptionId);
    const entry = this.topicEntries.get(meta.topic);
    if (!entry) return;

    entry.subscribers.delete(subscriptionId);

    if (entry.subscribers.size === 0) {
      if (this.client) {
        try {
          this.client.unsubscribe(entry.topic);
        } catch {
          // Ignore unsubscribe errors on teardown.
        }
      }
      this.topicEntries.delete(meta.topic);
    }
  }

  cleanupRenderer(senderId) {
    const subscriptionIds = [];
    this.subscriptions.forEach((meta, subscriptionId) => {
      if (meta.senderId === senderId) {
        subscriptionIds.push(subscriptionId);
      }
    });

    subscriptionIds.forEach((subscriptionId) => this.unsubscribe(subscriptionId));
  }

  publish(params) {
    this.#ensureClient();

    if (!this.client || !this.isConnected) {
      throw new Error("Autobahn is not connected.");
    }

    const payload = params.payload instanceof Uint8Array
      ? params.payload
      : new Uint8Array(params.payload);
    this.client.publish(params.topic, payload);
  }

  reconnect() {
    this.retryDelay = 2000;
    if (this.retryHandle) {
      clearTimeout(this.retryHandle);
      this.retryHandle = null;
    }
    this.#attemptReconnect();
  }

  stop() {
    this.topicEntries.forEach((entry) => {
      if (!this.client) return;
      try {
        this.client.unsubscribe(entry.topic);
      } catch {
        // Ignore teardown errors.
      }
    });
    this.topicEntries.clear();
    this.subscriptions.clear();

    if (this.retryHandle) {
      clearTimeout(this.retryHandle);
      this.retryHandle = null;
    }

    if (this.statusPollHandle) {
      clearInterval(this.statusPollHandle);
      this.statusPollHandle = null;
    }

    this.client = null;
    this.clientKey = "";
    this.#setConnectionState(false);
  }

  #attemptReconnect() {
    if (this.statusPollHandle) {
      clearInterval(this.statusPollHandle);
      this.statusPollHandle = null;
    }
    this.client = null;
    this.clientKey = "";
    this.#ensureClient();
    this.topicEntries.forEach((entry) => this.#bindTopicEntry(entry));
  }

  #ensureClient() {
    const host = this.snapshot?.settings?.host?.trim() ?? "";
    const port = this.snapshot?.settings?.port ?? 8080;
    const nextKey = host ? `${host}:${port}` : "";

    if (!host) {
      this.#setConnectionState(false);
      return;
    }

    if (this.client && this.clientKey === nextKey) {
      return;
    }

    if (this.statusPollHandle) {
      clearInterval(this.statusPollHandle);
      this.statusPollHandle = null;
    }

    this.client = new AutobahnClient(new Address(host, port));
    this.clientKey = nextKey;

    try {
      this.client.begin();
    } catch {
      this.#setConnectionState(false);
    }

    this.retryDelay = 2000;
    if (this.retryHandle) {
      clearTimeout(this.retryHandle);
      this.retryHandle = null;
    }

    this.statusPollHandle = setInterval(() => {
      let connected = false;
      try {
        connected = this.client ? this.client.isConnected() : false;
      } catch {
        connected = false;
      }
      this.#setConnectionState(connected);

      if (connected) {
        this.retryDelay = 2000;
        if (this.retryHandle) {
          clearTimeout(this.retryHandle);
          this.retryHandle = null;
        }
      } else if (!this.retryHandle) {
        this.retryHandle = setTimeout(() => {
          this.retryHandle = null;
          this.#attemptReconnect();
        }, this.retryDelay);
        this.retryDelay = Math.min(this.retryDelay * 2, 30_000);
      }
    }, 250);
    this.statusPollHandle.unref?.();
  }

  #rebindClient() {
    const existingTopics = [...this.topicEntries.values()].map((entry) => entry.topic);

    if (this.client) {
      existingTopics.forEach((topic) => {
        try {
          this.client.unsubscribe(topic);
        } catch {
          // Ignore teardown errors.
        }
      });
    }

    this.topicEntries.forEach((entry) => {
      entry.callback = null;
      entry.latestPayload = null;
      entry.flushScheduled = false;
    });

    if (this.statusPollHandle) {
      clearInterval(this.statusPollHandle);
      this.statusPollHandle = null;
    }

    this.client = null;
    this.clientKey = "";
    this.#ensureClient();

    this.topicEntries.forEach((entry) => this.#bindTopicEntry(entry));

    if (!this.client) {
      this.#setConnectionState(false);
    }
  }

  #bindTopicEntry(entry) {
    this.#ensureClient();

    if (!this.client || entry.callback) {
      return;
    }

    const callback = async (payload) => {
      entry.latestPayload = Buffer.from(payload);
      if (entry.flushScheduled) {
        return;
      }

      entry.flushScheduled = true;
      setImmediate(() => {
        entry.flushScheduled = false;
        const latestPayload = entry.latestPayload;
        entry.latestPayload = null;

        if (!latestPayload) {
          return;
        }

        entry.subscribers.forEach((sender, subscriptionId) => {
          if (!sender || sender.isDestroyed()) {
            this.unsubscribe(subscriptionId);
            return;
          }

          sender.send("blitz:autobahn:update", {
            subscriptionId,
            topic: entry.topic,
            payload: Uint8Array.from(latestPayload),
            isConnected: this.isConnected,
          });
        });
      });
    };

    entry.callback = callback;
    this.client.subscribe(entry.topic, callback);
  }

  #setConnectionState(connected) {
    if (this.isConnected === connected) {
      return;
    }

    this.isConnected = connected;
    this.emit("status", connected);
  }
}

module.exports = {
  AutobahnBroker,
};
