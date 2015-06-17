var Vehicle = function(options){	
	var vehichle = this;
	var infowindow = null;
	
	this.type = options.type;
	this.model = options.model;
	this.lnglat = options.lnglat;
	this.polution = options.polution;
	this.isOnMyWay = options.isOnMyWay;
	this.passengers = options.passengers;
	this.sits = options.sits;
	this.widget = options.widget;
	this.marker = new google.maps.Marker({
		position : options.lnglat,
		map : options.widget.getMap()
	});
	
	google.maps.event.addListener(vehichle.marker, 'click', function(){ 
		if(! infowindow){
			var html = renderer.render(vehichle,'vehicle-info-template'); // renderer defined in script.js
			infowindow = new google.maps.InfoWindow();
			infowindow.setContent(html);
		}
		
		infowindow.open(vehichle.widget.getMap(), vehichle.marker);		
	}); 
}