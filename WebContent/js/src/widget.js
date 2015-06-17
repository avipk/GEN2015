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
		that = this;
		
	that.api = {
		init : function(){			
			map = new google.maps.Map( dom.querySelector('.widget__map'), { 
				center : this.getUserLocation(),
				zoom: settings.mapzoom
			} );			
			
			that.api.loadData();
			
			// ****  remove this later  *****
			var heatmap_btn = dom.querySelector('.widget__heatmap-toggle');
			
			heatmap_btn.addEventListener('click', function(){
				
				var heatmap = layers['polutionHeatmap'];
				
				if(heatmap){
					heatmap.setMap( heatmap.getMap() ? null : that.api.getMap() );
				}
			});
		},
		
		getUserLocation : function(){
			var location = new google.maps.LatLng(32.11896513512143, 34.87266540527344);
						
			return location;
			
		},
		
		addVehiclesToMap : function(vehicles){
			for(var i=0; i<vehicles.length; i++){
				var v = new Vehicle({
						type : vehicles[i].type,
						model : vehicles[i].model,
						lnglat : new google.maps.LatLng	(vehicles[i].coordinates[1], vehicles[i].coordinates[0]),
						polution : vehicles[i].polution,
						isOnMyWay : vehicles[i].isOnMyWay,
						passengers : vehicles[i].passengers,
						sits : vehicles[i].sits,
						widget : this
					});
				
				carsData.push(v);
			}
			
			that.api.updatePolutionHeatmap(carsData);
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
		
		getMap : function(){
			return map;			
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