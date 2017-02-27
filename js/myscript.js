alert("hihi");
$.getJSON( "./data.json", function( data ) {
  alert(data);
  /*
  for (var i = data.length - 1; i >= 0; i--) {
    alert(data[i].name);
  };*/
});