/*
 ##########################################################################

 Patrick.Brockmann@lsce.ipsl.fr for Global Carbon Atlas
 Pascal.Evano@lsce.ipsl.fr      for Global Carbon Atlas
 Vanessa.Maigne@lsce.ipsl.fr    for Global Carbon Atlas

 PLEASE DO NOT COPY OR DISTRIBUTE WITHOUT PERMISSION

 ##########################################################################
 */

var BCInterface = Class.create( {

    initialize: function()
    {
        // Parameters
        this.resourceDiv = $( "#resource" );
        this.resourceArray = new Array();
        this.variableDiv = $( "#variable" );
        this.timeDiv = $( "#time" );
        this.getRangeDiv = $( "#getRange" );
        this.elevationDiv = $( "#elevation" );
        this.submitButton = $( "#submitCreateMap" );

        // Variables
        this.hashBobcats = new Hashtable();
        this.selectedBobcat = false;
        this.n = 0;
	this.leftMenuInitWidth = $( "#toolsContent" ).width();
	this.nonPrintableInitWidth = $( "#non-printable" ).width();
        this.printableInitHeight = $( "#printable" ).height();

 	this.timeArray = Array();
        this.elevationArray = Array();

        this.createSliders();
        this.bindTools()
        this.bindVariable();
	this.bindNumberMaps();
	this.bindPalettes();
        this.bindRange();
        this.resizePrintable();

        $( "#ProjectionArrow" ).click();
        $( "#ElevationArrow" ).click();
        this.onClickResource();
    },


// **************************************************************
// ************************** MAP *******************************
// **************************************************************
    createMap: function( id )
    {
        if( this.hashBobcats.size() )
        {
            var firstOpenLayerMap = this.hashBobcats.get( this.hashBobcats.keys( 0 )[0] ).map;
            this.centerMap = firstOpenLayerMap.getCenter();
            this.zoomMap = firstOpenLayerMap.getZoom();
        }
	var mapTitle = this.basename( this.resourceDiv.val()[0] ).split( '.' )[0] + ' / ' + this.variableDiv.val();

        var options = {container: $( '#printable' ),
            id: id,
            mapTitle: mapTitle,
            projection: $( "#projection" ).val(),
            resource: this.resourceDiv.val()[0],
            variable: this.variableDiv.val(),
            time: this.timeDiv.val(),
            elevation: this.elevationDiv.val(),
            range: $( "#slider-range-text" ).val().replace(/[\]\[]/g,''),
            numberColorsBands: $( "#slider-nbcolorbands-text" ).val(),
            palette: $( "#palette" ).val(),
            centerMap: this.centerMap,
            zoomMap: this.zoomMap,
            minx: this.minx,
            maxx: this.maxx,
            miny: this.miny,
            maxy: this.maxy,
	    timeArray: this.timeArray,
            elevationArray : this.elevationArray,
            callback:jQuery.proxy( this.eventFilter, this ),
            displayContextuelMenu: true,
            displayIconesMenu: true
        };

        this.selectedBobcat = new Bobcat( options );
        this.hashBobcats.put( id, this.selectedBobcat );
        this.selectBobcat( this.selectedBobcat.id );

        // Bind events
	this.selectedBobcat.map.events.register( "zoomend", this.selectedBobcat.map, jQuery.proxy( this.handleZoom, this.selectedBobcat.map ), true );
	this.selectedBobcat.map.events.register( "moveend", this.selectedBobcat.map, jQuery.proxy( this.synchronizeMaps, [this, this.selectedBobcat.map] ), false );
	this.selectedBobcat.map.events.register( "touchend", this.selectedBobcat.map, jQuery.proxy( function( arguments )
        {
            this.selectBobcat( arguments.object.div.id );
        }, this ), true );
        this.selectedBobcat.map.events.register( "mouseover", this.selectedBobcat.map, jQuery.proxy( function( arguments )
        {
            this.selectBobcat( arguments.object.div.id );
        }, this ), true );

       this.resizeAllMaps();
    },

    selectBobcat: function( id )
    {
        this.selectedBobcat = this.hashBobcats.get( id );
        $( ".BCmap" ).removeClass( "selected" );
	if( this.selectedBobcat )
        	$( "#" + this.selectedBobcat.id ).addClass( "selected" );
    },

    handleZoom: function()
    {
    switch( this.getZoom() )
    {
    	case 0:
    		$( ".olControlZoomIn" ).css( "pointer-events", "auto" );
    		$( ".olControlZoomIn" ).css( "background-color", "" );
    		$( ".olControlZoomOut" ).css( "pointer-events", "none" );
    		$( ".olControlZoomOut" ).css( "background-color", "#8F8F8F" );
    		//$(".olControlZoomOut").css("opacity", "0.4"); // Could have been used but nicer with background-color
    		break;
    	case 7: // 8 levels
    		$( ".olControlZoomIn" ).css( "pointer-events", "none" );
    		$( ".olControlZoomIn" ).css( "background-color", "#8F8F8F" );
    		$( ".olControlZoomOut" ).css( "pointer-events", "auto" );
    		$( ".olControlZoomOut" ).css( "background-color", "" );
    		break;
    	default:
    		$( ".olControlZoomIn" ).css( "pointer-events", "auto" );
    		$( ".olControlZoomIn" ).css( "background-color", "" );
    		$( ".olControlZoomOut" ).css( "pointer-events", "auto" );
    		$( ".olControlZoomOut" ).css( "background-color", "" );
    	}
    },

    /**
     *This method synchronize all maps. We have to keep in memory (context and argument) the moved map and the selected Bobcat to allow synchronize only when selectedBobcat and movedMap are similar.
     * Otherwise each synchronize start the "moveend" event (n*n synchronize instead of only n)
     */
    synchronizeMaps: function()
    {
        var context = this[0];
        var movedMap = this[1];

        if( context.selectedBobcat.id == movedMap.div.id && context.selectedBobcat.synchronization )
        {
            context.hashBobcats.each( jQuery.proxy( function( key )
            {
		if( context.hashBobcats.get( key ).synchronization )
	                context.hashBobcats.get( key ).map.setCenter( context.selectedBobcat.map.getCenter(), context.selectedBobcat.map.getZoom() );
            }, this ) );
        }
    },

    resizeAllMaps: function()
    {
        this.resizePrintable();
        this.resizeMaps($( "#printable" ).width());
	$( ".BCiconeMenu" ).hide();
    },

    resizeMaps: function( widthForMaps )
    {

	if( 1 > this.hashBobcats.keys().length )
		return;

	this.mapsNumber = this.selectMapsNumber.getValue();
	var newWidth = Math.round( Math.max( widthForMaps / this.hashBobcats.keys().length, widthForMaps / this.mapsNumber ) ) - 3 * this.mapsNumber;
	var newWidth = Math.round( newWidth / 4 ) * 4; // Prepare map width to host 4 tiles

	var linesNumber = Math.ceil( this.hashBobcats.keys().length / this.mapsNumber );
	var newHeight = (this.printableInitHeight / linesNumber) - 30;
	this.hashBobcats.each( jQuery.proxy( function( key )
	{
		$( "#" + key ).css( "width", newWidth + "px" );
		$( "#" + key ).css( "height", newHeight + "px" );
		this.hashBobcats.get( key ).resizeMap();
	}, this ) );

    },

    onClickDeleteMap:function( id )
    {
        this.hashBobcats.remove( id );
        this.resizeAllMaps();
        this.updateLegendButtons();
	if( 0 == this.hashBobcats.size() )
            this.centerMap = false;
    },

    onClickDeleteAllMaps:function()
    {
        this.hashBobcats.each( jQuery.proxy( function( key )
        {
            this.hashBobcats.remove( key );
        }, this ) );

        $( ".BCmap" ).fadeOut( 500, jQuery.proxy( function( element )
        {
            $( ".BCmap" ).remove();
            this.updateLegendButtons();
        }, this ) );

        // Remove right menus
        $( ".b-m-mpanel" ).remove();

        this.n = 0;
	this.centerMap = false;
    },


// **************************************************************
// ************************* LEGEND *****************************
// **************************************************************
    updateLegend: function()
    {
        $( "#legend" ).html( "<img id='legendImg' width='90px' height='177px' src='"
                + this.resourceDiv.val()[0]
                + "&REQUEST=GetLegendGraphic"
                + "&LAYER=" + $( "#variable" ).val()
                + "&PALETTE=" + $( "#palette" ).val()
                + "&COLORSCALERANGE=" + $( "#slider-range-text" ).val().replace(/[\]\[]/g,'')
                + "&NUMCOLORBANDS=" + $( "#slider-nbcolorbands-text" ).val()
                + "' alt=''/>" );
    },


// **************************************************************
// *********************** RESOURCES ****************************
// **************************************************************
    onClickResource: function()
    {
        this.resourceArray = new Array();
        this.submitButton.attr( "disabled", false );
        $( "#resource" + " option:selected" ).each( jQuery.proxy( function( i, element )
        {
            this.resourceArray.push( element.value );
        }, this ) );
        this.createVariables();
    },


// **************************************************************
// *********************** VARIABLES ****************************
// **************************************************************
    createVariables: function()
    {
        this.previousVar = this.variableDiv.val();
        this.variableDiv.empty();
        this.variableDiv.append( '<option>Updating...</option>' );
        this.createAllVariables( 0, new Array(), new Array() );
    },

    createAllVariables: function( i, allVariableNames, allVariableNamesAndTitles )
    {
        if( i < this.resourceArray.length )
        {
            var url = this.resourceArray[i] + "&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities";

            this.getVariables( url, i, allVariableNames, allVariableNamesAndTitles );
        }
        else
        {
            this.variableDiv.empty();
            if( 0 == allVariableNames.length )
            {
                this.fillVariablesError();
                return;
            }

            jQuery.each( allVariableNames, jQuery.proxy( function( i, variableName )
            {
                if( "" != allVariableNamesAndTitles[i] )
                    this.variableDiv.append( '<option value="' + variableName + '" title="' + allVariableNamesAndTitles[i] + '">' + allVariableNamesAndTitles[i] + '</option>' );
                else
                    this.variableDiv.append( '<option value="' + variableName + '" title="' + variableName + '">' + variableName + '</option>' );

            }, this ) );

            this.selectElement( "variable", this.previousVar );
            this.variableDiv.change();
        }
    },

    getVariables: function( url, i, allVariableNames, allVariableNamesAndTitles )
    {
        $.ajax( {
            type: "GET",
            url: url,
            dataType: "xml",
            timeout: 8000,                  // to valid
            success: jQuery.proxy( function( response )
            {
                this.getVariablesSuccess( response, i, allVariableNames, allVariableNamesAndTitles );
            }, this ),
            error: jQuery.proxy( function()
            {
                this.getVariablesError( i, allVariableNames, allVariableNamesAndTitles );
            }, this )
        } );
    },

    getVariablesSuccess: function( data, i, allVariableNames, allVariableNamesAndTitles )
    {
        $( data ).find( 'Layer' ).each( jQuery.proxy( function( i, element )
        {
            // Select <Layer queryable="1"> from XML
            if( '1' == $( element ).attr( 'queryable' ) )
            {
                var variableName = $( element ).children( "Name" ).text();
                if( variableName && -1 == jQuery.inArray( variableName, allVariableNames ) )
                {
                    allVariableNames.push( variableName );
                    // Add Title information if different from Name
                    if( $( element ).children( "Name" ).text() != $( element ).children( "Title" ).text() )
                    {
                        var variableNameAndTitle = $( element ).children( "Name" ).text() + ' (' + $( element ).children( "Title" ).text() + ')';
                        allVariableNamesAndTitles.push( variableNameAndTitle );
                    }
                    else
                        allVariableNamesAndTitles.push( "" );
                }
            }
        }, this ) );
        i++;
        this.createAllVariables( i, allVariableNames, allVariableNamesAndTitles );
    },

    getVariablesError: function( i, allVariableNames, allVariableNamesAndTitles )
    {
        i++;
        this.createAllVariables( i, allVariableNames, allVariableNamesAndTitles );
    },

    fillVariablesError: function()
    {
        var message = $( '<div></div>' )
                .html( "Unable to read file" )
                .dialog(
            {
                modal: true,
                autoOpen: false,
                position: [20,50],
                buttons: {
                    Ok: function()
                    {
                        $( this ).dialog( "close" );
                    }
                },
                title: "Message",
                height: 150,
                width: 250
            } );
        message.dialog( 'open' );
        this.variableDiv.empty();
        this.variableDiv.append( '<option value="">None</option>' );
        $( "#VariableContainer" ).attr( "disabled", true );
        this.elevationDiv.empty();
        this.elevationDiv.append( '<option value="">None</option>' );
        $( "#ElevationContainer" ).attr( "disabled", true );
        this.timeDiv.empty();
        this.timeDiv.append( '<option value="">None</option>' );
        $( "#TimeContainer" ).attr( "disabled", true );
    },

    bindVariable: function()
    {
        this.variableDiv.on( "change", jQuery.proxy( function ( event )
        {
            //this.submitButton.attr( "disabled", true );
            var previousTime = this.timeDiv.val();
            var previousElevation = this.elevationDiv.val();
            this.timeDiv.empty();
            this.timeDiv.append( '<option>Updating...</option>' );
            this.elevationDiv.empty();
            this.elevationDiv.append( '<option>Updating...</option>' );

            var url = this.resourceDiv.val()[0] + "&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities";
	    console.log(url);

            this.getTimesAndElevations( url, previousTime, previousElevation );
        }, this ) );
    },


// **************************************************************
// ******************* TIMES & ELEVATIONS ***********************
// **************************************************************
    getTimesAndElevations: function( url, previousTime, previousElevation )
    {
        $.ajax( {
            type: "GET",
            url: url,
            dataType: "xml",
            success: jQuery.proxy( function( response )
            {
                this.fillTimesAndElevationsSuccess( response, previousTime, previousElevation );
            }, this ),
            error: jQuery.proxy( function()
            {
                this.fillTimesAndElevationsError();
            }, this )
        } );
    },

    fillTimesAndElevationsSuccess: function( data, previousTime, previousElevation )
    {
        this.timeDiv.empty();
        this.timeArray = [];
        this.elevationDiv.empty();
        this.elevationArray = [];
        $( data ).find( 'Layer' ).each( jQuery.proxy( function( i, layer )
        {
            // Select <Layer queryable="1"> and <Name>variable</Name> and <Dimension name="time"> and <Dimension name="elevation">
            if( ('1' == $( layer ).attr( 'queryable' )) && ($( layer ).children( "Name" ).text() == this.variableDiv.val()) )
            {
                this.isElevation = false;
                this.isTime = false;
                $( layer ).children( 'Dimension' ).each( jQuery.proxy( function( i, child )
                {
                    switch( $( child ).attr( "name" ) )
                    {
                        case "time" :
                            var timearraytext = $( child ).text();
                            this.timeArray = $.trim( timearraytext ).split( ',' );
                            jQuery.each( this.timeArray, jQuery.proxy( function( i, val )
                            {
                                this.timeDiv.append( '<option value="' + val + '">' + val + '</option>' );
                            }, this ) );
                            this.isTime = true;
                            this.selectElement( "time", previousTime );
                            break;

                        case "elevation" :
                            var elevationarraytext = $( child ).text();
                            this.elevationArray = $.trim( elevationarraytext ).split( ',' );
                            jQuery.each( this.elevationArray, jQuery.proxy( function( i, val )
                            {
                                this.elevationDiv.append( '<option value="' + val + '">' + val + '</option>' );
                            }, this ) );
                            this.isElevation = true;
                            this.selectElement( "elevation", previousElevation );
                            break;
                    }
                }, this ) );
                if( $( layer ).children( 'BoundingBox' ) )
                {
                    this.minx = parseFloat( $( layer ).children( 'BoundingBox' ).attr( 'minx' ) );
                    this.maxx = parseFloat( $( layer ).children( 'BoundingBox' ).attr( 'maxx' ) );
                    this.miny = parseFloat( $( layer ).children( 'BoundingBox' ).attr( 'miny' ) );
                    this.maxy = parseFloat( $( layer ).children( 'BoundingBox' ).attr( 'maxy' ) );
                }
                if( !this.isElevation )
                {
                    $( "#ElevationContainer" ).attr( "disabled", true );
                    this.elevationDiv.append( '<option value="">None</option>' );
                }
                else
                    $( "#ElevationContainer" ).attr( "disabled", false );
                if( !this.isTime )
                {
                    $( "#TimeContainer" ).attr( "disabled", true );
                    this.timeDiv.append( '<option value="">None</option>' );
                }
                else
                    $( "#TimeContainer" ).attr( "disabled", false );
                this.submitButton.attr( "disabled", false );     // Allow again creation of map
            }
        }, this ) );
        if( $( "#autoRange" ).is( ':checked' ) ) 
		this.getRangeDiv.click();
	else
	        this.updateLegend();
    },

    fillTimesAndElevationsError: function()
    {
        var message = $( '<div></div>' )
                .html( "Unable to get Dimension Time or Elevation" )
                .dialog(
            {
                modal: true,
                autoOpen: false,
                position: [20,50],
                buttons: {
                    Ok: function()
                    {
                        $( this ).dialog( "close" );
                    }
                },
                title: "Message",
                height: 150,
                width: 250
            } );
        message.dialog( 'open' );
        $( "#ElevationContainer" ).attr( "disabled", true );
        this.elevationDiv.empty();
        this.elevationDiv.append( '<option value="">None</option>' );
        $( "#TimeContainer" ).attr( "disabled", true );
        this.timeDiv.empty();
        this.timeDiv.append( '<option value="">None</option>' );
    },


// **************************************************************
// ************************* RANGE ******************************
// **************************************************************
    bindRange: function()
    {
        this.getRangeDiv.on( "click", jQuery.proxy( function ( event )
        {
            this.submitButton.attr( "disabled", true );
            var previousRange = $( "#slider-range-text" ).val();
            $( "#slider-range-text" ).val( "Updating..." );

            var url = this.resourceDiv.val()[0]
                    + "&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMetadata&item=minmax&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=200&HEIGHT=200"
                    + "&TIME=" + this.timeDiv.val()
                    + "&ELEVATION=" + this.elevationDiv.val()
                    + "&LAYERS=" + this.variableDiv.val();

            this.getRange( url, previousRange );
        }, this ) );
    },

    getRange: function( url, previousRange )
    {
        $.ajax( {
            type: "GET",
            url: url,
            dataType: "json",
            success: jQuery.proxy( function( response )
            {
                this.fillRangeSuccess( response, previousRange );
            }, this ),
            error: jQuery.proxy( function()
            {
                this.fillRangeError( previousRange );
            }, this )
        } );
    },

    fillRangeSuccess: function( data, previousRange )
    {
        var max = data.max;
        if( 1 > Math.abs( max ) )
            max = Math.ceil( max * 10 ) / 10;  // 1 digit after .
        else if( 10 > Math.abs( max ) )
            max = Math.ceil( max );             // ceil
        else
            max = Math.ceil( max / 10 ) * 10;  // about ten
        var min = data.min;
        if( 1 > Math.abs( min ) )
            min = Math.floor( min * 10 ) / 10;
        else if( 10 > Math.abs( min ) )
            min = Math.floor( min );
        else
            min = Math.floor( min / 10 ) * 10;

        var step = (max - min) / 20;                 // slider divided into 20 steps
        if( 1 > Math.abs( step ) )
            step = Math.floor( step * 10 ) / 10;
        else if( 10 > Math.abs( step ) )
            step = Math.floor( step );
        else
            step = Math.floor( step / 10 ) * 10;

        $( "#slider-range" ).slider( "option", "step", step );
        $( "#slider-range" ).slider( "option", "values", [min,max] );
        $( "#slider-range-text" ).val( '[' + $( "#slider-range" ).slider( "values", 0 ) + "," + $( "#slider-range" ).slider( "values", 1 ) + ']' );
        this.getRangeDiv.blur();
        this.updateLegend();
        this.submitButton.attr( "disabled", false );     // Allow again creation of map
    },

    fillRangeError: function( previousRange )
    {
        $( "#slider-range-text" ).val( previousRange );
        this.getRangeDiv.blur();
        var message = $( '<div></div>' )
                .html( "Unable to get range" )
                .dialog(
            {
                modal: true,
                autoOpen: false,
                position: [20,50],
                buttons: {
                    Ok: function()
                    {
                        $( this ).dialog( "close" );
                    }
                },
                title: "Message",
                height: 150,
                width: 250
            } );
        message.dialog( 'open' );
    },


// **************************************************************
// ************************ SLIDERS *****************************
// **************************************************************
    createSliders: function()
    {
        // Color slider
        $( "#slider-range" ).slider( {
            range: true,
            min: -1000,
            max: 1000,
            step: 5,
            values: [-50, 50],
            slide: jQuery.proxy( function ( event, ui )
            {
                $( "#slider-range-text" ).val( '[' + ui.values[0] + ',' + ui.values[1] + ']' );
                this.updateLegend();
		$( "#autoRange" ).attr( 'checked', false );
            }, this )
        } );
        $( "#slider-range-text" ).val( '[' + $( "#slider-range" ).slider( "values", 0 ) 
                                                     + "," + $( "#slider-range" ).slider( "values", 1 ) 
                                                     + ']' );
	$( "#slider-range-text" ).on( "change", function()
        {
            var valuesArray = $( "#slider-range-text" ).val().replace( "[", "" ).replace( "]", "" ).split( "," );
            $( "#slider-range" ).slider( "option", "values", [valuesArray[0],valuesArray[1]] );
        } );


        $( "#slider-nbcolorbands" ).slider( {
            value: 30,
            min: 5,
            max: 200,
            step: 5,
            slide: jQuery.proxy( function ( event, ui )
            {
                $( "#slider-nbcolorbands-text" ).val( ui.value );
                this.updateLegend();
            }, this )
        } );
        $( "#slider-nbcolorbands-text" ).val( $( "#slider-nbcolorbands" ).slider( "value" ) );
    },


// **************************************************************
// *********************** NUMBER MAPS **************************
// **************************************************************
	bindNumberMaps: function()
	{
		$( "#selectMapsNumber" ).on( 'click', jQuery.proxy( function( event )
		{
			this.mapsNumber = this.selectMapsNumber.getValue();
			this.resizeAllMaps();
		}, this ) );
	},

// **************************************************************
// *********************** PALETTES ****************************
// **************************************************************
	bindPalettes: function()
	{
		$( "#palette" ).on( 'click', jQuery.proxy( function( event )
		{
			this.palette = $( "#palette" ).val();
			this.updateLegend();
		}, this ) );
	},

// **************************************************************
// ************************* BIND *******************************
// **************************************************************
    bindTools: function()
    {
	// Bind select resource
        $( "#resource" ).on( 'click', jQuery.proxy( function ()
        {
            this.onClickResource();
        }, this ) );

        // Create map button
        this.submitButton.click( jQuery.proxy( function ( event )
        {
            if( this.submitButton.attr( "disabled" ) )
                return;
            this.onClickSubmit();
        }, this ) );

        $( "#submitDeleteMaps" ).click( jQuery.proxy( function ( event )
        {
            this.onClickDeleteAllMaps();
        }, this ) );

        $( "#submitShowAllLegends" ).click( jQuery.proxy( function ( event )
        {
            this.onClickShowAllLegends();
        }, this ) );

        $( "#submitHideAllLegends" ).click( jQuery.proxy( function ( event )
        {
            this.onClickHideAllLegends();
        }, this ) );

        // Change palette
        $( "#palette" ).on( 'change', jQuery.proxy( function ()
        {
            this.updateLegend();
        }, this ) );

        // Click on title box to slide up or down a box
        $( ".containerTitle" ).on( "click", jQuery.proxy( function( argument )
        {
		$( argument.currentTarget.nextElementSibling ).slideToggle();
        }, this ) );

        // Create select maps number
        var paramSelect = new Object();
        paramSelect.parent = $( "#selectMapsNumber" );
        this.selectMapsNumber = new Select( paramSelect );
        this.selectMapsNumber.add( 1, 1, jQuery.proxy( this.onClickSelectMapsNumber, this ) );
        this.selectMapsNumber.add( 2, 2, jQuery.proxy( this.onClickSelectMapsNumber, this ) );
        this.selectMapsNumber.add( 3, 3, jQuery.proxy( this.onClickSelectMapsNumber, this ) );
        this.selectMapsNumber.add( 4, 4, jQuery.proxy( this.onClickSelectMapsNumber, this ) );
        this.selectMapsNumber.add( 5, 5, jQuery.proxy( this.onClickSelectMapsNumber, this ) );
        this.selectMapsNumber.select( 2, false );

	// Slide left menu
        $( "#hideOrShowToolsContent" ).on( "click", jQuery.proxy( function()
        {
            var newWidth = $( "#toolsContent" ).width() == this.leftMenuInitWidth ? "10" : this.leftMenuInitWidth;
            var displayLeftMenu = newWidth == this.leftMenuInitWidth;
            if( displayLeftMenu )
                this.onClickShowLeftMenu();
            else
                this.onClickHideLeftMenu();
        }, this ) );

	window.onresize = jQuery.proxy( function( event )
        {
            this.printableInitHeight = $( "#printable" ).height();
            this.resizeAllMaps();
        }, this );
    },


// **************************************************************
// ************************* EVENT ******************************
// **************************************************************
    eventFilter:function( arguments )
    {
        var eventChild = arguments[0];
        var id = arguments[1];
        switch( eventChild )
        {
            case "removeMap":
                this.onClickDeleteMap( id );
                break;
            case "updateLegendButtons":
                this.updateLegendButtons();
                break;
        }
    },

    onClickSubmit: function()
    {
        var id = 'id' + this.n;
        this.updateLegend();
        this.createMap( id );
        this.n++;
        this.updateLegendButtons();
    },

    onClickShowAllLegends: function()
    {
        this.hashBobcats.each( jQuery.proxy( function( key )
        {
            this.hashBobcats.get( key ).onClickShowLegend();
        }, this ) );
        this.updateLegendButtons();
    },

    onClickHideAllLegends: function()
    {
        this.hashBobcats.each( jQuery.proxy( function( key )
        {
            this.hashBobcats.get( key ).onClickHideLegend();
        }, this ) );
        this.updateLegendButtons();
    },

    onClickSelectMapsNumber: function()
    {
        this.resizeAllMaps();
    },

    onClickShowLeftMenu: function()
    {
        var newWidth = $( "#pageWrapper" ).width() - this.nonPrintableInitWidth;

        this.resizeMaps( newWidth );
        $( "#printable" ).animate( {width: newWidth}, 200 );

        $( "#toolsContent" ).animate( {
            width: this.leftMenuInitWidth + "px"
        }, 200, jQuery.proxy( function()
        {
            $( "#toolsContent" ).fadeIn();
        }, this ) );
    },

    onClickHideLeftMenu: function()
    {
        $( "#toolsContent" ).fadeOut( jQuery.proxy( function()
        {
            $( "#toolsContent" ).animate( {
                width: "10px"
            }, 200, jQuery.proxy( function()
            {
                var newWidth = $( "#pageWrapper" ).width() - $( "#non-printable" ).width();
                $( "#printable" ).animate( {width: newWidth}, 200, jQuery.proxy( function()
                {
                    this.resizeMaps( newWidth );
                }, this ) );
            }, this ) );
        }, this ) );
    },


// **************************************************************
// ************************* OTHER ******************************
// **************************************************************
    basename: function( path )
    {
        return path.replace( /.*\//, "" );
    },

    selectElement: function( selectId, previousValue )
    {
        // select previous option if exists in new options else select first
        $( "#" + selectId + " option[value='" + previousValue + "']" ).attr( 'selected', 'selected' );
        if( !$( "#" + selectId ).val() )
            $( "#" + selectId + " option:first" ).attr( 'selected', 'selected' );
    },

    updateLegendButtons: function()
    {
        var isMoreLegend = (1 <= $( ".BClegend" ).size());
        if( isMoreLegend )
        {
            if( 0 == $( ".BClegend:visible" ).length )
            {
                $( "#submitShowAllLegends" ).attr( "disabled", false );
                $( "#submitHideAllLegends" ).attr( "disabled", true );
            }
            else if( 0 == $( ".BClegend:hidden" ).length )
            {
                $( "#submitShowAllLegends" ).attr( "disabled", true );
                $( "#submitHideAllLegends" ).attr( "disabled", false );
            }
            else
            {
                $( "#submitShowAllLegends" ).attr( "disabled", false );
                $( "#submitHideAllLegends" ).attr( "disabled", false );
            }
        }
        else
        {
            $( "#submitShowAllLegends" ).attr( "disabled", true );
            $( "#submitHideAllLegends" ).attr( "disabled", true );
        }
    },

    resizePrintable: function()
    {
        $( "#printable" ).width( $( "#pageWrapper" ).width() - $( "#non-printable" ).width() -16 );
    }

} );



