var VehicleTypes = {
	'CAR' : { 'name' : 'car', 
			  'sits' : 5 },
	'BUS' : { 'name' : 'bus', 
			  'sits' : 50 }
};

var Vehicle = function(options){	
	var vehicle = this;
	var infowindow = new google.maps.InfoWindow();
	
	function animateMerge(vToMerge){
		var vMergeMarker = vToMerge.marker;
		var vPos = vehicle.marker.getPosition();		
		var vMergePos = vMergeMarker.getPosition();
		var steps = 30;
		
		var deltaLat = (vPos.lat() - vMergePos.lat()) / steps;
		var deltaLng = (vPos.lng() - vMergePos.lng()) / steps;
		
		setTimeout( function(){
			animateMerge2(vMergeMarker, vPos, deltaLat, deltaLng, steps);
		}, 20);
		
	}
	
	function animateMerge2(marker, destinationPos, deltaLat, deltaLng, step){
		var newOriginPos = null;
		if(step == 0){
			marker.setMap(null);
		}else{
			newPos = new google.maps.LatLng( marker.getPosition().lat() + deltaLat, marker.getPosition().lng() + deltaLng);
			marker.setPosition(newPos);
			
			setTimeout( function(){
				animateMerge2(marker, destinationPos, deltaLat, deltaLng, (step - 1) );
			}, 20);
		}
	}
	
	function getMarkerIcon(){
		var iconName = vehicle.type.name.toLowerCase(),
			iconType = 'regular',
			iconFileName = vehicle.widget.getSettings().mapPinsPath;
		
		iconFileName += '/' + iconName + '-' + iconType + '.png';
		
		return iconFileName;
	}
		
	function setType(type){
		vehicle.type = VehicleTypes[ type.toUpperCase() ];
		if(vehicle.marker){
			vehicle.marker.setIcon( vehicle.getMarkerIcon() );
		}
		
		return vehicle.type;
	}
	
	this.id = options.id;
	this.type = setType( options.type );
	this.model = options.model;
	this.lnglat = options.lnglat;
	this.polution = options.polution;
	this.onMyWay = options.onMyWay;
	this.passengers = options.passengers;
	this.widget = options.widget;
	this.marker = new google.maps.Marker({
		position : options.lnglat,
		map : options.widget.getMap(),
		icon : getMarkerIcon()
	});
	
	this.getMarkerIcon = function(){
		return getMarkerIcon();
	}
	
	this.resetMarker = function(){
		this.marker.setOpacity(1);
		this.marker.setClickable(true);
		this.marker.setIcon( getMarkerIcon() );
	},
	
	this.removeFromMap = function(){
		this.marker.setMap(null); 
	}
	
	this.merge = function(vToMerge){
		var aviableSits = vehicle.type.sits - vehicle.passengers;
		var newPassengers = Math.min( vToMerge.passengers, aviableSits );
		vToMerge.passengers -= newPassengers;
		vehicle.passengers += newPassengers;
		
		if(vToMerge.passengers == 0){
			animateMerge(vToMerge);
			vehicle.widget.removeVehicleFromMap(vToMerge);
		}else{
			vToMerge.marker.setAnimation(google.maps.Animation.BOUNCE);
			setTimeout(function(){
				vToMerge.marker.setAnimation(null);
			}, 700 );
		}
	}
	
	this.isOnMyWay = function(vehicle){
		return this.onMyWay;
	},
	
	this.setType = function(type){
		setType(type);
	}
	
	google.maps.event.addListener(vehicle.marker, 'mouseover', function(){ 
		var html = null;
		if(vehicle.widget.getCarPoolingState().active){
			html = renderer.render(vehicle,'vehicle-carpolling-info-template');
		}else{
			html = renderer.render(vehicle,'vehicle-info-template'); // renderer defined in script.js			
		}
		infowindow.setContent(html);
		infowindow.open(vehicle.widget.getMap(), vehicle.marker);		
	});
	
	google.maps.event.addListener(vehicle.marker, 'mouseout', function(){ 
		infowindow.close();
	});
	
	google.maps.event.addListener(vehicle.marker, 'click', function(){ 
		if(vehicle.widget.getCarPoolingState().active){
			vehicle.widget.addVehiclesToCarPool(vehicle);
		}else if( vehicle.widget.getCommuterSearchState() ) {
			vehicle.widget.addVehiclesToCommuters(vehicle);
		}
	}); 
}