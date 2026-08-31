var idF=0;
var imageExtRegex = /\.(jpe?g|png|gif|webp|bmp|svg|avif)(\?.*)?$/i;

$.getJSON( "./data.json", function( data ) {
  for (var i = data.length - 1; i >= 0; i--) {
    var txtAppend = getHTMLContent(data[i]);
    $("#content").append(txtAppend);
  };
});

function escapeAttr(text) {
  return String(text == null ? "" : text).replace(/"/g, "&quot;");
}

function getMediaType(item) {
  if (item.mediaType) return item.mediaType;
  if (item.imageURL) return "image";
  return imageExtRegex.test(item.videoURL || "") ? "image" : "video";
}

function getMediaHTML(item, id) {
  var url = item.imageURL || item.videoURL || "";
  if (getMediaType(item) === "image") {
    return '<img id="IFURL'+id+'" class="img-responsive" src="'+escapeAttr(url)+'" alt="'+escapeAttr(item.name)+'" style="width:100%; height:auto;">';
  }
  return '<iframe id="IFURL'+id+'" width="100%" height="0.5px" src="'+escapeAttr(url)+'" frameborder="0" allowfullscreen></iframe>';
}

function getHTMLContent(item) {
  idF ++;
  var buttons = item.buttons || [];
  var buttonsHTML = "";
  for (var i = buttons.length - 1; i >= 0; i--) {
    buttonsHTML += '<a class="btn btn-primary" target="_blank" href="'+buttons[i].url+'">'+buttons[i].text+' <span class="glyphicon glyphicon-chevron-right"></span></a>&nbsp;&nbsp;&nbsp;';
  }
  var strReturn = '<div class="row" id="IDRow'+idF+'">    <div class="col-md-7" >'+getMediaHTML(item, idF)+'</div>    <div class="col-md-5">        <h3 style="margin-top: 0px;">'+item.name+'</h3>        <h4>'+item.platform+'</h4>        <p>'+item.description+'</p>      '+buttonsHTML+'   </div></div><hr>';
  if (getMediaType(item) === "video") {
    strReturn += '<script>  $("#IFURL'+idF+'").height( $("#IFURL'+idF+'").width()*9/16 ); </script>';
  }
  return strReturn;
}
