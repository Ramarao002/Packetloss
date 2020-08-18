$(document).ready(function () {
    $('#start').trigger('click');

    testdata();

    setInterval(() => {
        if($('#results').css('display')=='none'){
            $('.lg_box').css('display','block')
        }else{
            $('.lg_box').css('display','none')
        }
    }, 500);
})

function testdata() {
    // $('.loader').css('display', 'none');
    // $('.sm_box').css('display','block');
    $.ajax({
        url: "http://localhost:5000/net/test",
        type: "GET",
        async: true,
        success: function (res) {
            console.log(res);
            $('.loader').css('display', 'block');
            $('.sm_box').css('display','none');
            $('.downSpeed').text(res.download);
            $('.upSpeed').text(res.upload);
            $('.ping').text(res.ping);
            $('.ip_data').text(res.ipinfo.data.client.ip);
            $('.isp_data').text(res.ipinfo.data.client.isp);
            
            setTimeout(testdata(),10000);
            setTimeout(() => {
                $('#start').trigger('click');
            },10000 );
           
            var d = new Date($.now());
            var $tr = $('<tr />');
            $tr.append($("<td />", { text: res.download }))
            $tr.append($("<td />", { text: res.upload }))
            //$tr.append($("<td />", { text: res.ping }))
            $tr.append($("<td />",{text:$('#latency').text()}))
            $tr.append($("<td />",{text:$('#jitter').text()}))
            $tr.append($("<td />",{text:$('.pc_pcnt').text()}))
            $tr.append($("<td />", { text: res.ipinfo.data.client.isp }))
            $tr.append($("<td />", { text: d.getDate() + "-" + (d.getMonth() + 1) + "-" + d.getFullYear() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() }))
            $tr.appendTo('table');

        },
        error: function (err) {
            //$('.img-load').css('display','none');
            console.log(err);
        }
    });

   
}