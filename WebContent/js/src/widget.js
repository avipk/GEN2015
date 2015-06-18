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