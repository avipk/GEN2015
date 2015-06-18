/**
 * Renderer - Object for rendering JSON data to HTML using templates.
 **/
var Renderer = function(settings){
	var DIRECTIVE_PREFIX = '@@';
	var directives = {}; // Holds directive functions
	
	/**
	 * Render directive. combines a content with a template
	 * 
	 * @templateParam path - path inside the content (ex' : content.image.url)
	 * @templateParam templateId - id of template to render.
	 * 
	 * @return HTML string filled with the values from content
	 */
	directives['render'] = function(directiveParams, content){
		var templateParams = directiveParams.split(',');
		var contentPath = templateParams[0];
		var templateId = templateParams[1];
		var result = null;
		
		var value = extractContent(content, contentPath);
		
		if(value instanceof Array){ // if value is a list of content. render them all.
			result = renderContentArray(value, templateId);
		}else{
			result = renderContent(value, templateId);
		}
		
		return result; 	
	};
	
	/**
	 * If directive. Checks a condition and return an output if condition is true.
	 * 
	 * @templateParam condition - condition to check ( content==null [a JS condition] )
	 * @templateParam trueValue - output to return when condition is true.
	 * @templateParam falseValue if condition is true - output to return when condition is false.
	 * 
	 * @return trueValue if condition is true, falseValue if condition is false  
	 */
	directives['if'] = function(directiveParams, content){
		var templateParams = directiveParams.split(',');
		var condition = templateParams[0];
		var trueValue = templateParams[1];
		var falseValue = templateParams[2];
		var result = null;
		
		var conditionResult = !! eval(condition);
		
		if(conditionResult == true){
			result = trueValue;
		}else{
			result = falseValue;
		}
		
		return result;
	};
	
	/**
	 * if_render directive. Checks a condition and renders a template as a result.
	 * 
	 * @templateParam condition - condition to check ( content==null [a JS condition] )
	 * @templateParam path - path inside the content (ex' : content.image.url)
	 * @templateParam trueValue - output to return when condition is true.
	 * @templateParam falseValue if condition is true - output to return when condition is false.
	 * 
	 * @return rendered HTML according to the if condition.  
	 */
	directives['if_render'] = function(directiveParams, content){ 
		var templateParams = directiveParams.split(',');
		var condition = templateParams[0];
		var path = templateParams[1];
		var trueValue = templateParams[2];
		var falseValue = templateParams[3];
		var result = directives['if']([condition,trueValue,falseValue].join(','), content);
		var html = '';
		
		if(result){
			html = directives['render']([path,result].join(','), content);
		}
		return html;
	} 
	
	directives['imagepath'] = function(directiveParams, content){
		var templateParams = directiveParams.split(',');
		var contentPath = templateParams[0];		
		var derivative = templateParams[1];
		var imagePath = extractContent(content, contentPath);
		var result = null;
		
		if(derivative){
			result = imagePath.replace(/\/derivatives\/.+?\//, '/derivatives/' + derivative + '/');
		}else{
			result = imagePath.replace(/_gen\/.+/, '');
		}
		
		return result;		
	}

	/**
	 * Serialize text to URI encoded string. 
	 */
	directives['encodeURIComponent'] = function(directiveParams, content){
		var text = extractContent(content, directiveParams),
			encoded = '';
		
		if(typeof(text) == 'string'){
			encoded = encodeURIComponent(text);
		}
		return encoded;
	}
	
	/**
	 * Renders an array content elements.
	 **/
	function renderContentArray(contentList, templateId, params){		
		var html = '';
		for(var c=0; c < contentList.length; c++){
			html+= renderContent(contentList[c], templateId, params);
		}
		
		return html;
	}
	
	/**
	 * Renders a single content element
	 **/
	function renderContent(content, templateId, params){
		var template = $('#' + templateId); // get the HTML template.
		var html = template.html();
		var placeHolders = html.match(/\{content.*?\}/g);	   // find content values place holders.
			placeHolders = placeHolders ? placeHolders : [];
			
		// replace values placeholders with values.
		for(var ph=0; ph < placeHolders.length; ph++){
			var path = placeHolders[ph].substring(1, placeHolders[ph].length-1);
			var value = extractContent(content, path);
			
			html=html.replace(placeHolders[ph], value);
		}
		
		// replace directives commands with rendered HTML 
		var directivesPlaceHolders = html.match(/@@\w+\(content.*?\)/g);  // find directive commands in template(ex' : 'render', 'if')
			directivesPlaceHolders = directivesPlaceHolders ? directivesPlaceHolders : [];
		
		for(var directiveCommand=0;  directiveCommand < directivesPlaceHolders.length; directiveCommand++){
			var directiveCommandOutput = executeDirectiveCommand(directivesPlaceHolders[directiveCommand], content);
			html = html.replace( directivesPlaceHolders[directiveCommand],  (directiveCommandOutput || ''));
		}
				
		return html;
	}	

	function executeDirectiveCommand(directiveCommand, content){
		var directiveName = directiveCommand.substring( DIRECTIVE_PREFIX.length, directiveCommand.indexOf('('));
		var directiveParams = directiveCommand.substring( directiveCommand.indexOf('(')+1, directiveCommand.length-1);
		var directive = directives[directiveName];
		var result = null;
		
		if(directive){
			result = directive(directiveParams, content);
		}else{
			console.log('Error: parsing directive command "' + directiveCommand + '" .Directive with name "' + directiveName + '" not found.');
		}
		
		return result;
	}
		
	function extractContent(content, contentPath){
		var extractedContent = content;
		var paths = contentPath.split('.') ;
		var currentPath = paths[0];
				
		for(var p=1; p < paths.length; p++){ // Start from 1, assuming the first element is 'content'
			currentPath += '.' + paths[p];
			
			if( typeof extractedContent[ paths[p] ] !== 'undefined'){
			
				if( isRange(paths[p]) ){
					extractedContent = getRange(extractedContent, paths[p]);
				}else{
					extractedContent = extractedContent [ paths[p] ];			
				}
				
			}else{
				extractedContent = '';
				var contentStr = (content) ? JSON.stringify(content) : '';
				
				if(contentStr.length > 30 ){
					contentStr = contentStr.substring(0, 30) + '...';
				}
				console.error('path : "' + paths[p] + '" of "'  + currentPath + '" is undefined, in content "' + contentStr + '".');
				break;
			}
		}
		
		return extractedContent;
	}	
	
	/**
	 * Checks if a content-path includes array range
	 * Ex' : list[0] , articles[1-4]
	 **/
	function isRange(contentPath){
		var r = contentPath.match(/\[[0-9\-]+]/); // Regex to find : [ digit(s) - digit(s) ]
		var isRange = r !==null && r.length > 0;
		return isRange;
	}
	
	/**
	 * Get sub-set of array by a given range.
	 * Ex' : array[index] 		- get the content in the 'index' position.
	 *		 array[start-end]	- get sub-set cntent from 'start' index to 'end' index
	 *		 array[-end]		- get sub-set cntent from 0 index to 'end' index
	 *		 array[start-]		- get sub-set cntent from 'start' index to array length index
	 **/
	function getRange(content, path){	
		var contentPath = path.split('[')[0];
		var rangedContent = content[ contentPath ];
		
		if(rangedContent instanceof Array){
			var rangeExp = path.substring(path.indexOf('[')+1, path.length-1);
			var rangeBoundries = rangeExp.split('-');
			
			for(var b=0; b < rangeBoundries.length; b++){
				rangeBoundries[b] = parseInt(rangeBoundries[b]);
				
				if(isNaN(rangeBoundries[b])){
					switch(parseInt(b)){
						case 0:
							rangeBoundries[b] = 0;
							break;						
						case 1:
							rangeBoundries[b] = rangedContent.length-1;
							break;
					}
				}
			}
			
			if( rangeBoundries.length===1 ){
				rangedContent = rangedContent[ rangeBoundries[b] ];
			}else{
				rangedContent = rangedContent.slice(rangeBoundries[0], rangeBoundries[1]+1);
			}
			
		}
		
		return rangedContent; 
	}
	
	return {		
		"render" : function(content, templateId, params){			
			var html = '';
			if(content instanceof Array){
				html+= renderContentArray(content, templateId, params);
			}else{
				html+= renderContent(content, templateId, params);
			}
			
			return html;
		}
	}
}
var renderer = null;
$(document).ready(function(){
	renderer = new Renderer();
	
	$('.js-widget').each(function(){
		var w = new Widget(this, { mapzoom : 18,
								   mapPinsPath : 'images/mappins',
								   styles : [{"featureType":"administrative","elementType":"labels.text.fill","stylers":[{"color":"#444444"}]},{"featureType":"landscape","elementType":"all","stylers":[{"color":"#f2f2f2"}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"all","stylers":[{"saturation":-100},{"lightness":45}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road.arterial","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"all","stylers":[{"color":"#46bcec"},{"visibility":"on"}]}]
								 });
			w.init();
	});
	
	$('.related').on('click',function(){
		$('.related').toggleClass('closerelated');
	}); 
});
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
var Widget = function(obj, options){
	var map = null,
		layers = { 'polutionHeatmap' : new google.maps.visualization.HeatmapLayer({	
														'radius' : 70, 
														'opacity' : 1, 
														'gradient' : [ "rgba(255,255,0,0)", 
																	   "rgba(245,226,10,0)", 
																	   "rgba(245,226,10,0.5)", 
																	   "rgba(255,110,2,0.5)", 
																	   "rgba(255,110,2,1)", 
																	   "rgba(255,110,2,1)", 
																	   "rgba(255,110,2,1)", 
																	   "rgba(185,0,0,1)", 
																	   "rgba(185,0,0,1)", 
																	   "rgba(185,0,0,1)"] 
													}) },
		carsData = [],
		dom = obj,
		settings = options,		
		carpoolstate = { 'active' : false , 'type' : 'car' },
		commuterSearchState = false,
		carpool = null,
		commutersPool = null,
		that = this;
		
	that.api = {
		init : function(){			
			map = new google.maps.Map( dom.querySelector('.js-widget-map'), { 
				center : this.getUserLocation(),
				zoom: settings.mapzoom,
				styles : settings.styles
			} );			
			
			that.api.loadData();
			
			var heatmap_btn = dom.querySelector('.js-heatmap-toggle');
			
			heatmap_btn.addEventListener('click', function(){				
				var heatmap = layers['polutionHeatmap'];
				
				if(heatmap){
					heatmap.setMap( heatmap.getMap() ? null : that.api.getMap() );
				}
			});
			
			
			
			
			
			
			// Init Action buttons 
			var rebreath_btn = $(dom).find('.js-toggle-rebreath-menu');
			rebreath_btn.click( function(){
				$('#rebreath-menu').toggleClass('active');
			} );
						
			var simulate_btn = $(dom).find('.js-toggle-simulate-menu');
			simulate_btn.click( function(){
				$('#simulate-menu').toggleClass('active');
				
				if( $('#simulate-menu').hasClass('active')){					
					$('#select_number').show();
				}else{
					$('#select_number').fadeOut();
				}
			} );	
			
			var carpooling_btn = $(dom).find('.js-car-pool-toggle');
			carpooling_btn.click( function(){				
				carpoolstate.active = ! carpoolstate.active;
				carpoolstate.type = 'car';
				$(this).toggleClass('active');
				
				if( ! carpoolstate.active ){
					carpool = null;
				}
			});
			
			var buspooling_btn = $(dom).find('.js-bus-pool-toggle');
			buspooling_btn.click( function(){
				carpoolstate.active = ! carpoolstate.active;
				carpoolstate.type = 'bus';
				$(this).toggleClass('active');
				
				if( ! carpoolstate.active ){
					carpool = null;
				}
			});
			
			var commutersSearchToggle_btn = $(dom).find('.js-commuter-search-toggle');
			commutersSearchToggle_btn.click( function(){
				commuterSearchState = ! commuterSearchState;				
				$(this).toggleClass('active');
				
				if(! commuterSearchState){
					$('#commuters-search-form').hide();
					for(var i=0; i< carsData.length; i++){
						carsData[i].resetMarker();
					}
				}else{
					$('#commuters-search-form').show();
				}								
			});
			
			var commutersSearch_btn = $(dom).find('.js-commuter-search');
			commutersSearch_btn.click( function(){
			var from = $('#txtCommuterFrom').val();
				var to = $('#txtCommuterFrom').val();
				var time = $('#txtCommuterFrom').val();
				
				that.api.searchCommuters(from, to, time);
				
				$('#commuters-search-form').fadeOut();
			});
		},
		
		getUserLocation : function(){
			var location = new google.maps.LatLng(32.11896513512143, 34.87266540527344);
						
			return location;
			
		},
		
		addVehiclesToMap : function(vehicles){
			for(var i=0; i<vehicles.length; i++){				
				var v = new Vehicle({
						id : i,
						type : vehicles[i].type,
						model : vehicles[i].model,
						lnglat : new google.maps.LatLng	(vehicles[i].coordinates[1], vehicles[i].coordinates[0]),
						polution : vehicles[i].polution,
						onMyWay : vehicles[i].onMyWay,
						passengers : vehicles[i].passengers,
						widget : this
					});
				
				carsData.push(v);
			}
			
			that.api.updatePolutionHeatmap(carsData);
		}, 
		
		removeVehicleFromMap : function(vehicle){
			var indexOfVehicle = carsData.indexOf(vehicle);
			console.log(indexOfVehicle);
			if( indexOfVehicle > -1 ){
				carsData.splice(indexOfVehicle, 1);
				that.api.updatePolutionHeatmap(carsData);				
			}
		},
		
		addVehiclesToCarPool : function(vehicle){
			if(! carpool ){
				carpool = vehicle;
				carpool.setType( carpoolstate.type );
			}else{
				carpool.merge(vehicle);
				
				// End Car pooling
				if(carpool.passengers === carpool.type.sits){
					carpool = null;
					$(dom).find('.js-car-pool-toggle').click();				
				}
			}
		},
		
		addVehiclesToCommuters : function(vehicle){
			if(! commutersPool){
				commutersPool =[];
			}
			
			commutersPool.push(vehicle);
			vehicle.marker.setIcon( settings.mapPinsPath + '/commuter.png' );
		},
		
		updatePolutionHeatmap : function(carsData){
			var heatmapData = [];
			for(var i=0; i < carsData.length; i++){
				heatmapData.push( {
					'location' : carsData[i].lnglat,
					'weight' : carsData[i].polution
				} );
			}
			
			layers['polutionHeatmap'].setData(heatmapData);
		},
		
		searchCommuters: function(origin, destination, datetime){			
			for( var i=0; i< carsData.length; i++){				
				if(! carsData[i].isOnMyWay() ){
					carsData[i].marker.setOpacity(0.2);
					carsData[i].marker.setClickable(false);
				}
			}
			commutersPool = null; // empty commuters
		},
		
		getMap : function(){
			return map;			
		},
		
		getSettings : function(){
			return settings;			
		},
		
		getCarPoolingState : function(){
			return carpoolstate;
		},
		
		getCommuterSearchState : function(){
			return commuterSearchState;
		},
		
		loadData : function(){
			$.ajax({
				'url' : 'data/points.json',			
				'success' : function(data){					
					that.api.addVehiclesToMap(data.data);
				}
			});
		}
	};
	
	return that.api;
};