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

        this.setupHeartRateAnimationTimer__firstPart();

        this.latestHeartRateValue = 0;
        this.heartRateValueEl = document.querySelector(".heartRateValue");

        this.ctx = document.querySelector('.heartRateChart').getContext('2d');
        this.heartRateChart = new Chart(this.ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Heart Rate Values',
                    borderColor: 'rgba(255, 0, 0, 0.8)',
                    backgroundColor: 'rgba(255, 0, 0, 0.8)',
                    fill: false,
                    data: [],
                    pointRadius: 0,
                }]
            },
            options: {
                layout: {
                    padding: {
                        left: 0,
                        right: 4,
                        top: 4,
                        bottom: 4
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                legend: {
                    display: false
                },
                scales: {
                    xAxes: [{
                        display: false,
                        gridLines: {
                            display: false,
                        },
                        type: 'time',
                        distribution: 'linear',
                        time: {
                            unit: 'millisecond'
                        }
                    }],
                    yAxes: [{
                        gridLines: {
                            display: false,
                        },
                        ticks: {
                            display: false,
                        }
                    }]
                }
            }
        });

        this.transmittingText = document.querySelector(".transmittingText");

        this.wakeLockSentinel = null;

        this.initComplete = true;
    }

    async requestWakeLock() {
        try {
            this.wakeLockSentinel = await navigator.wakeLock.request('screen');
            this.wakeLockSentinel.addEventListener('release', () => {
                console.log('Wake Lock was released.');
            });
            console.log('Wake Lock is active.');
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    }

    async releaseWakeLock() {
        if (!this.wakeLockSentinel) {
            return;
        }
        try {
            await this.wakeLockSentinel.release();
            this.wakeLockSentinel = null;
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    }

    setupHeartRateAnimationTimer__firstPart() {
        let fullAnimationTimeoutMS = 1 / ((this.latestHeartRateValue || 60) / 60) * 1000;
        let firstPartTimeoutMS = fullAnimationTimeoutMS * 0.3;

        this.heartRateAnimationTimer = setTimeout(() => {
            this.heartRateAnimationTimer = undefined;
            if (this.latestHeartRateValue) {
                this.heartRateAnimation.classList.add("heartRateAnimation--big");
            } else {
                this.heartRateAnimation.classList.remove("heartRateAnimation--big");
            }
            this.setupHeartRateAnimationTimer__secondPart();
        }, firstPartTimeoutMS);
    }

    setupHeartRateAnimationTimer__secondPart() {
        let fullAnimationTimeoutMS = 1 / ((this.latestHeartRateValue || 60) / 60) * 1000;
        let secondPartTimeoutMS = fullAnimationTimeoutMS * 0.3;

        this.heartRateAnimationTimer = setTimeout(() => {
            this.heartRateAnimationTimer = undefined;
            this.heartRateAnimation.classList.remove("heartRateAnimation--big");
            this.setupHeartRateAnimationTimer__thirdPart();
        }, secondPartTimeoutMS);
    }

    setupHeartRateAnimationTimer__thirdPart() {
        let fullAnimationTimeoutMS = 1 / ((this.latestHeartRateValue || 60) / 60) * 1000;
        let thirdPartTimeoutMS = fullAnimationTimeoutMS * 0.4;

        this.heartRateAnimationTimer = setTimeout(() => {
            this.heartRateAnimationTimer = undefined;
            this.setupHeartRateAnimationTimer__firstPart();
        }, thirdPartTimeoutMS);
    }

    updateHeartRateValueFromServer(newValue) {
        this.latestHeartRateValue = parseInt(newValue);

        if (newValue > 0) {
            this.heartRateChart.data.datasets[0].data.push({
                "t": new Date(),
                "y": newValue
            });
            if (this.heartRateChart.data.datasets[0].data.length > 50) {
                this.heartRateChart.data.datasets[0].data.shift();
            }
            this.heartRateChart.update();
        }

        this.heartRateValueEl.innerHTML = this.latestHeartRateValue > 0 ? this.latestHeartRateValue : "--";
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

        this.requestWakeLock();

        this.mainContainer.classList.add("mainContainer--subscribed");
        this.transmittingText.classList.remove("transmittingText--displayNone");

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

            this.releaseWakeLock();

            this.btDevice = undefined;
            this.btRemoteGATTServer = undefined;
            this.btGATTService = undefined;
            this.btGATTCharacteristic = undefined;

            this.mainContainer.classList.remove("mainContainer--subscribed");
            this.transmittingText.classList.add("transmittingText--displayNone");
            return;
        }

        this.btConnect()
            .catch((e) => {
                console.warn(Error(e));
            });
    }
}

let bthrClient = new BTHRClient();
