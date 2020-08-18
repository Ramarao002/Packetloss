"use strict";

self.onmessage = event => ((interval, duration) => {
	let now = performance.now();
	const endTime = now + duration;
	let nextTime = now + interval;
	while (now < endTime) {
		if (now >= nextTime) {
			postMessage({ send: true });
			nextTime += interval;
		}
		now = performance.now();
	}
})(event.data.interval, event.data.duration);