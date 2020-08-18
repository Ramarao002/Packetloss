process.chdir(__dirname);

const key = '/home/packetlosstest/certs/privkey.pem';
const cert = '/home/packetlosstest/certs/cert.pem';

const fs = require('fs');
const path = require('path');

const uWS = require('uWebSockets.js');
const wrtc = require('wrtc');
const enc = new TextDecoder("utf-8"); // Requires newer Node.js version

uWS.App().any('/*', (res, req) => {
	res.writeStatus('301');
	res.writeHeader("Location", "https://" + req.getHeader("host") + req.getUrl());
	res.end("");
})
.listen(8080, (listenSocket) => {
	if (listenSocket) {
		console.log('Listening to port 8080');
	}
	else {
		console.log('Failed to listen to port 8080');
	}
});

const listenPath = '/ws';
const listenPort = 8443;
const app = uWS.SSLApp({
	key_file_name: key,
	cert_file_name: cert
}).ws(listenPath, {
	maxPayloadLength: 10240,
	idleTimeout: 10,
	open: (ws, req) => {},
	message: (ws, message, isBinary) => {
		let json;
		try {
			json = JSON.parse(enc.decode(message));
		} catch (e) {}
		if (json) {
			if (json.type === "offer") {
				let serverConnection = new wrtc.RTCPeerConnection({
					iceServers: [
						{
							urls: "stun:stun.l.google.com:19302"
						}
					]
				});
				ws.pc = serverConnection;
				let sendQueue = [];
				serverConnection.ondatachannel = event => {
					if (!ws.dc) {
						let dc = event.channel;
						ws.dc = dc;
						ws.count = 0;
						ws.pings = [];
						dc.onmessage = event => {
							json = JSON.parse(event.data);
							ws.count++;
							ws.pings.push(json.i);
							if (dc.readyState === "open")
								dc.send(event.data);
							else
								sendQueue.push(event.data);
						};
						dc.onopen = event => {
							sendQueue.forEach((msg) => dc.send(msg));
						};
					}
				}
				serverConnection.onicecandidate = event => {
					if (event.candidate)
						ws.send(JSON.stringify({type: "ice", ice: event.candidate}));
				}
				serverConnection.setRemoteDescription(json)
					.then(() => serverConnection.createAnswer())
					.then(answer => serverConnection.setLocalDescription(answer))
					.then(() => ws.send(JSON.stringify(serverConnection.localDescription)));
			}
			else if (json.type === "done") {
				ws.send(JSON.stringify({
					type: "results",
					receivedCount: ws.count,
					list: ws.pings
				}));
				ws.end();
			}
			else if (json.type === "ice") {
				if (json.ice.candidate)
					ws.pc.addIceCandidate(json.ice);
			}
		}
		return false;
	},
	drain: (ws) => {},
	close: (ws, code, message) => {
		if (ws.pc)
			ws.pc.close();
	}
})
.get('/favicon.ico', (res, req) => {
	res.writeHeader('Content-Type', 'image/x-icon');
	try {
		res.end(fs.readFileSync('./favicon.ico'));
	} catch (error) {
		console.log("Error: " + error.message);
	}
})
.get('/android-chrome-192x192.png', giveFile)
.get('/android-chrome-512x512.png', giveFile)
.get('/apple-touch-icon.png', giveFile)
.get('/browserconfig.xml', giveFile)
.get('/favicon-16x16.png', giveFile)
.get('/favicon-32x32.png', giveFile)
.get('/mstile-144x144.png', giveFile)
.get('/mstile-150x150.png', giveFile)
.get('/mstile-310x150.png', giveFile)
.get('/mstile-310x310.png', giveFile)
.get('/mstile-70x70.png', giveFile)
.get('/safari-pinned-tab.svg', giveFile)
.get('/site.webmanifest', giveFile)
.get('/sitemap.xml', giveFile)
.get('/ads.txt', giveFile)
.get('/assets/*', giveFile);

const pages = [
	['/', '/index.html'],
	['/about', '/about.html'],
	['/causes', '/causes.html'],
	['/changelog', '/changelog.html'],
	['/fixing', '/fixing.html'],
	['/interpreting-results', '/interpreting-results.html'],
	['/jitter', '/jitter.html'],
	['/latency', '/latency.html'],
	['/licensing', '/licensing.html'],
	['/packet-loss', '/packet-loss.html'],
	['/simple', '/simple.html'],
	['/technology', '/technology.html'],
	['/webrtc', '/webrtc.html']
];

for (let i = 0; i < pages.length; i++) {
	app.get(pages[i][0], (a, b) => giveFile(a, b, pages[i][1]));
}

app.get('/robots.txt', (a, b) => {
	a.writeHeader('Content-Type', 'text/plain; charset=UTF-8');
	a.end('');
})
.listen(listenPort, (listenSocket) => {
	if (listenSocket) {
		console.log(`Listening to port ${listenPort}`);
	}
	else {
		console.log(`Failed to listen to port ${listenPort}`);
	}
});

function getContentType(ext) {
	switch (ext) {
		case '.html':
			return 'text/html';
		case '.js':
			return 'text/javascript';
		case '.css':
			return 'text/css';
		case '.ico':
			return 'image/x-icon';
		case '.json':
		case '.map':
			return 'application/json';
		case '.xml':
			return 'text/xml';
		case '.png':
			return 'image/png';
		case '.jpg':
			return 'image/jpg';
		case '.svg':
			return 'image/svg+xml';
		case '.txt':
			return 'text/plain';
	}
}

function giveFile(res, req, fileToGive) {
	let filePath = fileToGive || req.getUrl();
	let ext = path.extname(filePath);
	try {
		res.writeHeader('Content-Type',  getContentType(ext));
		return res.end(fs.existsSync('.' + filePath) ? fs.readFileSync('.' + filePath) : "");
	} catch (error) {
		console.log("Error: " + error.message);
	}
}

const cpuCheckRate = 1000 * 60 * 1; // Every minute
let previousUsage = process.cpuUsage();
setInterval(() => {
	const newUsage = process.cpuUsage();
	const percentUsage = (newUsage.system + newUsage.user - previousUsage.system - previousUsage.user) / (cpuCheckRate * 1000);
    if (percentUsage > .9) {
		console.log(`${new Date()}: CPU usage is ${percentUsage * 100}%`);
		process.kill(process.pid, 'SIGUSR2'); // Forever monitor should restart
	}
	previousUsage = newUsage;
}, cpuCheckRate);