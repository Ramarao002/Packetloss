"use strict"

const isSimple = !!document.getElementById("simpleResults");

const startDisabledReasons = new Set();

const maxPings = 11600;
const maxData = 10 * 1024 * 1024;
const minimumInterval = 15; // 4 is bare minimum for setInterval()
let totalPings;
let totalData;
let savedSettingsHeight;
let updatePredictedUse;
if (!isSimple) {
	updatePredictedUse = function() {
		let duration = parseInt(document.getElementById("durationSlider").value);
		let interval = 1000 / parseInt(document.getElementById("frequencySlider").value);
		if (interval > minimumInterval)
			interval = Math.round(interval);
		totalPings = Math.floor(duration * 1000 / interval);
		document.getElementById("totalPings").innerHTML = totalPings;
		const s = document.getElementById("totalPingsPluralizer");
		if (s)
			s.style.display = totalPings > 1 ? "inline" : "none";
		totalData = totalPings * parseInt(document.getElementById("sizeSlider").value) + 115;
		document.getElementById("totalData").innerHTML = totalData < 1024 ? `~${totalData} bytes` : totalData < 1024 * 1024 ? `${(totalData / 1024).toFixed(1)} KB` : `${(totalData / 1024 / 1024).toFixed(2)} MB`;
		let tooManyPings = totalPings > maxPings;
		let tooMuchData = totalData > maxData;
		if (tooManyPings || totalData > maxData) {
			let extraHeight;
			if (document.documentElement === "en")
				extraHeight = 47;
			else
				extraHeight = 100;
			if (tooManyPings) {
				document.getElementById("pingsThatAreTooMany").innerHTML = document.getElementById("totalPingsReason").innerText;
				tooManyPingsMessage.style.display = "inline";
				extraHeight += 18;
			}
			else
				tooManyPingsMessage.style.display = "none";
			if (tooMuchData)
				document.getElementById("dataThatIsTooMuch").innerHTML = document.getElementById("totalData").innerText;
			if (window.innerWidth >= 500) {
				if (!savedSettingsHeight)
					savedSettingsHeight = settings.clientHeight;
				settings.style.height = (savedSettingsHeight + extraHeight) + "px";
			}
			else
				settings.style.height = "";
			Array.from(document.getElementsByClassName("usageThatIsTooMuchAnd")).forEach(x => x.style.display = tooManyPings && tooMuchData ? "inline" : "none");
			usageStopMessage.style.display = "block";
			start.disabled = true;
			startDisabledReasons.add("use");
		}
		else {
			if (savedSettingsHeight) {
				settings.style.height = "";
				savedSettingsHeight = false;
			}
			usageStopMessage.style.display = "none";
			tooManyPingsMessage.style.display = "none";
			startDisabledReasons.delete("use");
			if (!startDisabledReasons.size)
				start.disabled = false;
		}
	}
	updatePredictedUse();

	/*const unicodeSupport = {
		7: {
			"android": 8,
			"OS": 8 //iOS
		}
	}*/
	const replacements = {
		7: {
			"🠥": "⬆",
			"🠧": "⬇"
		}
	};
	if (!navigator.userAgent.includes("Windows NT 10"))
	Object.entries(replacements[7]).forEach(symbols =>
		document.body.innerHTML = document.body.innerHTML.replace(new RegExp(symbols[0], 'g'), symbols[1])
	);
	/*const ua = navigator.userAgent.toLowerCase();
	const osInfo = ua.match(/(android)\s([0-9\.]*)/) || ua.replace('_', '.').match(/(OS) ([\d+\.?]+)/ );
	if (osInfo)
		checkUnicode();
	function checkUnicode() {
		Object.keys(unicodeSupport).forEach(v => {
			if (osInfo[2] < unicodeSupport[v][osInfo[1]])
				Object.entries(replacements[v]).forEach(symbols =>
					document.body.innerHTML = document.body.innerHTML.replace(new RegExp(symbols[0], 'g'), symbols[1])
				);
		});
	}*/

	preset.onchange = presetChanged;
	function presetChanged() {
		let select = document.getElementById("preset");
		let option = select.options[select.selectedIndex];
		["size", "frequency", "duration", "wait"].forEach(s => {
			if (s in option.dataset) {
				let slider = document.getElementById(s + "Slider");
				slider.value = option.dataset[s];
				slider.dispatchEvent(new Event("input"));
			}
		});
	}

	// Close nav menus on clicking elsewhere
	document.addEventListener('click', function (event) {
		document.querySelectorAll("nav details[open]").forEach(x => {
			if (!x.contains(event.target))
				x.open = false;
		});
	});
}

// Prevent double clicking summaries from selecting them
// https://stackoverflow.com/questions/880512/prevent-text-selection-after-double-click
document.querySelectorAll("summary").forEach(x => x.addEventListener('mousedown', function (event) {
	if (event.detail > 1)
		event.preventDefault();
}, false));

let firstRun = true;
let latePings;
start.onclick = () => {
	if (
		totalData < 3 * 1024 * 1024 ||
		(isSimple || window.confirm(`This test as you've configured it will use ${(totalData / 1024 / 1024).toFixed(2)} MB of bandwidth for both of us. Are you sure you want to run it?`))
	)
		runTest();
};
const results = document.getElementById("simpleResults") || document.getElementById("results");
const progress = document.getElementById("simpleProgress") || document.getElementById("progress");

const workerUrl = '/assets/worker.js';
let worker;
if (document.domain === 'packetlosstest.com')
	worker = new Worker(workerUrl);
else
	fetch(workerUrl)
		.then(response => response.blob())
		.then(blob => worker = new Worker(URL.createObjectURL(blob)));
if (isSimple) {
	runTest();
}
function runTest() {
	const hertz = isSimple ? 15 : parseInt(document.getElementById("frequencySlider").value);
	const duration = isSimple ? 10 : parseInt(document.getElementById("durationSlider").value);
	const minSize = isSimple ? 105 : parseInt(document.getElementById("sizeSlider").value); //1212 - 107; // There's 107 or 123 bytes of overhead
	const wait = isSimple ? 200 : parseInt(document.getElementById("waitSlider").value);
	const startDelay = isSimple ? 0 : (document.getElementById("delayedStart").checked ? parseInt(document.getElementById("delayedStart").value) : 0);

	if (firstRun && !isSimple) {
		about.open = false;
		settings.open = false;
		firstRun = false;
	}
	start.disabled = true;
	startDisabledReasons.add("running");
	results.style.display = "none";
	errorSection.style.display = "none";
	// let selectedServer = document.getElementById("server")?.value ?? "wss://lse.packetlosstest.com/ws"; // ES2020 https://github.com/terser/terser/issues/567
	const serverSelector = document.getElementById("server");
	let selectedServer = serverSelector.value;
	let webSocket = new WebSocket(selectedServer);
	webSocket.onerror = failTest;

	let localConnection;
	let i;
	latePings = [];
	let failed = [];
	let failedCount = 0;
	let pings;
	let pingsToSkip = 0;
	let recordResults = false;
	let averagePing;
	let averageJitter;
	webSocket.onopen = event => {
		webSocket.send("sending waiting text");

		localConnection = new RTCPeerConnection({
			iceServers: [
				{
					urls: "stun:stun.l.google.com:19302"
				}
			]
		});
		webSocket.pinger = setInterval(() => {
			try {
				webSocket.send("");
			} catch (e) { /*console.log("Tried to keep a dead connection alive.");*/ }
		}, 5000);
		i = 0;
		pings = [];
		let dc = localConnection.createDataChannel("channel", {
			ordered: false,
			maxRetransmits: 0
		});
		dc.onopen = event => {
			// console.log("dc open");
			// document.querySelector("body").appendChild(document.createElement("p")).innerHTML = `Sending pings of ~${minSize + 115} bytes each...`;
			/*webSocket.send(JSON.stringify({
				type: "testParameters",
				hertz: hertz,
				duration: duration
			}));*/
			progress.open = true;
			progress.style.display = "block";
			let timer;
			const interval = 1000 / hertz;
			function sendMessage() {
				dc.send(JSON.stringify({
					i: i++,
					time: new Date().getTime()
				}).padEnd(minSize, ' '));
				if (recordResults) {
					if (!isSimple) {
						document.querySelector('sent-circle-thingy').current++;
					}
				}
				else
					pingsToSkip++;
			}
			if (interval > minimumInterval)
				timer = setInterval(sendMessage, Math.round(interval));
			else {
				worker.onmessage = event => {
					if (event.data.send === true)
						sendMessage();
				};
				worker.postMessage({ interval: interval, duration: (startDelay + duration) * 1000});
			}

			if (startDelay)
				setTimeout(beginRecordingResults, startDelay * 1000);
			else
				beginRecordingResults();
			function beginRecordingResults() {
				recordResults = true;
				if (timer !== undefined)
					setTimeout(() => {
						clearInterval(timer);
					}, 1000 * duration);
				if (!isSimple) {
					progress.querySelectorAll("sent-circle-thingy, time-circle-thingy, received-circle-thingy").forEach(x => {
						x.wait = wait;
						if (x.tagName === "SENT-CIRCLE-THINGY" || x.tagName === "RECEIVED-CIRCLE-THINGY")
						x.start(totalPings);
						if (x.tagName === "TIME-CIRCLE-THINGY")
						x.start(duration);
					});
					const secondTimer = setInterval(() => {
						document.querySelector('time-circle-thingy').current++;
					}, 1000);
					setTimeout(() => {
						clearInterval(secondTimer);
						document.querySelector('time-circle-thingy').current = duration;
					}, 1000 * duration);
				}
				setTimeout(() => {
					dc.close();
					webSocket.send(JSON.stringify({
						type: "done"
					}));
					if (!isSimple)
						document.querySelector('received-circle-thingy').finish();
					results.style.display = "block";
					results.open = true;
					if (pings.length) {
						pings.sort((a, b) => a.i - b.i);
						averagePing = pings.reduce((a, b) => { return { ping: a.ping + b.ping }; }).ping / pings.length;
						let totalJitter = 0;
						let missingCount = 0;
						for (let j = 0; j < pings.length; j++) {
							totalJitter += Math.abs(pings[j].ping - averagePing);
							if (pings[j].i !== j + missingCount) {
								failed.push(j);
								failedCount++;
								missingCount++;
							}
						}
						averageJitter = totalJitter / (pings.length - 1);
						if (!isSimple) {
							latency.innerHTML = averagePing.toFixed(2);
							jitter.innerHTML = averageJitter.toFixed(2);
						}
						//latePacketsMessage.innerHTML = `${latePings.length} (${(latePings.length / (i - pings.length) * 100).toFixed(2)}% of the "lost" packets and ${(latePings.length / i * 100).toFixed(2)}% overall)`;
					}
					else if (!isSimple) {
						latency.innerHTML = '∞';
						jitter.innerHTML = '∞';
					}
					let checkedCount = pings.length + failedCount;
					if (checkedCount < i - pingsToSkip) {
						failedCount += i - checkedCount;
						for (; checkedCount < i; checkedCount++)
							failed.push(checkedCount);
					}
					if (!isSimple) {
						setResults(packetLoss, failedCount, i - pingsToSkip);
						if (failedCount === 0) {
							setResults(upload, failedCount, i - pingsToSkip);
							setResults(download, failedCount, i - pingsToSkip);
						}
						setResults(document.getElementById('late'), latePings.length, i - pingsToSkip);
						let pingTimes = new Array(i).fill(null);
						pings.forEach(x => pingTimes[x.i] = x.ping);
						drawChart(pingTimes, wait, averagePing, averageJitter);
						disableDownloads();
					}
					else {
						setSimpleResults(failedCount, i - pingsToSkip);
					}

					/* document.querySelector("body").appendChild(document.createElement("p")).innerHTML = `Result: ${pings.length} pings successful out of ${i}. (${((1 - (pings.length / i)) * 100).toFixed(2)}% packet loss)`;
					if (failedCount && failed)
						document.querySelector("body").appendChild(document.createElement("p")).innerHTML = `Ping${failedCount > 1 ? 's' : ''} #${failed.join(", #")} failed.`;
					if (pings.length)
						document.querySelector("body").appendChild(document.createElement("p")).innerHTML = `The average latency for pings was ${(pings.reduce((a, b) => { return {ping: a.ping + b.ping}; }).ping / pings.length).toFixed(1)}ms.`; */
					endStartButtonRunningDisable();
				}, 1000 * duration + wait + interval + 500);
			}
		};
		dc.onmessage = event => {
			if (recordResults) {
				let json = JSON.parse(event.data);
				if (json.i >= pingsToSkip) {
					let ping = new Date().getTime() - json.time;
					json.i -= pingsToSkip;
					let item = {
						i: json.i,
						ping: new Date().getTime() - json.time
					};
					pings.push(item);
					if (ping <= wait && !isSimple) {
						document.querySelector('received-circle-thingy').received(json.i);
					}
					else {
						latePings.push(item);
						//failed.push(item);
						//failedCount++;
						if (!isSimple)
							document.querySelector('received-circle-thingy').received(json.i, true);
					}
				}
			}
		};
		/* dc.onclose = event => {
			// document.querySelector("body").appendChild(document.createElement("p")).innerHTML = `Stopped pinging.`;
		};*/
		localConnection.onconnectionstatechange = event => localConnection.connectionState;
		localConnection.oniceconnectionstatechange = event => localConnection.iceConnectionState;
		localConnection.onicecandidate = event => {
			if (event.candidate) {
				webSocket.send(JSON.stringify({type: "ice", ice: event.candidate}));
				// console.log("Sending ICE candidate");
			}
			else {
				// console.log("All ICE candidates have been sent");
			}
		}
		localConnection.createOffer()
		.then(offer => localConnection.setLocalDescription(offer)) // Verbosity needed for Chrome
		.then(() => {
			webSocket.send(JSON.stringify(localConnection.localDescription))
		});
	};

	webSocket.onmessage = event => {
		// console.log('Recieved "' + event.data + '"');
		if (!event.data)
			return false;
		
		var json;
		try {
			json = JSON.parse(event.data);
		} catch (e) {}
		if (json) {
			//console.log(json.type);
			if (json.type === "answer")
				localConnection.setRemoteDescription(json)/*.then(() =>
					console.log(localConnection.remoteDescription))*/;
			else if (json.type === "results") {
				json.list.sort((a, b) => a - b);
				json.list.splice(0, pingsToSkip);
				json.receivedCount -= pingsToSkip;
				for (let i = 0; i < json.list.length; i++)
					json.list[i] -= pingsToSkip;
				// console.log("Pings recieved by the server:");
				// console.log(json.list);
				let upFailedList = [];
				for (let i = 0; i < json.receivedCount; i++)
					if (i === 0 && json.list[i] !== 0)
						upFailedList.push(0);
					else if (json.list[i] !== json.list[i - 1] + 1)
						for (let j = json.list[i - 1] + 1; j < json.list[i]; j++)
							upFailedList.push(j);
				if (!isSimple) {
					document.querySelector('sent-circle-thingy').setResults(upFailedList);
					prepareDownloads(i, pings, upFailedList, failedCount, latePings.length, i - pingsToSkip, averagePing, averageJitter, duration, hertz, minSize + 115, wait);
					setResults(upload, upFailedList.length, i - pingsToSkip);
					setResults(download, failedCount - upFailedList.length, json.receivedCount);
				}
				// document.querySelector("body").appendChild(document.createElement("p")).innerHTML = `${json.receivedCount} pings uploaded successfully out of ${i}, meaning that ${i - json.receivedCount} failed on upload, and ${i - pings.length} failed on download.`;
			}
			else if (json.type === "ice") {
				localConnection.addIceCandidate(json.ice)
				//.then(() =>console.log(localConnection.remoteDescription))
				;
			}
		}
		return false;
	}

	webSocket.onclose = event => {
		clearInterval(webSocket.pinger);
		console.log("WebSocket closed");
	};
}

function failTest() {
	endStartButtonRunningDisable();
	if (errorSection.style.display !== "block") {
		progress.open = false;
		results.open = false;
		errorContent.innerHTML = "<p>Sorry, some error has stopped the test from starting. This could be my bad, or your connection could have just failed. Feel free to try again.</p>";
		errorSection.style.display = "block";
	}
}

function endStartButtonRunningDisable() {
	startDisabledReasons.delete("running");
	if (!startDisabledReasons.size)
		start.disabled = false;
}

const badColor = '#E53A43';
const goodColor = '#E2690C';
const grayColor = '#CCCCCC';
const lateColor = '#E2980C';
const maybeColor = '#F5A262'; // For sent until confirmation is received

class ProgressCircleThingy extends HTMLElement {
	//static defaultColor = goodColor;
	static defaultColor() { return goodColor; }
	get current() {
		return this.getAttribute('current')
	}

	set current(val) {
		if (val) {
			this.setAttribute('current', val);
		}
		else {
			this.setAttribute('current', '0');
		}
		this.update();
	}

	get total() {
		return this.getAttribute('total')
	}

	set total(val) {
		if (val) {
			this.setAttribute('total', val);
		}
		else {
			this.setAttribute('total', '0');
		}
	}

	get percent() {
		return this.getAttribute('percent');
	}

	set percent(val) {
		this.setAttribute('percent', val);
		this.percentText.innerHTML = (val * 100).toFixed(0) + '%';
	}

	constructor() {
		super();

		this.style.position = 'relative';

		let shadow = this.attachShadow({mode: 'open'});

		function makeCanvas(width = 200) {
			let canvas = document.createElement('canvas');
			canvas.style.position = 'absolute';
			let canvasMarginQuery = window.matchMedia("(min-width: 665px)");
			function canvasMarginTest(e) {
				if (e.matches)
					canvas.style.marginLeft = '15px';
				else
					canvas.style.marginLeft = '0';
			}
			canvasMarginTest(canvasMarginQuery);
			canvasMarginQuery.addListener(canvasMarginTest);
			canvas.width = width;
			canvas.height = width;
			// canvas.style.width = `min(${width}, calc((100vw - 20px) / 3))`;
			// canvas.style.height = `min(${width}, calc((100vw - 20px) / 3))`;
			canvas.style.maxWidth = "calc((100vw - 20px) / 3)";
			canvas.style.maxHeight = "calc((100vw - 20px) / 3)";
			shadow.appendChild(canvas);
			let context = canvas.getContext("2d");
			context.lineWidth = 15;
			return [canvas, context];
		}
		let canvas, context;
		[canvas, context] = makeCanvas();//this.parentNode.clientWidth);
		context.strokeStyle = grayColor;
		//context.shadowColor = 'rgba(0,0,0,0.60)';
		//context.shadowBlur = 5;
		//context.shadowOffsetX = 2;
		//context.shadowOffsetY = 5;
		context.arc(canvas.width / 2, canvas.width / 2, canvas.width / 2 - 15, 0.6 * Math.PI, 0.4 * Math.PI);
		context.stroke();
		[canvas, context] = makeCanvas();
		context.strokeStyle = goodColor;
		this.canvas = canvas;
		this.context = context;

		let bigText = document.createElement('div');
		this.bigText = bigText;
		let bigTextSizeQuery = window.matchMedia("(min-width: 450px)");
		function bigTextSizeTest(e) {
			if (e.matches)
				bigText.style.fontSize = '42px';
			else
				bigText.style.fontSize = '9.75vw';
		}
		bigTextSizeTest(bigTextSizeQuery);
		bigTextSizeQuery.addListener(bigTextSizeTest);
		bigText.style.margin = '35% auto 0';
		bigText.style.textAlign = 'center';
		bigText.style.width = '50%';
		shadow.appendChild(bigText);
		let smallText = document.createElement('div');
		this.smallText = smallText;
		smallText.style.fontSize = '16px';
		smallText.style.margin = '5px auto';
		smallText.style.paddingLeft = '50%';
		smallText.style.width = '50%';
		shadow.appendChild(smallText);
		let percentText = document.createElement('div');
		this.percentText = percentText;
		percentText.style.fontFamily = "'Squada One', sans-serif";
		percentText.style.fontSize = '20px';
		percentText.style.margin = 'calc(10px + 8%) auto 7%';
		percentText.style.textAlign = 'right';
		percentText.style.width = '15%';
		shadow.appendChild(percentText);
	}

	start(total) {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.strokeStyle = this.constructor.defaultColor(); // Remove method call in field
		this.painted = 0;
		this.total = total;
		this.current = 0;
	}

	update() {
		this.bigText.innerHTML = this.getAttribute('current');
		this.smallText.innerHTML = "/ " + this.getAttribute('total');
		this.percent = this.getAttribute('current') / this.getAttribute('total');
	}
}
class SentCircleThingy extends ProgressCircleThingy {
	//static defaultColor = maybeColor;
	static defaultColor() { return maybeColor; }

	update() {
		super.update();

		this.context.beginPath();
		this.context.arc(this.canvas.width / 2, this.canvas.width / 2, this.canvas.width / 2 - 15, 0.6 * Math.PI + 1.8 * Math.PI * (this.painted / this.getAttribute('total')), 0.4 * Math.PI - 1.8 * Math.PI * (1 - this.percent));
		this.context.stroke();
		this.painted = this.getAttribute('current');
	}

	setResults(failed) {
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.strokeStyle = goodColor;
		this.context.beginPath();
		this.context.arc(this.canvas.width / 2, this.canvas.width / 2, this.canvas.width / 2 - 15, 0.6 * Math.PI, 0.4 * Math.PI - 1.8 * Math.PI * (1 - this.percent));
		this.context.stroke();
		this.context.strokeStyle = badColor;
		let total = this.getAttribute('total');
		failed.forEach(j => {
			this.context.beginPath();
			this.context.arc(this.canvas.width / 2, this.canvas.width / 2, this.canvas.width / 2 - 15, 0.6 * Math.PI + 1.8 * Math.PI * (j / total), 0.4 * Math.PI - 1.8 * Math.PI * (1 - (j + 1) / total));
			this.context.stroke();
		});
	}
}
class TimeCircleThingy extends ProgressCircleThingy {
	get total() {
		return super.name;
	}

	set total(val) {
		super.total = val;
		this.targetTime = new Date().getTime() + val * 1000;
	}

	start(total) {
		super.start(total);
		
		let context = this.context;
		let canvas = this.canvas;
		function draw() {
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.beginPath();
			this.percent = 1 - ((this.targetTime - new Date().getTime()) / (this.getAttribute('total') * 1000));
			context.arc(canvas.width / 2, canvas.width / 2, canvas.width / 2 - 15, 0.6 * Math.PI, 0.4 * Math.PI - 1.8 * Math.PI * (1 - this.percent));
			context.stroke();
			if (this.targetTime > new Date().getTime())
				window.requestAnimationFrame(() => draw.call(this));
		}
		window.requestAnimationFrame(() => draw.call(this));
	}

	format(n) {
		return `${Math.floor(n / 60)}:${(n % 60).toString().padStart(2, '0')}`;
	}

	update() {
		this.bigText.innerHTML = this.format(this.getAttribute('current'));
		this.smallText.innerHTML = `/ ${this.format(this.getAttribute('total'))}`;
		this.percent = this.getAttribute('current') / this.getAttribute('total');
	}
}
class ReceivedCircleThingy extends ProgressCircleThingy {
	start(total) {
		super.start(total);

		this.waiting = [];
	}

	received(i, late = false) {
		if (!late) {
			this.current++;
		}
		else
			this.context.strokeStyle = lateColor;
		if (i in this.waiting)
			clearTimeout(this.waiting[i]);
		this.context.beginPath();
		this.context.arc(this.canvas.width / 2, this.canvas.width / 2, this.canvas.width / 2 - 15, 0.6 * Math.PI + 1.8 * Math.PI * (i / this.getAttribute('total')), 0.4 * Math.PI - 1.8 * Math.PI * (1 - (i + 1) / this.getAttribute('total')));
		this.context.stroke();
		if (!late) {
			if (i > this.painted) {
				let lateNums = latePings.map(x => x.i);
				for (let j = this.painted; j < i; j++) {
					if (!lateNums.includes(j))
						this.waiting[j] = setTimeout(j => {
							this.context.strokeStyle = badColor;
							this.context.beginPath();
							this.context.arc(this.canvas.width / 2, this.canvas.width / 2, this.canvas.width / 2 - 15, 0.6 * Math.PI + 1.8 * Math.PI * (j / this.getAttribute('total')), 0.4 * Math.PI - 1.8 * Math.PI * (1 - (j + 1) / this.getAttribute('total')));
							this.context.stroke();
							this.context.strokeStyle = goodColor;
						}, this.wait, j);
				}
			}
		}
		else
		this.context.strokeStyle = goodColor;
		if (i + 1 > this.painted)
			this.painted = i + 1;
	}

	finish() {
		if (this.painted + 1 < document.querySelector('sent-circle-thingy').current) {
			this.context.strokeStyle = badColor;
			this.context.beginPath();
			this.context.arc(this.canvas.width / 2, this.canvas.width / 2, this.canvas.width / 2 - 15, 0.6 * Math.PI + 1.8 * Math.PI * (this.painted / this.getAttribute('total')), 0.4 * Math.PI - 1.8 * Math.PI * (1 - document.querySelector('sent-circle-thingy').percent));
			this.context.stroke();
			this.context.strokeStyle = goodColor;
		}
	}
}
if (!isSimple) {
	progress.style.display = 'block';
	customElements.define('sent-circle-thingy', SentCircleThingy);
	customElements.define('time-circle-thingy', TimeCircleThingy);
	customElements.define('received-circle-thingy', ReceivedCircleThingy);
	progress.style.display = 'none';
}

function setResults(div, bad, total) {
	if (total === 0)
		div.querySelector(".percent").innerHTML = '--';
	else
		div.querySelector(".percent").innerHTML = (bad / total * 100).toFixed(1);
	div.querySelector(".counts").innerHTML = `(${bad} / ${total})`;
}
function setSimpleResults(bad, total) {
	progress.style.display = "none";
	Array.from(document.querySelectorAll("#simpleResults .result")).forEach(x => x.style.display = "none");
	if (total !== 0) {
		const percent = bad / total;
		console.log(percent);
		if (percent < .01)
			document.querySelector(".result.very-good").style.display = "block";
		else if (percent < .025)
			document.querySelector(".result.good").style.display = "block";
		else if (percent < .075)
			document.querySelector(".result.fair").style.display = "block";
		else if (percent < .15)
			document.querySelector(".result.bad").style.display = "block";
		else
			document.querySelector(".result.very-bad").style.display = "block";
	}
}

if (!Chart)
	throw new Error("The Chart.js library failed to load.");
let chart;
Chart.defaults.global.elements.point.hitRadius = 2;
Chart.Tooltip.positioners.custom = (_, position) => position;
function drawChart(pingTimes, wait, averagePing, jitter) {
	let colors = pingTimes.map(x => x === null ? badColor : x < wait ? goodColor : lateColor);
	if (chart)
		chart.destroy();
	chart = new Chart(document.getElementById("chart").getContext('2d'), {
		type: 'bar',
		data: {
			datasets: [
				{
					label: document.getElementById("acceptable-delay-term").innerText,
					data: new Array(pingTimes.length).fill(wait),
					type: 'line',
					backgroundColor: badColor + 'aa',
					borderColor: badColor,
					fill: false,
					pointRadius: 0
				}, {
					borderColor: colors,
					backgroundColor: colors.map(x => x + 'aa'),
					label: document.getElementById("response-time-term").innerText,
					data: pingTimes
				}
			],
			labels: [...Array(pingTimes.length)].map((_,i) => document.getElementById("packet-term").innerText + " #" + (i + 1))
		},
		options: {
			legend: {
				display: false
			},
			maintainAspectRatio: false,
			responsive: true,
			scales: {
				xAxes: [{
					categoryPercentage: 1.0,
					barPercentage: 1.0,
					gridLines: {
						display: false
					},
					ticks: {
						display: false
					}
				}],
				yAxes: [{
					ticks: {
						beginAtZero: true, callback: function (value, index, values) {
							return value + document.getElementById("ms-term").innerText;
						},
						max: Math.ceil(Math.max(Math.min(Math.max(...pingTimes), wait * 2), wait, averagePing + jitter * 2) / 5) * 5
					}
				}]
			},
			tooltips: {
				callbacks: {
					label: function(tooltipItem, data) {
						let label = data.datasets[tooltipItem.datasetIndex].label || '';
						if (label)
							label += ': ';
						label += tooltipItem.yLabel + document.getElementById("ms-term").innerText;
						return label;
					}
				},
				position: 'custom'
			}
		}
	});
}

function disableDownloads() {
	document.getElementById("download-results").classList.add("disabled");
}

function prepareDownloads(pingCount, pings, upFailed, failedCount, lateCount, totalCount, averageLatency, averageJitter, duration, frequency, size, acceptableDelay) {
	let data = [];
	pings.forEach(x => data[x.i] = {
		id: x.i + 1,
		status: "success",
		ping: x.ping
	});
	for (let i = 0; i < pingCount; i++) {
		if (data[i] === undefined) {
			let status;
			if (upFailed.includes(i)) {
				status = "failedOnUpload";
			}
			else {
				status = "failedOnDownload";
			}
			data[i] = {
				id: i + 1,
				status: status
			};
		}
	}
	const timestamp = new Date().toISOString();

	const csv = "id,status,ping\n" + data.map(x => `${x.id},${x.status},${x.ping || ''}`).join("\n");
	document.getElementById("download-csv").href = URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
	document.getElementById("download-csv").download = `packet-loss-test-results-${timestamp}.csv`;
	
	const summary = `Total Packet Loss: ${(failedCount / totalCount * 100).toFixed(2)}%\nUpload Packet Loss: ${(upFailed.length / totalCount * 100).toFixed(2)}%\nDownload Packet Loss: ${((failedCount - upFailed.length) / totalCount * 100).toFixed(2)}%\nLate Packet Rate: ${(lateCount / totalCount * 100).toFixed(2)}%\n\nAverage Latency: ${averageLatency.toFixed(2)}ms\nAverage Jitter: ${averageJitter.toFixed(2)}ms\n\nTest Settings:\n  Duration: ${duration} seconds\n  Frequency: ${frequency} pings/second\n  Average Size: ${size} bytes\n  Acceptable Delay: ${acceptableDelay}ms\n\nDetails:\n--------------\n`;
	document.getElementById("download-csv-with-summary").href = URL.createObjectURL(new Blob([summary + csv], {type: 'text/plain'}));
	document.getElementById("download-csv-with-summary").download = `packet-loss-test-results-${timestamp}.txt`;
	
	const json = JSON.stringify({
		totalPacketLoss: Math.round(failedCount / totalCount * 1000) / 1000,
		uploadPacketLoss: Math.round(upFailed.length / totalCount * 1000) / 1000,
		downloadPacketLoss: Math.round((failedCount - upFailed.length) / totalCount * 1000) / 1000,
		latePacketRate: Math.round(lateCount / totalCount * 1000) / 1000,
		averageLatency: Math.round(averageLatency * 100) / 100,
		averageJitter: Math.round(averageJitter * 100) / 100,
		settings: {
			duration: duration,
			frequency: frequency,
			size: size,
			acceptableDelay: acceptableDelay
		},
		details: data
	});
	document.getElementById("download-json").href = URL.createObjectURL(new Blob([json], {type: 'application/json'}));
	document.getElementById("download-json").download = `packet-loss-test-results-${timestamp}.json`;
	
	document.getElementById("download-results").classList.remove("disabled");
}