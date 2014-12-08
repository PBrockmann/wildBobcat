/*
 ##########################################################################

 Patrick.Brockmann@lsce.ipsl.fr for Global Carbon Atlas
 Vanessa.Maigne@lsce.ipsl.fr    for Global Carbon Atlas
 Pascal.Evano@lsce.ipsl.fr      for Global Carbon Atlas

 PLEASE DO NOT COPY OR DISTRIBUTE WITHOUT PERMISSION

 ##########################################################################
 */

var Bobcat = Class.create( {
    initialize: function( parameters )
    {
        this.container = parameters.container ? parameters.container : "body";
        this.id = parameters.id;
        this.mapTitle = parameters.mapTitle ? parameters.mapTitle : "";
        this.displayContextuelMenu = parameters.displayContextuelMenu;
        this.displayIconesMenu = parameters.displayIconesMenu;
        this.callbackForParentClass = parameters.callback;
        // TODO : voir si on sort ces paramètres de Bobcat vers WMSInterface.js
        this.projection = parameters.projection;
        this.projectionBounds = parameters.projectionBounds;
        this.projectionIndex = parameters.projectionIndex;
        this.resource = parameters.resource;
        this.variable = parameters.variable;
        this.time = parameters.time;
        this.elevation = parameters.elevation;
        this.range = parameters.range;
        this.numberColorsBands = parameters.numberColorsBands;
        this.style = parameters.style;
        this.minx = parameters.minx;
        this.maxx = parameters.maxx;
        this.miny = parameters.miny;
        this.maxy = parameters.maxy;
        this.timeArray =  parameters.timeArray;
        this.elevationArray = parameters.elevationarray;
        this.centerMap = parameters.centerMap;
        this.zoomMap = parameters.zoomMap;

        this.synchronization = true;

        this.createMainMap();

    },


// **************************************************************
// ************************** MAP *******************************
// **************************************************************
    createMainMap: function()
    {
        this.createMapAndTitleDiv();
        this.createMap();
        this.createInnerLegend();
        if( this.displayContextuelMenu )
            this.createOrUpdateContextMenu();
        if( this.displayIconesMenu )
            this.createOrUpdateIconesMenu();
    },

    /**
     * This method create the div for the map and her title
     * When resizing, it will block the size to the legend one's if there's a legend and the title is overflow
     */
    createMapAndTitleDiv: function()
    {
        var mapDiv = $( '<div id="' + this.id + '" class="BCmap"></div>' );
        this.container.append( mapDiv );
	var mapTitleDiv = $( '<div class="BCmapTitle">' +
                '<div id="BCtitleMap' + this.id + '" class="BCmapSubTitle" title="' + this.mapTitle + '">' + this.mapTitle + '</div>' +
                '<div id="BCtitleMapShort' + this.id + '" class="BCmapSubTitleShort"></div></div>' );
        mapDiv.append( mapTitleDiv );
        this.updateMapShortTitle();
        var mapCloseDiv = $( '<div class="BCmapTitleIconeMenu"><img src="img/delete.png" title="Delete this map"></div>' );
        mapCloseDiv.on( "click", jQuery.proxy( function()
        {
            this.onClickRemoveMap();
        }, this ) );
        mapTitleDiv.append( mapCloseDiv );
        if( this.displayIconesMenu )
        {
            var mapIconeMenuDiv = $( '<div class="BCmapTitleIconeMenu"><img src="img/menu.png" title="Display menu"></div>' );
            mapIconeMenuDiv.on( "click", jQuery.proxy( function()
            {
                this.onClickShowIconeMenu();
            }, this ) );
            mapTitleDiv.append( mapIconeMenuDiv );
        }
        var mapForwardDiv = $( '<div id="BC' + this.id + 'ForwardIcone" class="BCmapTitleIconeMenu"><img src="img/forward.png" title="Display next time step"></div>' );
        mapForwardDiv.on( "click", jQuery.proxy( function()
        {
            this.onClickDisplayNextTimeStep();
        }, this ) );
        mapTitleDiv.append( mapForwardDiv );
        var mapRewindDiv = $( '<div id="BC' + this.id + 'RewindIcone" class="BCmapTitleIconeMenu"><img src="img/rewind.png" title="Display previous time step"></div>' );
        mapRewindDiv.on( "click", jQuery.proxy( function()
        {
            this.onClickDisplayPrevTimeStep();
        }, this ) );
        mapTitleDiv.append( mapRewindDiv );
	var mapSynchro = $( '<div id="BC' + this.id + 'SynchroIcone" class="BCmapTitleIconeMenu"><img src="img/sync_on.png" title="Desactivate pan/zoom synchronization"></div>' );
        mapSynchro.on( "click", jQuery.proxy( function()
        {
            this.onClickSynchronization();
        }, this ) );
        mapTitleDiv.append( mapSynchro );
        this.updateRewindAndForwardIcones( 0 );
    },

    createMap: function()
    {
        if( this.centerMap )
            var centerMap = this.centerMap;
        else 
	{
            var centerMap4326 = [this.minx + Math.abs( this.maxx - this.minx ) / 2, this.miny + Math.abs( this.maxy - this.miny ) / 2];
            var centerMap = new OpenLayers.LonLat( centerMap4326 ).transform( 'EPSG:4326', this.projection );
	}

        this.map = new OpenLayers.Map( this.id, {
            theme: null,
            controls: 
            [
               //new OpenLayers.Control.PanZoomBar( {panIcons: false} ),		// Simple Control.Zoom is enough, Control.PanZoombar too hight 
               new OpenLayers.Control.Zoom( {title: "Zoom in/out"} ),
               new OpenLayers.Control.Navigation(), 
               new OpenLayers.Control.LayerSwitcher( {title: "Show/Hide overlays"} )
            ],
            projection: new OpenLayers.Projection( this.projection ),
            maxExtent: new OpenLayers.Bounds( this.projectionBounds ),
            //tileSize:  new OpenLayers.Size(200,200),
	    center: centerMap,
            allOverlays: false,								// If true see WMS as a layer 
            numZoomLevels: 10
        } );

        this.addLayersToMap();
	if( this.zoomMap )
            this.map.zoomTo( this.zoomMap );
	else
        {
            //var zoomMap = this.map.getZoomForExtent( new OpenLayers.Bounds( [this.minx,this.miny,this.maxx,this.maxy] ).transform( 'EPSG:4326', this.projection ) );
            // If minx=-180,miny=-90,maxx=180,maxy=90 then problem with getZoomForExtent; return a wrong zoom level (Patrick) try following
            // var zoomMap = this.map.getZoomForExtent( new OpenLayers.Bounds( [-180,-90,180,90] ).transform( 'EPSG:4326', this.projection ) );
            // so use an epsillon (eps)
            var eps = 1E-2;	
            var zoomMap = this.map.getZoomForExtent( new OpenLayers.Bounds( [this.minx+eps,this.miny+eps,this.maxx-eps,this.maxy-eps] ).transform( 'EPSG:4326', this.projection ) );
            this.map.zoomTo( zoomMap );
        }

        // Styles
        $( this.map.viewPortDiv ).addClass( "BCmapWMS" );
        this.resizeMap();
    },

    resizeMap: function()
    {
	$( this.map.viewPortDiv ).width( $( "#" + this.id ).width() + "px" );
        $( this.map.viewPortDiv ).height( ($( "#" + this.id ).height() - $( ".BCmapTitle" ).height() / 2 - 3) + "px" );
	//$( "#" + this.id ).width( "400px" );
        //$( "#" + this.id ).height( "400px" );
        var legendHeight = Math.min( $( "#" + this.id ).height()  - $( ".BCmapTitle" ).height() / 2 - 3, this.legendHeightInit );
        $( "#BClegendImg" + this.id ).css( "height", legendHeight + "px" );
        $( "#BClegend" + this.id ).css( "top", -legendHeight + "px" );

        this.map.updateSize();
    },

    onClickRemoveMap: function()
    {
        $( "#" + this.id ).remove();
        this.callbackForParentClass( ["removeMap", this.id] );
    },

    addLayersToMap: function()
    {
        // Layers
        var polarGraticule = this.getGraticulePolar();
        var worldVector = this.getWorldVector();
        var worldMaskLand = this.get_landMaskLayer();
        var worldMaskOcean = this.get_oceanMaskLayer();
        var worldFrontiers = this.get_frontiersLayer();
        this.getWMS1();

        switch( this.projection )
        {
            case "EPSG:32661" :             // North Polar Stereographic
                this.map.addLayers( [this.wms1, worldVector, polarGraticule] );
                break;
            case "EPSG:32761" :             // South Polar Stereographic
                this.map.addLayers( [this.wms1, worldVector, polarGraticule] );
                break;
            case "EPSG:3857" :              // Spherical Mercator
                this.wms1.wrapDateLine = true;
                this.map.addLayers( [this.wms1, worldMaskOcean, worldMaskLand, worldFrontiers] );
                break;
        }
    },


// **************************************************************
// ************************ LEGEND ******************************
// **************************************************************
    createInnerLegend: function()
    {
	var legendDiv = $( '<div id="BClegend' + this.id + '" class="BClegend"></div>' );
        var imgSrc = "<img id='BClegendImg" + this.id + "' width='100%' src='" + this.resource + "&REQUEST=GetLegendGraphic" + "&LAYER=" + this.variable
                + "&PALETTE=" + this.style + "&COLORSCALERANGE=" + this.range + "&NUMCOLORBANDS=" + this.numberColorsBands
                + "' alt=''/>";
        legendDiv.html( imgSrc );
        $( '#' + this.id ).append( legendDiv );
        $( '#BClegend' + this.id ).on( 'dblclick', jQuery.proxy( function ()
        {
            this.onClickHideLegend();
        }, this ) );
	$( "#BClegendImg" + this.id ).load( jQuery.proxy( function()
        {
            this.legendHeightInit = $( "#BClegendImg" + this.id )[0].height;
        }, this ) );
    },

    onClickShowOrHideLegend: function( isShow )
    {
	$( "#BCiconeMenu" + this.id ).hide();	
        var legendHeight = Math.min( $( "#" + this.id ).height() - $( ".BCmapTitle" ).height() / 2 - 3, this.legendHeightInit );
        $( '#BClegendImg' + this.id ).height( legendHeight );
        $( '#BClegend' + this.id ).css( "top", -legendHeight + "px" );
        if( isShow )
            $( '#BClegend' + this.id ).fadeIn( jQuery.proxy( function()
            {
                this.callbackForParentClass( ["updateLegendButtons", ""] );
                this.createOrUpdateContextMenu();
                this.createOrUpdateIconesMenu();
            }, this ) );
        else
            $( '#BClegend' + this.id ).fadeOut( jQuery.proxy( function()
            {
                this.callbackForParentClass( ["updateLegendButtons", ""] );
                this.createOrUpdateContextMenu();
                this.createOrUpdateIconesMenu();
            }, this ) );
    },

    onClickShowLegend: function()
    {
        this.onClickShowOrHideLegend( true );
    },

    onClickHideLegend: function()
    {
        this.onClickShowOrHideLegend( false );
    },


// **************************************************************
// ************************ MENUS *******************************
// **************************************************************
    getOptionsForContextMenu: function( showLegend )
    {
        var items = new Array();
	items.push( {text: "Init map", icon: "img/maximize.png", alias: "initMap", action: jQuery.proxy( this.onClickInitZoom, this )} );
        if( showLegend )
            items.push( { text: "Show legend", icon: "img/legend_display.png", alias:"showLegend", action: jQuery.proxy( this.onClickShowLegend, this )} );
        else
            items.push( { text: "Hide legend", icon: "img/legend_hide.png", alias:"hideLegend", action: jQuery.proxy( this.onClickHideLegend, this )} );
        items.push( { text: "Export to kmz", icon: "img/GoogleEarth-icon.png", alias:"googleearth", action: jQuery.proxy( this.onClickExportToKMZ, this )} );
        items.push( {text: "Access to Metadata", icon: "img/information.png", alias: "linkmetadata", action: jQuery.proxy( this.onClickDisplayMetadataInfo, this )} );

	    return { width: 200, items: items};
    },

    createOrUpdateContextMenu: function()
    {
        var isLegendHidden = $( "#BClegend" + this.id ).is( ":hidden" );
        var option = this.getOptionsForContextMenu( isLegendHidden );
	var menuTitleDiv = $( '<div class="BCcontainerTitle BCmenuTitleClose"><div class="BCcontainerTitleText">Menu </div><div class="BCcontainerTitleClose"><img src="img/close.png"></div></div>' );
        $( "#" + this.id ).contextmenu( option, "BCrightMenu" + this.id, menuTitleDiv, true );
    },

    createOrUpdateIconesMenu: function()
    {
        $( "#BCiconeMenu" + this.id ).fadeOut( function()
        {
            $( this ).remove();
        } );
        var iconeMenuDiv = $( '<div id="BCiconeMenu' + this.id + '" class="BCiconeMenu"></div>' );
	$( "#" + this.id ).append( iconeMenuDiv );

        var iconeInitZoom = $( '<div class="BCiconeForMenu"><div class="BCiconeForMenuImage"><img src="img/maximize.png"></div><div class="BCIconeForMenuTitle">&nbsp;Init map</div></div>' );
        iconeInitZoom.on( "click", jQuery.proxy( function()
        {
            this.onClickInitZoom();
            $( "#BCiconeMenu" + this.id ).fadeOut();
        }, this ) );
        iconeMenuDiv.append( iconeInitZoom );

	var isLegendHidden = $( "#BClegend" + this.id ).is( ":hidden" );
        if( isLegendHidden )
        {
            var iconeShowLegend = $( '<div class="BCiconeForMenu"><div class="BCiconeForMenuImage"><img src="img/legend_display.png"></div><div class="BCIconeForMenuTitle">&nbsp;Show legend</div></div>' );
            iconeShowLegend.on( "click", jQuery.proxy( this.onClickShowLegend, this ) );
            iconeMenuDiv.append( iconeShowLegend );
        }
        else
        {
            var iconeHideLegend = $( '<div class="BCiconeForMenu"><div class="BCiconeForMenuImage"><img src="img/legend_hide.png"></div><div class="BCIconeForMenuTitle">&nbsp;Hide legend</div></div>' );
            iconeHideLegend.on( "click", jQuery.proxy( this.onClickHideLegend, this ) );
            iconeMenuDiv.append( iconeHideLegend );
        }
        var iconeGoogle = $( '<div class="BCiconeForMenu"><div class="BCiconeForMenuImage"><img src="img/GoogleEarth-icon.png"></div><div class="BCIconeForMenuTitle">&nbsp;Export to kmz</div></div>' );
        iconeGoogle.on( "click", jQuery.proxy( function()
        {
            this.onClickExportToKMZ();
            $( "#BCiconeMenu" + this.id ).fadeOut();
        }, this ) );
        iconeMenuDiv.append( iconeGoogle );
        var iconeMetadata = $( '<div class="BCiconeForMenu"><div class="BCiconeForMenuImage"><img src="img/information.png"></div><div class="BCIconeForMenuTitle">&nbsp;Access to Metadata</div></div>' );
        iconeMetadata.on( "click", jQuery.proxy( function()
        {
            this.onClickDisplayMetadataInfo();
            $( "#BCiconeMenu" + this.id ).fadeOut();
        }, this ) );
        iconeMenuDiv.append( iconeMetadata );
    },

    onClickShowIconeMenu: function()
    {
        $( '#BCiconeMenu' + this.id ).slideToggle(200);
	$( '#BCiconeMenu' + this.id ).css( "top", -$( "#" + this.id ).height() + $( ".BCmapTitle" ).height() / 2 + "px" );
	var isLegendHidden = $( "#BClegend" + this.id ).is( ":hidden" );
        if( !isLegendHidden )
            $( '#BCiconeMenu' + this.id ).css( "right", -$( '#BClegendImg' + this.id ).width() + "px" );
    },


// **************************************************************
// ************************ EVENTS ******************************
// **************************************************************
    onClickExportToKMZ: function()
    {
	// ncWMS expose center of boxes and not boundaries --> if not treated then there is a missing part at the wrapline
        // so treat this very special case waiting changes in ncWMS
        if( this.minx == -179.5 && this.miny == -89.5 && 179.5 == this.maxx && 89.5 == this.maxy )
        {
            this.minx = -180;
            this.miny = -90;
            this.maxx = 180;
            this.maxy = 90;
        }

       var selectitem = "";
       var selectoption = "";
       for (var i=0;i<this.timeArray.length;i++) {
		if (this.timeArray[i] == this.time) 
			selectoption='<option value='+this.timeArray[i]+' selected>'+this.timeArray[i]+'</option>';
                else
			selectoption='<option value='+this.timeArray[i]+'>'+this.timeArray[i]+'</option>';
		selectitem=selectitem+selectoption;
       }

       var message = $( '<div></div>' )
               .html( '<select id="timeselector" multiple="multiple" style="width: 220px; height: 100px;">'
			+ selectitem
			+'</select>' )
               .dialog(
           {
               modal: true,
               autoOpen: false,
               position: [20,50],
               buttons: {
                   "Export": jQuery.proxy( function()
                   {
                       var timeselectedvals = new Array ();
                       $("#timeselector option:selected").each(function() {
                            timeselectedvals.push($(this).val());
                       } );
                       var timeselectedvals_parameter=timeselectedvals.toString().split(',');
                       //alert("kmz creation with TIME="+timeselectedvals_parameter);
                       // get and combine but no tiles reload
                       var kmz = this.wms1.getFullRequestString( { 
	                   BBOX: this.minx + ',' + this.miny + ',' + this.maxx + ',' + this.maxy,
                           TIME: timeselectedvals_parameter,
                           FORMAT: 'application/vnd.google-earth.kmz',
                           TRANSPARENT: 'true',
                           SRS: 'EPSG:4326',
                           WIDTH: '500', HEIGHT: '500' } );		// should be proposed as user choices
                       window.location.href=kmz;
                       //window.location.open(href=kmz,target="_blank");
                   }, this ), 
                   "Cancel": function()
                   {
                       $('#timeselector').remove();			// it is important to remove this id created into the dialog message 
                       $( this ).dialog( "close" );			// to get correct $("#timeselector option:selected") 
                   }
               },
               title: "Export to kmz",
               height: 300,
               width: 250
           } );
       message.dialog( 'open' );
    },

    onClickDisplayMetadataInfo: function()
    {
        // TODO
        alert( "Work in progress" );
    },

    onClickInitZoom: function()
    {
	var centerMap4326 = [this.minx + Math.abs( this.maxx - this.minx ) / 2, this.miny + Math.abs( this.maxy - this.miny ) / 2];
       	var centerMap = new OpenLayers.LonLat( centerMap4326 ).transform( 'EPSG:4326', this.projection );
        //var zoomMap = this.map.getZoomForExtent( new OpenLayers.Bounds( [this.minx,this.miny,this.maxx,this.maxy] ).transform( 'EPSG:4326', this.projection ) );
        // If minx=-180,miny=-90,maxx=180,maxy=90 then problem with getZoomForExtent; return a wrong zoom level (Patrick) try following
        // var zoomMap = this.map.getZoomForExtent( new OpenLayers.Bounds( [-180,-90,180,90] ).transform( 'EPSG:4326', this.projection ) );
        // so use an epsillon (eps)
        var eps = 1E-2;	
        var zoomMap = this.map.getZoomForExtent( new OpenLayers.Bounds( [this.minx+eps,this.miny+eps,this.maxx-eps,this.maxy-eps] ).transform( 'EPSG:4326', this.projection ) );
        this.map.setCenter( centerMap, zoomMap );
    },

    onClickSynchronization: function()
    {
        this.synchronization = !this.synchronization;
        if( this.synchronization )
            $( "#BC" + this.id + "SynchroIcone" ).html( '<img src="img/sync_on.png" title="Desactivate pan/zoom synchronization"></div>' );
        else
            $( "#BC" + this.id + "SynchroIcone" ).html( '<img src="img/sync_off.png" title="Activate pan/zoom synchronization"></div>' );
    },


// **************************************************************
// *********************** ANIMATIONS ***************************
// **************************************************************
    onClickDisplayPreviousOrNextTime: function(isNext)
    {
        var index = this.timeArray.indexOf(this.time);
        var condition = isNext ? (index < this.timeArray.length && index != -1) :  (0 < index && index != -1);
        if (condition)
        {
            if(isNext)
                index++;
            else
                index--;
            // combine but no tiles reload
            this.wms1.mergeNewParams({ TIME: this.timeArray[index]  });
            this.time = this.timeArray[index] ;
	    this.updateMapShortTitle();
        }
        this.updateRewindAndForwardIcones(index);
    },

    onClickDisplayNextTimeStep: function()
    {
        if($("#BC"+this.id+"ForwardIcone").attr("disabled"))
            return;
        this.onClickDisplayPreviousOrNextTime(true);
    },

    onClickDisplayPrevTimeStep: function( argument )
    {
        if($("#BC"+this.id+"RewindIcone").attr("disabled"))
            return;
        this.onClickDisplayPreviousOrNextTime(false);
    },

    updateRewindAndForwardIcones: function( index )
    {
        if( 0 == this.timeArray.length )
        {
            $( "#BC" + this.id + "ForwardIcone" ).attr( "disabled", true );
            $( "#BC" + this.id + "RewindIcone" ).attr( "disabled", true );
        }
        else if( index + 1 >= this.timeArray.length )
        {
            $( "#BC" + this.id + "ForwardIcone" ).attr( "disabled", true );
            $( "#BC" + this.id + "RewindIcone" ).attr( "disabled", false );
        }
        else if( 0 == index )
        {
            $( "#BC" + this.id + "ForwardIcone" ).attr( "disabled", false );
            $( "#BC" + this.id + "RewindIcone" ).attr( "disabled", true );
        }
        else
        {
            $( "#BC" + this.id + "ForwardIcone" ).attr( "disabled", false );
            $( "#BC" + this.id + "RewindIcone" ).attr( "disabled", false );
        }
    },


// **************************************************************
// ************************ LAYERS ******************************
// **************************************************************

    getGraticulePolar: function()
    {
        return new OpenLayers.Layer.Vector(
            "Graticule grid", {
            isBaseLayer: false,
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP( {
                url: "graticule_global_10deg.kml",
                format: new OpenLayers.Format.KML( {} )
            } ),
            styleMap: new OpenLayers.StyleMap( {
                "default": {
                    fillColor: "none",
                    fillOpacity: 0,
                    strokeColor: "grey",
                    strokeWidth: 1,
                    strokeOpacity: 1
                }
            } ),
            projection: new OpenLayers.Projection( "EPSG:4326" )
        } );
    },

    getWorldVector: function()
    {
        return new OpenLayers.Layer.Vector(
            "Frontiers", {
            isBaseLayer: false,
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP( {
                url: "limite_monde.kml",
                format: new OpenLayers.Format.KML( {} )
            } ),
            styleMap: new OpenLayers.StyleMap( {
                "default": {
                    fillColor: "none",
                    fillOpacity: 0,
                    strokeColor: "black",
                    strokeWidth: 1,
                    strokeOpacity: 1
                }
            } ),
            projection: new OpenLayers.Projection( "EPSG:4326" )
        } );
    },

    get_landMaskLayer: function()
    {
     return new OpenLayers.Layer.WMS(
       "Land mask",
       "http://webportals.ipsl.jussieu.fr:8080/geoserver/GCA/wms",
   	{
           VERSION: '1.1.1',
           LAYERS: "GCA:GCA_landMask",
   	   transparent: true,
           FORMAT: 'image/png'
       }, {
           isBaseLayer: false,
           opacity: 1,
           visibility: false 
       } );
   },
   		
    get_oceanMaskLayer: function()
    {
     return new OpenLayers.Layer.WMS(
       "Ocean mask",
       "http://webportals.ipsl.jussieu.fr:8080/geoserver/GCA/wms",
   	{
           VERSION: '1.1.1',
           LAYERS: "GCA:GCA_oceanMask",
   	   transparent: true,
           FORMAT: 'image/png'
       }, {
           isBaseLayer: false,
           opacity: 1,
	   visibility: false 
       } );
   },
   		
    get_frontiersLayer: function()
    {
        return new OpenLayers.Layer.WMS(
                "Frontiers",
                "http://www.globalcarbonatlas.org:8080/geoserver/GCA/wms",
        {
            VERSION: '1.1.1',
            LAYERS: "GCA:GCA_frontiersCountryAndRegions",
            transparent: true,
            FORMAT: 'image/png',
        }, {
            isBaseLayer: false,
            opacity: 1,
            visibility: true 
        } );
    },

    getWMS1: function()
    {
	 this.wms1 = new OpenLayers.Layer.WMS(
            "Variable",
            this.resource, {
                //VERSION: '1.3.0',		// does not work with projection other than 3857 ???
                VERSION: '1.1.1',
                LAYERS: this.variable,
                ELEVATION: this.elevation,
                TIME: this.time,
                NUMCOLORBANDS: this.numberColorsBands,
                STYLES: 'boxfill/' + this.style,
                COLORSCALERANGE: this.range,
                ABOVEMAXCOLOR: 'extend',
                BELOWMINCOLOR: 'extend',
                FORMAT: 'image/png'
            }, {
                isBaseLayer: true,
                opacity: 1
            } );
    },


// **************************************************************
// ************************* OTHER ******************************
// **************************************************************
    basename: function( path )
    {
        return path.replace( /.*\//, "" );
    },

    updateMapShortTitle: function()
    {
	var formatedDate = "No time";
        if( this.time )
        {	
		var format = getFormatDate(this.timeArray);
	        var calendarConverter = new AnyTime.Converter( { format: format } );
		var newTime = new Date(this.time);
		var formatedTime = new Date(newTime.getUTCFullYear(), newTime.getUTCMonth(), newTime.getUTCDate(), newTime.getUTCHours(), newTime.getUTCMinutes(), newTime.getUTCSeconds());
	        var formatedDate = calendarConverter.format( formatedTime );
	}

        if( this.elevation && null != this.elevation )
            formatedDate += ' / ' + parseFloat( this.elevation ).toFixed( 2 );
        $( "#BCtitleMapShort" + this.id ).html( formatedDate );
        $( "#BCtitleMapShort" + this.id ).attr( "title", formatedDate );
    }

});

function getFormatDate( timeArray )
{
    var yearArray = new Array();
    var monthArray = new Array();
    var dayArray = new Array();
    var hourArray = new Array();
    var minuteArray = new Array();
    var secondArray = new Array();

    // TODO : revoir l'extraction des tableaux selon les dates, via un format, une matrice, ....
    jQuery.each( timeArray, function( i, element )
    {
        var time = new Date( element );
        if( jQuery.inArray( time.getUTCFullYear(), yearArray ) == -1 )
            yearArray.push( time.getUTCFullYear() );
        if( jQuery.inArray( time.getUTCMonth(), monthArray ) == -1 )
            monthArray.push( time.getUTCMonth() );
        if( jQuery.inArray( time.getUTCDate(), dayArray ) == -1 )
            dayArray.push( time.getUTCDate() );
        if( jQuery.inArray( time.getUTCHours(), hourArray ) == -1 )
            hourArray.push( time.getUTCHours() );
        if( jQuery.inArray( time.getUTCMinutes(), minuteArray ) == -1 )
            minuteArray.push( time.getUTCMinutes() );
        if( jQuery.inArray( time.getUTCSeconds(), secondArray ) == -1 )
            secondArray.push( time.getUTCSeconds() );
    } );

    if( 1 < secondArray.length )
        return "%Y-%m-%d %H:%i:%s";
    else if( 1 < minuteArray.length )
        return "%Y-%m-%d %H:%i";
    else if( 1 < hourArray.length )
        return "%Y-%m-%d %H:%i";                                      // Hours always with minutes
    else if( 1 < dayArray.length )
        return "%Y-%m-%d";
    else if( 1 < monthArray.length )
        return "%Y-%M";
    else if( 1 < yearArray.length )
        return "%Y";
}
