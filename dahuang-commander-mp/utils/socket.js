class DahuangSocket {
  constructor(url, path = "/api/socket") {
    // Convert http/https URL to ws/wss
    let wsUrl = url.replace(/^http/, "ws");
    this.wsUrl = `${wsUrl}${path}/?EIO=4&transport=websocket`;
    this.callbacks = {};
    this.socketTask = null;
    this.pingTimer = null;
    this.isConnected = false;
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
      this.stopPing();
      if (this.callbacks["disconnect"]) {
        this.callbacks["disconnect"](res);
      }
    });

    this.socketTask.onError((err) => {
      console.error("[WS] Socket error:", err);
      if (this.callbacks["error"]) {
        this.callbacks["error"](err);
      }
    });
  }

  sendRaw(data) {
    if (this.socketTask) {
      this.socketTask.send({ data });
    }
  }

  emit(event, payload) {
    // Socket.io emit packet: 42["event", payload]
    const packet = `42${JSON.stringify([event, payload])}`;
    this.sendRaw(packet);
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  handleMessage(data) {
    if (typeof data !== "string") return;

    const engineCode = data[0];
    if (engineCode === "0") {
      console.log("[WS] Handshake received:", data.slice(1));
      this.startPing();
    } else if (engineCode === "2") {
      // Ping from server, respond with pong
      this.sendRaw("3");
    } else if (engineCode === "4") {
      const type = data[1];
      if (type === "0") {
        console.log("[WS] Connected to namespace!");
        this.isConnected = true;
        if (this.callbacks["connect"]) {
          this.callbacks["connect"]();
        }
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

  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.socketTask) {
        // Send a ping: 2
        this.sendRaw("2");
      }
    }, 25000);
  }

  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  disconnect() {
    this.stopPing();
    this.callbacks = {}; // Wipes callbacks to prevent onClose/onError from triggering app-level reconnects during a manual teardown
    if (this.socketTask) {
      this.socketTask.close();
    }
  }
}

module.exports = DahuangSocket;
