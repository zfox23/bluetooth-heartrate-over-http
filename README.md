# bluetooth-heartrate-over-http
Starts a local HTTP server and WebSocket server used for sending Bluetooth heartrate data across devices on your local network.

# Prerequisites
1. Ensure you have [NodeJS](https://nodejs.org/en/download/) installed.
    - If you are asked if you want to install some "build tools", make sure you say _yes_ to install them.
    - We're using `NodeJS v14.15.1`.
2. Clone this repository using `git clone <repo URL>`.
3. Open a PowerShell/Command Prompt/Terminal window (depending on your OS) and `cd` into the directory containing this repository.
4. Run `npm install` to download and install the NodeJS prerequisites for our wedding website.

# Running Locally
1. Open a PowerShell/Command Prompt/Terminal window (depending on your OS) and `cd` into the directory containing this repository.
2. Type `npm run start` from the directory containing this repository,

This will start up a local `webpack-dev-server` which will serve the "Bluetooth Heartrate Over HTTP" site to you on port `80`.

If you lose track of the page that is automatically opened for you, you can open your favorite browser and type your computer's internal IP address into your address bar, then press Enter.
- [Here's how to figure out your computer's internal IP address.](https://lifehacker.com/how-to-find-your-local-and-external-ip-address-5833108)

Follow the instructions on the page to continue.