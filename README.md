# bluetooth-heartrate-over-http
Starts a local HTTP server and WebSocket server used for sending Bluetooth heartrate data across devices on your local network.

I developed this because:
1. I wanted to learn more about WebSockets.
2. I wanted to write some code to allow me to show my heart rate data in an [OBS](https://obsproject.com/) scene without using something that already existed.
3. I don't have a Bluetooth adapter for my PC, so I needed a way to get heart rate data from my HRM -> my phone -> my PC -> OBS.

Here's what the output of this project looks like in OBS:

![](./demo.png)

I'm wearing a Basis Peak in this screencap. Any Bluetooth heartrate monitor will work. However, certain Bluetooth Smart heartrate monitors, such as the Wahoo Tickr Fit, will probably not work.

# Prerequisites
1. Google Chrome and Microsoft Edge are the only two browsers that support the necessary Web APIs that allow Bluetooth heartrate monitors to communicate with the browser, so make sure you're using one of those browsers.
1. Ensure you have [NodeJS](https://nodejs.org/en/download/) installed.
    - If you are asked if you want to install some "build tools", make sure you say _yes_ to install them.
    - We're using `NodeJS v14.15.1`.
1. Clone this repository using `git clone <repo URL>`.
1. Open a PowerShell/Command Prompt/Terminal window (depending on your OS) and `cd` into the directory containing this repository.
1. Run `npm install` to download and install the NodeJS prerequisites for both the client component of this project.
1. Run `cd server`, then `npm install` to download and install the NodeJS prerequisites for the server component of this project.

# Running Locally
1. Open a PowerShell/Command Prompt/Terminal window (depending on your OS) and `cd` into the directory containing this repository.
1. Type `npm run start` from the directory containing this repository,

This will start up a local `webpack-dev-server` which will serve the "Bluetooth Heartrate Over HTTP" site to you on port `80`.

Then, open Chrome or Edge and type your computer's internal IP address into your address bar, then press Enter.
- [Here's how to figure out your computer's internal IP address.](https://lifehacker.com/how-to-find-your-local-and-external-ip-address-5833108)

Follow the instructions on the page to continue.

Once a Bluetooth heartrate monitor is transmitting data to the WebSocket server via the browser, you can navigate a different browser on the same network to that same internal IP address and see the live heartrate data. You can even point an OBS Web source at that IP address and you'll get live heartrate data within OBS!