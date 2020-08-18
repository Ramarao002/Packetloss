process.chdir(__dirname);

const forever = require('forever-monitor');

var child = new (forever.Monitor)('app-unencrypted.js');

child.on('exit:code', function(code) {
	if (code === 12) {
		console.log(`${new Date()}: App restarting...`);
		child.restart();
	}
});

child.start();