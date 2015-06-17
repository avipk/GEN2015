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