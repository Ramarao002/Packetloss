"use strict"

var unsupported = "";
if (typeof RTCPeerConnection !== "function")
	unsupported = '<a href="https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection"><code>RTCPeerConnection()</code></a>';
else if (typeof RTCPeerConnection.prototype.createDataChannel !== "function")
	unsupported = '<a href="https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel"><code>RTCPeerConnection.prototype.createDataChannel()</code></a>';
//else if (!(() => { try { eval("class A { b; }"); return true; } catch(e) {} })())
//	unsupported = '<a href="https://github.com/tc39/proposal-class-fields">fields</a> (to make progress circle thingies the right colors)';
if (unsupported) {
	var thingsToDisable = document.querySelectorAll('input, select, button');
	for (var i = 0; i < thingsToDisable.length; i++)
		thingsToDisable[i].disabled = true;
	document.querySelector("main").insertBefore(document.createElement("section"), document.querySelector("#settings")).innerHTML = "<h2>Browser Incompatibility Detected</h2> \
	<p>Hello, I appreciate you attempting to try my site, but I'm afraid to say that it will not work in your browser.</p> \
	<p>Specifically, this requires the use of " + unsupported + ', which your browser does not implement.</p> \
	<p>You could use <a href="https://iperf.fr/">iPerf</a> to measure your network condition, but regardless, I would recommend upgrading browsers. Below are some solid options you could download that sufficiently support WebRTC:</p> \
	<a href="https://brave.com/pac383" title="Brave Browser"><img src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/48.0.4/brave/brave_48x48.png" alt="Brave Logo" /></a> \
	<a href="https://www.google.com/chrome/" title="Google Chrome"><img src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/48.0.4/chrome/chrome_48x48.png" alt="Chrome Logo" /></a> \
	<a href="https://www.mozilla.org/en-US/firefox/" title="Mozilla Firefox"><img src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/48.0.4/firefox/firefox_48x48.png" alt="Firefox Logo" /></a> \
	<a href="https://vivaldi.com/" title="Vivaldi"><img src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/48.0.4/archive/vivaldi/vivaldi_48x48.png" alt="Vivaldi Logo" /></a> \
	<p>All logos and trademarks are the property of their respective owners.</p>';
}
window.onerror = function (message) {
	if (!unsupported) {
		errorContent.innerHTML =
			"<p>Sorry, some error occurred. Hopefully I'll fix this soon, but you might wanna let me know just in case.</p> \
			<hr> \
			<p>" + message + "</p>";
		errorSection.style.display = "block";
	}
};