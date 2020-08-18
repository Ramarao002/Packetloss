const exec = require('child_process').exec;

function ter(){
    exec('node speedtester.js -j -v', (err, stdout, stderr) => {
     
            // the *entire* stdout and stderr (buffered)
            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);
    })
}
ter()