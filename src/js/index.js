import '../css/index.scss';
import HeartImage from '../images/heart.png';

class BTHRClient {
    constructor() {
        let W3CWebSocket = require('websocket').w3cwebsocket;
        this.client = new W3CWebSocket('ws://192.168.1.23:3000/bthr', 'bthr-protocol');

        this.client.onerror = () => {
            console.error('Connection Error');
        };

        this.client.onopen = () => {
            console.log(`BTHR Connection Opened`);
        };

        this.client.onclose = () => {
            console.log('BTHR Connection Closed');
        };

        this.client.onmessage = (e) => {
            if (typeof e.data === 'string') {
                let message;
                try {
                    message = JSON.parse(e.data);
                } catch (e) {
                    console.error(`Error when parsing WebSocket message:\n${e}`);
                    return;
                }

                switch (message.method) {
                    case "updateHR":
                        this.updateHeartRateValueFromServer(message.data.hr);
                        break;
                    default:
                        console.warn(`Received message with unknown method!`);
                        break;
                }
            } else {
                console.warn(`Received message with unknown data!`);
            }
        };

        this.mainContainer = document.querySelector(".mainContainer");
        this.mainContainer.addEventListener("click", (e) => {
            this.mainContainerOnClick();
        });

        this.heartRateAnimation = document.querySelector('.heartRateAnimation');
        this.heartRateAnimation.src = HeartImage;

        this.latestHeartRateValues = [];
        this.latestHeartRateValue = undefined;
        this.heartRateValueEl = document.querySelector(".heartRateValue");

        this.initComplete = true;
    }

    updateHeartRateValueFromServer(newValue) {
        this.latestHeartRateValue = parseInt(newValue);

        this.latestHeartRateValues.push(this.latestHeartRateValue / 2);
        this.latestHeartRateValues = this.latestHeartRateValues.slice(-200);
        this.heartRateValueEl.innerHTML = this.latestHeartRateValue > -1 ? this.latestHeartRateValue : "--";
        this.heartRateAnimation.style.animationDuration = `${1 / (this.latestHeartRateValue / 60)}s`;
    }

    sendHeartRateValueToServer(newValue) {
        let msg = {
            "method": `updateHR`,
            "data": {
                "hr": newValue,
            },
            "status": "ok",
        };

        this.client.send(JSON.stringify(msg));
    }

    onHeartRateValueChanged(e) {
        const val = e.target.value.getInt8(1);

        console.log(`HR from BT device: ${val}`);

        this.sendHeartRateValueToServer(val);
    }

    async btConnect() {
        console.log(`Requesting device...`);
        this.btDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['heart_rate'] }],
            acceptAllDevices: false,
        });

        console.log(`Got device! Subscribing to heart rate measurement updates...`);

        this.btRemoteGATTServer = await this.btDevice.gatt.connect();
        this.btGATTService = await this.btRemoteGATTServer.getPrimaryService('heart_rate');
        this.btGATTCharacteristic = await this.btGATTService.getCharacteristic('heart_rate_measurement');

        console.log(`Subscribed to heart rate measurement updates!`);

        this.mainContainer.classList.add("mainContainer--subscribed");

        this.btGATTCharacteristic.oncharacteristicvaluechanged = (e) => { this.onHeartRateValueChanged(e); };
        this.btGATTCharacteristic.startNotifications();

        return this.btGATTCharacteristic;
    }

    mainContainerOnClick() {
        if (!(navigator && navigator.bluetooth)) {
            console.error(`\`navigator.bluetooth\` is falsey!`);
            return;
        }

        if (this.btRemoteGATTServer) {
            console.log(`Disconnecting from BT GATT Server and device...`);
            this.btRemoteGATTServer.disconnect();

            this.btDevice = undefined;
            this.btRemoteGATTServer = undefined;
            this.btGATTService = undefined;
            this.btGATTCharacteristic = undefined;

            this.mainContainer.classList.remove("mainContainer--subscribed");
            return;
        }

        this.btConnect()
        .catch((e) => {
            console.warn(Error(e));
        });
    }
}

let bthrClient = new BTHRClient();
