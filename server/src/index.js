const http = require('http');
const WebSocket = require('ws');
const url = require('url');

const PORT = 3000;
const HR_UPDATE_INTERVAL_MS = 1000;
const NO_HR_DATA_TIMEOUT_MS = 5000;

class BTHRServer {
    constructor() {
        this.latestHRValue = 0;

        this.wsServer = new WebSocket.Server({
            "noServer": true
        });

        this.setupSendHRToClientInterval();
        this.setupNoHRDataTimeout();

        this.wsServer.on('connection', (wsConnection) => {
            console.log(`${Date.now()}: Connection accepted.`);

            wsConnection.on('message', (message) => { this.wsConnectionOnMessage(message); });
            wsConnection.on('close', (reasonCode, description) => { this.wsConnectionOnClose(reasonCode, description); });
        });

        this.httpServer = http.createServer();
        this.httpServer.on('upgrade', (request, socket, head) => {
            const pathname = url.parse(request.url).pathname;

            if (pathname !== "/bthr") {
                socket.destroy();
                return;
            }

            if (!this.originIsAllowed(request.headers.origin)) {
                socket.destroy();
                return;
            }

            this.wsServer.handleUpgrade(request, socket, head, (ws) => {
                this.wsServer.emit('connection', ws, request);
            });
        });

        this.httpServer.listen(PORT, () => {
            console.log(`${Date.now()}: BTHR Server is READY and listening on port ${PORT}.`);
        });
    }

    setupSendHRToClientInterval() {
        this.sendHRToClientInterval = setInterval(() => {
            this.wsServer.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        "method": `updateHR`,
                        "data": {
                            "hr": this.latestHRValue,
                        },
                        "status": "ok",
                    }));
                }
            });
        }, HR_UPDATE_INTERVAL_MS);
    }

    setupNoHRDataTimeout() {
        if (this.noHRDataTimeout) {
            clearTimeout(this.noHRDataTimeout);
            this.noHRDataTimeout = undefined;
        }

        this.noHRDataTimeout = setTimeout(() => {
            console.warn(`No HR data received for ${NO_HR_DATA_TIMEOUT_MS}ms.`);
            this.latestHRValue = 0;
        }, NO_HR_DATA_TIMEOUT_MS);
    }

    originIsAllowed(origin) {
        return true;
    }

    wsConnectionOnMessage(message) {
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message);
        } catch (e) {
            console.error(`${Date.now()}: Error parsing message!`);
            return;
        }

        switch (parsedMessage.method) {
            case "updateHR":
                this.setupNoHRDataTimeout();
                this.latestHRValue = parsedMessage.data.hr;
                break;
            default:
                console.warn(`${Date.now()}: Received message with unknown method \`${parsedMessage.method}\`!`);
                break;
        }
    }

    wsConnectionOnClose(reasonCode, description) { }
}

let bthrServer = new BTHRServer();
