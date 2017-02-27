var idF=0;
$.getJSON( "./data.json", function( data ) {
  for (var i = data.length - 1; i >= 0; i--) {
    var txtAppend = getHTMLContent(data[i].name, data[i].videoURL, data[i].platform, data[i].description, data[i].buttons);
    $("#content").append(txtAppend);
  };
});

function getHTMLContent(name, videoURL, platform, description, buttons) {
  idF ++;
  var buttonsHTML = "";
  for (var i = buttons.length - 1; i >= 0; i--) {
    buttonsHTML += '<a class="btn btn-primary" target="_blank" href="'+buttons[i].url+'">'+buttons[i].text+' <span class="glyphicon glyphicon-chevron-right"></span></a>';
  }
  var strReturn = '<div class="row" id="IDRow'+idF+'">    <div class="col-md-7" ><iframe id="IFURL'+idF+'" width="1px" height="1px" src="'+videoURL+'" frameborder="0" allowfullscreen></iframe></div>    <div class="col-md-5">        <h3>'+name+'</h3>        <h4>'+platform+'</h4>        <p>'+description+'</p>      '+buttonsHTML+'   </div></div><hr>';
  strReturn += '<script>  $("#IFURL'+idF+'").height( $("#IDRow'+idF+'").height() ); </script>';
  return strReturn;
}