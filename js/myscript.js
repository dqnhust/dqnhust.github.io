$.getJSON( "./data.json", function( data ) {
  alert(data.age);
  /*
  for (var i = data.length - 1; i >= 0; i--) {
    alert(data[i].name);
  };*/
});