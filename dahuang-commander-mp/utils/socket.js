class DahuangSocket {
  constructor(url, path = "/api/socket") {
    // Convert http/https URL to ws/wss
    let wsUrl = url.replace(/^http/, "ws");
    this.wsUrl = `${wsUrl}${path}/?EIO=4&transport=websocket`;
    this.callbacks = {};
    this.socketTask = null;
    this.isConnected = false;
    this.outboundQueue = [];
  }

  connect() {
    console.log("[WS] Connecting to:", this.wsUrl);
    this.socketTask = wx.connectSocket({
      url: this.wsUrl,
      success: () => console.log("[WS] wx.connectSocket initiated"),
      fail: (err) => console.error("[WS] wx.connectSocket failed", err)
    });

    this.socketTask.onOpen(() => {
      console.log("[WS] Socket opened. Initiating Socket.io handshakes...");
      // Socket.io standard: send "40" to start namespace connection
      this.sendRaw("40");
    });

    this.socketTask.onMessage((res) => {
      this.handleMessage(res.data);
    });

    this.socketTask.onClose((res) => {
      console.log("[WS] Socket closed:", res);
      this.isConnected = false;
      if (this.callbacks["disconnect"]) {
        this.callbacks["disconnect"](res);
      }
    });

    this.socketTask.onError((err) => {
      console.error("[WS] Socket error:", err);
      this.isConnected = false;
      if (this.callbacks["error"]) {
        this.callbacks["error"](err);
      }
    });
  }

  sendRaw(data) {
    if (this.socketTask) {
      this.socketTask.send({
        data,
        fail: (err) => console.error("[WS] sendRaw fail:", err)
      });
    }
  }

  emit(event, payload) {
    // Socket.io emit packet: 42["event", payload]
    const packet = `42${JSON.stringify([event, payload])}`;
    if (this.isConnected) {
      this.sendRaw(packet);
    } else {
      console.log("[WS] Socket not ready. Queueing outbound emit packet:", event);
      this.outboundQueue.push(packet);
    }
  }

  flushOutboundQueue() {
    if (this.outboundQueue.length > 0) {
      console.log(`[WS] Flushing ${this.outboundQueue.length} queued outbound packet(s)...`);
      while (this.outboundQueue.length > 0) {
        const pkt = this.outboundQueue.shift();
        this.sendRaw(pkt);
      }
    }
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  handleMessage(data) {
    if (typeof data !== "string") return;

    const engineCode = data[0];
    if (engineCode === "0") {
      console.log("[WS] Handshake received:", data.slice(1));
    } else if (engineCode === "1") {
      console.error("[WS] Engine.IO Error packet received from server:", data);
      this.isConnected = false;
      if (this.callbacks["error"]) this.callbacks["error"](data);
    } else if (engineCode === "2") {
      // Ping from server, respond with pong "3"
      this.sendRaw("3");
    } else if (engineCode === "4") {
      const type = data[1];
      if (type === "0") {
        console.log("[WS] Connected to namespace!");
        this.isConnected = true;
        this.flushOutboundQueue();
        if (this.callbacks["connect"]) {
          this.callbacks["connect"]();
        }
      } else if (type === "4") {
        console.error("[WS] Namespace connection rejected / Connect Error:", data);
        this.isConnected = false;
        if (this.callbacks["error"]) this.callbacks["error"]("NAMESPACE_REJECTED");
      } else if (type === "2") {
        // Event message: 42["event", payload]
        try {
          const content = JSON.parse(data.slice(2));
          if (Array.isArray(content) && content.length >= 2) {
            const eventName = content[0];
            const eventPayload = content[1];
            if (this.callbacks[eventName]) {
              this.callbacks[eventName](eventPayload);
            }
          }
        } catch (e) {
          console.error("[WS] JSON Parse error for payload:", data, e);
        }
      }
    }
  }

  disconnect() {
    this.isConnected = false;
    this.outboundQueue = [];
    this.callbacks = {}; // Wipes callbacks to prevent onClose/onError from triggering app-level reconnects during a manual teardown
    if (this.socketTask) {
      this.socketTask.close();
    }
  }
}

module.exports = DahuangSocket;
