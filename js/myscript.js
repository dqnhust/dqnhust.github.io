$.getJSON( "data.json", function( data ) {
  alert(data.length);
  /*
  for (var i = data.length - 1; i >= 0; i--) {
    alert(data[i].name);
  };*/
});