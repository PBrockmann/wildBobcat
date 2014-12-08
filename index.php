<HTML>
<HEAD>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Wild Bobcat</title>

    <script type="text/javascript" src="js/jquery-1.9.1.js"></script>
    <script type="text/javascript" src="js/jquery.class.js"></script>
    <script type="text/javascript" src="js/jquery-ui-1.10.2.custom/js/jquery-ui-1.10.2.custom.min.js"></script>
    <link type="text/css" href="css/ui-lightness/jquery-ui-1.8.21.custom.css" rel="Stylesheet"/>

    <script type="text/javascript" src="js/OpenLayers-2.12/OpenLayers.js"></script>
    <script type="text/javascript" src="js/jshashtable-2.1.js"></script>
    <script type="text/javascript" src="js/anytime.js"></script>

    <script type="text/javascript" src="js/Select.js"></script>
    <link type="text/css" href="css/select.css" rel="stylesheet"/>

    <script type="text/javascript" src="js/BCInterface.js"></script>
    <link type="text/css" href="css/BCInterface.css" rel="stylesheet"/>

    <script type="text/javascript" src="Bobcat.js"></script>
    <link type="text/css" href="Bobcat.css" rel="stylesheet"/>

</HEAD>

<BODY>

<div id="pageWrapper">
    <div id="non-printable">
        <div id="toolsContent">
            <div class="containerButtons">
		<div class="mapsNumber" title="Number of maps to display by line">Nb cols :
                    <div id="selectMapsNumber"></div>
                </div>
                <div id="submitDeleteMaps" class="tool">
                    <div class="lonelyToolIcone"><img src="img/fileclose.png" title="Remove all maps"/></div>
                </div>
                <div id="submitShowAllLegends" class="tool">
                    <div class="lonelyToolIcone"><img src="img/legend_display_all.png" title="Show all legends"/></div>
                </div>
                <div id="submitHideAllLegends" class="tool">
                    <div class="lonelyToolIcone"><img src="img/legend_hide_all.png" title="Hide all legends"/></div>
                </div>
		<div id="submitCreateMap" class="tool">
                    <div class="lonelyTool">Create map</div>
                </div>
            </div>
            <div class="container">
                <div class="containerTitle">Projection
                    <div id="ProjectionArrow" class="divArrow divArrow_up"></div>
                </div>
                <div id="ProjectionContent" class="containerContent">
                    <select id='projection' size='3'>
			<option value="EPSG:4087">World Equidistant Cylindrical</option>
			<option value="EPSG:3857" selected>Pseudo-Mercator</option>
			<option value="EPSG:3408">EASE-Grid North</option>
			<option value="EPSG:3409">EASE-Grid South</option>
                    </select>
                </div>
            </div>
            <div class="container">
                <div class="containerTitle">Resource
                    <div id="ResourceArrow" class="divArrow divArrow_up"></div>
                </div>
                <div id="ResourceContent" class="containerContent">
                    <select id='resource' size='6' multiple>
				<?php
                                        $dir="/prodigfs/CARBON/latest/";
                                        $files=glob($dir."*.nc");
                                        $urlwms="http://webportals.ipsl.jussieu.fr/thredds/wms";
                                        $counter = 0;
                                        foreach ($files as $file) {
                                            if (is_file($file)) {
                                                $counter++;
                                                $bfile=basename($file);
                                                if ($counter == 1) {
                                                        //echo '<option value="'.$urlwms.'?DATASET='.$file.'"  selected>'.$bfile.'</option>'."\n";
                                                        echo '<option value="'.$urlwms.'?DATASET=http://webportals.ipsl.jussieu.fr/thredds/dodsC/CARBON/'.$bfile.'"  selected>'.$bfile.'</option>'."\n";
                                                } else {
                                                        //echo '<option value="'.$urlwms.'?DATASET='.$file.'">'.$bfile.'</option>'."\n";
                                                        echo '<option value="'.$urlwms.'?DATASET=http://webportals.ipsl.jussieu.fr/thredds/dodsC/CARBON/'.$bfile.'">'.$bfile.'</option>'."\n";
                                                }
                                            }
                                        }
                                ?>
				<option value="http://webportals.ipsl.jussieu.fr/thredds/wms?DATASET=http://motherlode.ucar.edu:8080/thredds/dodsC/grib/NCEP/GFS/Global_onedeg/best">Extern WMS (UCAR)</option>
				<option value="http://webportals.ipsl.jussieu.fr/thredds/wms?DATASET=http://vesg3.ipsl.fr/thredds/dodsC/DRIAS/IPSL/LMDZ-France/day/atmos/tas/r1i1p1/tas_day_LMDZ-France_r1i1p1_19510101-20001230.nc">Extern WMS (IPSL)</option>
                    </select>
                </div>
            </div>
            <div id="VariableContainer" class="container">
                <div class="containerTitle">Variable
                    <div id="VariableArrow" class="divArrow divArrow_up"></div>
                </div>
                <div id="VariableContent" class="containerContent">
                    <select id='variable' size='4'></select>
                </div>
            </div>
            <div id="TimeContainer" class="container">
                <div class="containerTitle">Time
                    <div id="TimeArrow" class="divArrow divArrow_up"></div>
                </div>
                <div id="TimeContent" class="containerContent">
                    <select size='4' id='time'></select>
                </div>
            </div>
            <div id="ElevationContainer" class="container">
                <div class="containerTitle">Elevation
                    <div id="ElevationArrow" class="divArrow divArrow_up"></div>
                </div>
                <div id="ElevationContent" class="containerContent">
                    <select size='4' id='elevation'></select>
                </div>
            </div>
            <div class="container">
                <div class="containerTitle">Legend
                    <div id="LegendArrow" class="divArrow divArrow_up"></div>
                </div>
                <div id="LegendContent" class="containerContent">
		    <div class="containerLegend">
			<label for="autoRange">Auto</label>
			<input id="autoRange" type="checkbox" checked="" title="Automatically stretch range from variable"/>
                        <input id="getRange" type="button" title="Get range from variable" value="Range:"/>
                        <input type="text" id="slider-range-text"/>

                        <div id="slider-range" style='width: 90%'></div>
                    </div>

                    <div id="legendTools">
                        <div class="containerLegend">
                            <div>Palette :</div>
                            <select id='palette' size='4' style='width: 140px;'>
                                <option value="alg">alg</option>
                                <option value="alg2">alg2</option>
                                <option value="ferret">ferret</option>
                                <option value="greyscale">greyscale</option>
                                <option value="ncview">ncview</option>
                                <option value="occam">occam</option>
                                <option value="occam_pastel-30" selected>occam_pastel-30</option>
                                <option value="redblue">redblue</option>
                                <option value="sst_36">sst_36</option>
                            </select>
                        </div>
                        <div class="containerLegend">
                            Nb colors :
                            <input type="text" id="slider-nbcolorbands-text" disabled/>

                            <div id="slider-nbcolorbands" style='width: 137px;'></div>
                        </div>

                    </div>
                    <div id="legend"></div>
                </div>
            </div>
        </div>
        <div id="hideOrShowToolsContent" title="Hide or Show the control panel">
		<div class="hideOrShowToolsContent"><img src="img/grabber.png"/></div>
        </div>
    </div>

    <div id="printable"></div>

</div>

<script type="text/javascript">
    $( document ).ready( function ()
    {
        new BCInterface();
    } );
</script>

</BODY>
</HTML>
