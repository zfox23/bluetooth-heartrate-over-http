import '../css/index.scss';
import HeartImage from '../images/heart.png';
const REASONABLE_HR_MIN = 60;
const REASONABLE_HR_MAX = 150;

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
                    borderColor: [],
                    backgroundColor: [],
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

        this.statusText = document.querySelector(".statusText");
        // If browser is BT capable and is tall enough to show everything necessary...
        // (For some reason, the OBS browser reprts `navigator.bluetooth` as truthy.)
        if (navigator.bluetooth && window.innerHeight > 100) {
            this.statusText.classList.remove("statusText--displayNone");
            this.statusText.innerHTML = `Tap anywhere to begin...`;
        }

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

    /**
    * A linear interpolator for hexadecimal colors.
    * From: https://gist.github.com/rosszurowski/67f04465c424a9bc0dae
    * @param {String} a
    * @param {String} b
    * @param {Number} amount
    * @example
    * // returns #7F7F7F
    * lerpColor('#000000', '#ffffff', 0.5)
    * @returns {String}
    */
    lerpColor(a, b, amount) {
        var ah = parseInt(a.replace(/#/g, ''), 16),
            ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
            bh = parseInt(b.replace(/#/g, ''), 16),
            br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
            rr = ar + amount * (br - ar),
            rg = ag + amount * (bg - ag),
            rb = ab + amount * (bb - ab);

        return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
    }

    setupHeartRateAnimationTimer__firstPart() {
        let fullAnimationTimeoutMS = 1 / ((this.latestHeartRateValue || REASONABLE_HR_MIN) / REASONABLE_HR_MIN) * 1000;
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
        let fullAnimationTimeoutMS = 1 / ((this.latestHeartRateValue || REASONABLE_HR_MIN) / REASONABLE_HR_MIN) * 1000;
        let secondPartTimeoutMS = fullAnimationTimeoutMS * 0.3;

        this.heartRateAnimationTimer = setTimeout(() => {
            this.heartRateAnimationTimer = undefined;
            this.heartRateAnimation.classList.remove("heartRateAnimation--big");
            this.setupHeartRateAnimationTimer__thirdPart();
        }, secondPartTimeoutMS);
    }

    setupHeartRateAnimationTimer__thirdPart() {
        let fullAnimationTimeoutMS = 1 / ((this.latestHeartRateValue || REASONABLE_HR_MIN) / REASONABLE_HR_MIN) * 1000;
        let thirdPartTimeoutMS = fullAnimationTimeoutMS * 0.4;

        this.heartRateAnimationTimer = setTimeout(() => {
            this.heartRateAnimationTimer = undefined;
            this.setupHeartRateAnimationTimer__firstPart();
        }, thirdPartTimeoutMS);
    }

    clamp(value, min, max) {
        if (min > max) {
            let temp = min;
            min = max;
            max = temp;
        }
        return Math.min(Math.max(value, min), max);
    }

    updateHeartRateValueFromServer(newValue) {
        this.latestHeartRateValue = parseInt(newValue);

        if (newValue > 0) {
            this.heartRateChart.data.datasets[0].data.push({
                "t": new Date(),
                "y": newValue,
            });

            let chartPointColor = this.lerpColor("#6bc23c", "#e34327", (this.clamp(newValue, REASONABLE_HR_MIN, REASONABLE_HR_MAX) - REASONABLE_HR_MIN) / (REASONABLE_HR_MAX - REASONABLE_HR_MIN));
            this.heartRateChart.data.datasets[0].borderColor.push(chartPointColor);
            this.heartRateChart.data.datasets[0].backgroundColor.push(chartPointColor);

            if (this.heartRateChart.data.datasets[0].data.length > 50) {
                this.heartRateChart.data.datasets[0].data.shift();
                this.heartRateChart.data.datasets[0].borderColor.shift();
                this.heartRateChart.data.datasets[0].backgroundColor.shift();
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
        this.statusText.innerHTML = `Transmitting...`;

        this.sendHeartRateValueToServer(val);
    }

    btConnect() {
        return new Promise((resolve, reject) => {
            this.statusText.classList.remove("statusText--displayNone");

            console.log(`Requesting device...`);
            this.statusText.innerHTML = `Requesting BT device...`;

            navigator.bluetooth.requestDevice({
                filters: [{ services: ['heart_rate'] }],
                acceptAllDevices: false,
            })
                .then((device) => {
                    this.btDevice = device;

                    console.log(`Got device! Subscribing to heart rate measurement updates...`);
                    this.statusText.innerHTML = `Subscribing to heart rate measurement updates...`;

                    this.btDevice.gatt.connect()
                        .then((server) => {
                            this.btRemoteGATTServer = server;
                            this.btRemoteGATTServer.getPrimaryService('heart_rate')
                                .then((service) => {
                                    this.btGATTService = service;
                                    this.btGATTService.getCharacteristic('heart_rate_measurement')
                                        .then((char) => {
                                            this.btGATTCharacteristic = char;

                                            this.btGATTCharacteristic.oncharacteristicvaluechanged = (e) => { this.onHeartRateValueChanged(e); };
                                            this.btGATTCharacteristic.startNotifications();

                                            console.log(`Subscribed to heart rate measurement updates!`);
                                            this.statusText.innerHTML = `Subscribed to heart rate measurement updates!`;

                                            resolve(this.btGATTCharacteristic);
                                        })
                                        .catch((e) => {
                                            reject(e);
                                        })
                                })
                                .catch((e) => {
                                    reject(e);
                                })
                        })
                        .catch((e) => {
                            reject(e);
                        })
                })
                .catch((e) => {
                    reject(e);
                })
        });
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
            this.statusText.innerHTML = `Disconnected from BT device. Tap anywhere to begin again...`;
            return;
        }

        this.btConnect()
            .then(() => {
                this.requestWakeLock();

                this.mainContainer.classList.add("mainContainer--subscribed");
            })
            .catch((e) => {
                this.statusText.innerHTML = e;
                console.warn(Error(e));
            });
    }
}

let bthrClient = new BTHRClient();
