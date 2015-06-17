var renderer = null;
$(document).ready(function(){
	renderer = new Renderer();
	
	$('.widget').each(function(){
		var w = new Widget(this, { mapzoom : 13 });
			w.init();
	});
});