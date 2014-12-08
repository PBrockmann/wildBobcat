//********************************************************
// Class Select
// Display a Select
//
// use jQuery
// obj objParam: {id, [parent], [specificClass], [maxOptionSize], [isDisable], [isDisplayed]}
//    int objParam.id: id of the dom element
//    [dom objParam.parent]: in which dom element to draw the button
//    [str objParam.specificClass]
//    [int objParam.maxOptionSize]: define a max number of line to display
//    [int objParam.isDisable]: is the Select disable by default?
//    [int objParam.isDisplayed]: is the Select opened by default?
//
// Public functions
//    Select.getValue
//    Select.getName
//    Select.disable
//    Select.enable
//    Select.add
//    Select.remove
//    Select.clear
//    Select.select
//    Select.selectFirst
//********************************************************

var Select = Class.create( {

    // Public functions ********************************************************

    initialize: function( objectParameter )
    {
        // Param
        this.id = objectParameter.id;
        this.parent = objectParameter.parent ? objectParameter.parent : document.body;
        this.isDisplayed = objectParameter.isDisplayed ? objectParameter.isDisplayed : false;
        this.isDisable = objectParameter.isDisable ? objectParameter.isDisable : false;
        this.maxOptionSize = objectParameter.maxOptionSize ? objectParameter.maxOptionSize : 0;
        this.indexOption = 0;
        this.isHover = false;
        this.arrayOptions = $();
        this.className = objectParameter.className ? "select_container " + objectParameter.className : "select_container";
        this.classNameOption = objectParameter.classNameOption ? "select_choicelist " + objectParameter.classNameOption : "select_choicelist";
        this.callback = objectParameter.callback ? objectParameter.callback : false;

        // Variables
        this.itemValues = $();

        // Select div
        this.divSelect = $( document.createElement( "div" ) );
        this.divSelect.attr( {id:this.id, class:this.className} );

        this.divSelectLeft = $( document.createElement( "div" ) )
        this.divSelectLeft.addClass( "select_selectLeft" );
        this.divSelect.append( this.divSelectLeft );

        this.divSelectMiddle = $( document.createElement( "div" ) )
        this.divSelectMiddle.addClass( "select_selectMiddle" );
        this.divSelect.append( this.divSelectMiddle );

        this.divSelectRight = $( document.createElement( "div" ) )
        this.divSelectRight.addClass( "select_selectRight" );
        this.divSelect.append( this.divSelectRight );

        this.parent.append( this.divSelect );

        // Options div
        this.divOption = $( document.createElement( "div" ) )
        this.divOption.addClass( this.classNameOption );
        this.parent.append( this.divOption );

        this.divSelect.bind( "mouseup", this, this.toggleOption );
        this.divSelect.bind( 'mouseover', this, this.onMouseHover );
        this.divSelect.bind( 'mouseout', this, this.onMouseOut );
        this.divOption.bind( 'mouseover', this, this.onMouseHover );
        this.divOption.bind( 'mouseout', this, this.onMouseOut );
        this.parent.bind( 'mouseleave', this, this.onMouseParentOut );

        if( this.isDisplayed )
            this.showOption();

        if( this.isDisable )
            this.hideOption();
    },

    getName: function()
    {
        return this.itemName;
    },

    getValue: function()
    {
        return this.itemValue;
    },

    getValue2: function()
    {
        return this.itemValue2;
    },

    getValues: function()
    {
        return this.itemValues;
    },

    getSize: function()
    {
        return this.arrayOptions.size();
    },

    // private
    toggleOption:function( event )
    {
        var contextEvent = event.data;
        if( contextEvent.isDisplayed )
        {
            contextEvent.isHover = false;
            contextEvent.hideOption();
        }
        else
            contextEvent.showOption();
    },

    // private
    showOption:function()
    {
        if( this.isDisable )
            return;

        this.isDisplayed = true;
        this.displayOptions();
        this.divOption.show();
    },

    // private
    hideOption: function()
    {
        if( this.isHover )
            return;

        this.isDisplayed = false;
        this.divOption.hide();
    },

    // public
    disable: function()
    {
        this.isDisable = true;
        this.divSelect.addClass( "disable" );
        this.hideOption();
        /* Nath*/
        this.divSelectMiddle.removeClass( "select_selectMiddle" );
        this.divSelectMiddle.addClass( "select_selectMiddle_disable" );
    },

    // public
    enable: function()
    {
        this.isDisable = false;
        this.divSelect.removeClass( "disable" );
        /* Nath*/
        this.divSelectMiddle.removeClass( "select_selectMiddle_disable" );
        this.divSelectMiddle.addClass( "select_selectMiddle" );
    },

    // public
    /**
     * This method indicates if the itemValue is already in the array
     */
    content: function( itemValue )
    {
        var result = false;
        jQuery.each( this.arrayOptions, jQuery.proxy( function( i, divOption )
        {
            if( divOption.itemValue == itemValue )
            {
                result = true;
                return false;
            }
        }, this ) );
        return result;
    },
    // public
    add: function( itemValue, itemName, callback, itemValue2 )
    {
        var divOptionMiddle = $( document.createElement( "div" ) );
        divOptionMiddle.attr( {id:"option_" + itemValue, class: "select_item_middle" } );
        divOptionMiddle.html( itemName );
        divOptionMiddle.itemName = itemName;
        divOptionMiddle.itemValue = itemValue;
        if( itemValue2 )
            divOptionMiddle.itemValue2 = itemValue2;
        if( callback )
            divOptionMiddle.callback = callback;
        else if( this.callback )
            divOptionMiddle.callback = this.callback;
        this.divOption.append( divOptionMiddle );
        divOptionMiddle.bind( 'click', [this, divOptionMiddle], this.onOptionClick );

        this.arrayOptions.push( divOptionMiddle );
        this.itemValues.push( itemValue );
    },

    // public
    remove: function( itemValue )
    {
        jQuery.each( this.arrayOptions, jQuery.proxy( function( i, divOption )
        {
            if( divOption.itemValue == itemValue )
            {
                $( "#option_" + itemValue ).first().remove();
                var index = jQuery.inArray( divOption, this.arrayOptions );
                this.arrayOptions.splice( index, 1 );
                this.itemValues.splice( index, 1 );
                return false;
            }
        }, this ) );
    },

    // public
    clear: function()
    {
        this.divOption.empty();
        this.arrayOptions = $();
        this.itemValues = $();
    },

    // public
    /**
     * This method changes only the content of the divSelect without add the item to the array
     * @param itemValue
     * @param itemName
     * @param callback
     */
    changeSelectMiddle: function( itemValue, itemName, callback )
    {
        this.add( itemValue, itemName, callback );
        this.select( itemValue, callback );
        this.remove( itemValue );
    },

    // public
    // @itemValue : code of the selected line
    // @ execute : true / false. Execute the callback.
    select: function( itemValue, execute )
    {
        jQuery.each( this.arrayOptions, jQuery.proxy( function( i, divOption )
        {
            if( divOption.itemValue == itemValue )
            {
                this.selectOption( divOption );
                if( execute && undefined != divOption.callback )
                    divOption.callback( divOption.itemValue );
                return false;
            }
        }, this ) );
    },
    // public
    // @ execute : true / false. Execute the callback.
    selectFirst: function( execute )
    {
        var divOption = this.arrayOptions[0];
        if( undefined == divOption )
            return;

        this.selectOption( divOption );
        if( execute && undefined != divOption.callback )
            divOption.callback( divOption.itemValue );
    },

    // private
    selectOption: function( divOption )
    {
        this.itemName = divOption.itemName;
        this.itemValue = divOption.itemValue;
        this.itemValue2 = divOption.itemValue2;
        this.divSelectMiddle.html( this.itemName );
    },

    // private
    onOptionClick: function( event )
    {
        var contextEvent = event.data[0];
        var divOption = event.data[1];
        contextEvent.isHover = false;
        contextEvent.hideOption();
        contextEvent.select( divOption.itemValue, true );
    },

    // private
    onMouseHover: function( event )
    {
        event.data.isHover = true;
    },

    // private
    onMouseParentOut: function( event )
    {
        event.data.isHover = false;
        event.data.hideOption();
    },

    onMouseOut: function( event )
    {
        event.data.isHover = false;
    },

    // private
    displayOptions: function()
    {
        var fromOption = this.indexOption;
        var toOption = this.indexOption + this.maxOptionSize - 1;
        for( var i = 0; i < this.arrayOptions.size(); i++ )
        {
            if( 0 == this.maxOptionSize )
                this.arrayOptions.get( i ).show();
            else if( i >= fromOption && i <= toOption )
                this.arrayOptions.get( i ).show();
            else
                this.arrayOptions.get( i ).hide();
        }
    }
} );

