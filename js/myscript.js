$.getJSON( "./data.json", function( data ) {
  for (var i = data.length - 1; i >= 0; i--) {
    var txtAppend = getHTMLContent(data[i].name, data[i].videoURL, data[i].platform, data[i].description, data[i].buttons);
    $("#content").append(txtAppend);
  };
});

function getHTMLContent(name, videoURL, platform, description, buttons) {
  var buttonsHTML = "";
  for (var i = buttons.length - 1; i >= 0; i--) {
    buttonsHTML += '<a class="btn btn-primary" href="'+buttons[i].url+'">'+buttons[i].text+' <span class="glyphicon glyphicon-chevron-right"></span></a>';
  }
  return '<div class="row">    <div class="col-md-7">        <video src = "'+videoURL+'"> </video>    </div>    <div class="col-md-5">        <h3>'+name+'</h3>        <h4>'+platform+'</h4>        <p>'+description+'</p>      '+buttonsHTML+'   </div></div><hr>';
}