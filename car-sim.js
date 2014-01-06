function addAMotorRow() {
	$("#motors").append($('#motors tr:last').clone())
	submitRequest()
}

function removeClass(element, aClass) {
	if (element.hasClass(aClass)) {
		element.removeClass(aClass)
	}
}	

function checkInput(element, units) {
	try {
		var value = (new Qty(element.val())).to(units).scalar;
		removeClass(element.parent(), "invalid_format")
		return value
	}
	catch (e) {
		var test = element.parent()
		test.addClass("invalid_format")
		valid = 0
		return null
	}
}

function draw_eff() {
	var length = currData.Efficiency.Speeds.length
	var graphArray = [
          ['Speed (kph)']
    ];
	
	var numPowerSources = currData.Efficiency.Sources.length
	for (var i = 0; i < numPowerSources; i++ ) {
		graphArray[0].push(currData.Efficiency.Sources[i])
	}
	
	var max = 0
	for (var i = 0; i < length; i++) {
		var point = [ currData.Efficiency.Speeds[i]*3.6 ]
		var total = 0
		for(var j = 0; j < numPowerSources; j++) {
			var effValue = currData.Efficiency.Magnitude[i][j]/3.6
			total += effValue
			point.push(effValue)
		}
		if (total > max) {
			max = total
		}
		graphArray.push(point)
	}
	
	//is the axis too small?
	if (effGraphMax < max) {
		effGraphMax = max * 2
	}
	
	//is the axis to large?
	if ((effGraphMax/4) > max) {
		effGraphMax = max * 2
	}
	
	graphData = google.visualization.arrayToDataTable(graphArray)
    var effFormater = new google.visualization.NumberFormat({pattern:'###.# Wh/km'});
	for(var i = 0; i < numPowerSources; i++) {
	    effFormater.format(graphData, i + 1);
	}
	
    var speedFormatter = new google.visualization.NumberFormat({pattern:'###.## kph'});
	speedFormatter.format(graphData, 0)
	
	options = {
		isStacked: true,
		areaOpacity:1.0,
		animation:{
			duration: 1000,
			easing: 'out'
    	},
    	vAxis:{
			viewWindow:{
				max:effGraphMax
			},
    		baseline:0,
    		title:"Energy Consumption (Wh/km)"
    	},
    	hAxis:{
    		title:"Speed (kph)"
    	},
    	// legend:{
    	// 	position:"none"
    	// }
    };


	effChart.draw(graphData, options);
}

function draw_perf() {

}

function draw_epa() {
	
}

function displayResult(data, textStatus, jqXHR) {
	currData = data

	//update all of the elements that match the response from the server
	var outputs = $("#output").find("*")
	var len = outputs.length
	for (var i = 0; i < len; i++ ) {
		var id = outputs[i].id
		if (data.hasOwnProperty(id)) {
			outputs.eq(i).html(data[id])
		}
	}	
	
	var time = 0.0
	var newEntry = ""
	for (var i = 0; i < data.Limits.length; i++) {
		newEntry += "[" + time.toFixed(2) + "-"
		time += data.Limits[i].Duration
		newEntry += time.toFixed(2) + "] " + data.Limits[i].Reason + "<br>"
	}
	$("#limitingReasons").html(newEntry)

	// GET INDEX OF ACTIVE TAB
	// make sure to replace #tabs with the actual selector
	// that you used to create the tabs
	update_funcs[$('#tabs').tabs('option','active')]()
}

function submitRequest() {
	//process the motors
	var rows = $("#motors tr")
	var vehicle = {}
	valid = 1
	vehicle.Motors = []
	rows.each(function(){
		var motor = {};
		$this = $(this)
		motor.PeakTorque = checkInput($this.find("input.peakTorque"), "N m");
		motor.ContinuousTorque = checkInput($this.find("input.continuousTorque"), "N m");
		motor.PeakPower = checkInput($this.find("input.peakPower"), "W");
		motor.ContinuousPower = checkInput($this.find("input.continuousPower"), "W");
		motor.MaxShaftSpeed = checkInput($this.find("input.MaxShaftSpeed"), "rad/s");
		motor.Gearing = checkInput($this.find("input.Gearing"), "1");
		vehicle.Motors.push(motor);
	} );
	
	//battery specs
	battery = {}
	battery.CellVoltage = checkInput($("#nomVolt"), "V");
	battery.CellResistance = checkInput($("#intResistance"), "Ohm");
	battery.CellCoulomb = checkInput($("#capacity"), "C");
	battery.Series = checkInput($("#seriesCell"), "1");
	battery.Parallel = checkInput($("#parallelCell"), "1");
	vehicle.Battery = battery
	
	//tires
	tires = {}
	tires.Friction = checkInput($("#Friction"), "1");
	tires.RollingResistance = checkInput($("#RollingResistance"), "1");
	tires.Radius = checkInput($("#Radius"), "m");
	vehicle.Tires = tires
	
	//misc
	vehicle.Weight = checkInput($("#Weight"), "kg");
	vehicle.CdA = checkInput($("#CdA"), "1");
	vehicle.Accessory = checkInput($("#Accessory"), "W");
	vehicle.ElectricalEff = checkInput($("#ElectricalEff"), "1");
	vehicle.DrivetrainEff = checkInput($("#DrivetrainEff"), "1");
	vehicle.ExternalTemp = checkInput($("#ExternalTemp"), "C");
	
	if (valid) {
		$.ajax({
		type: "POST",
		url: "/simulate",
		data: JSON.stringify(vehicle),
		success: displayResult,
		dataType: "json"
		});
	}


}

function googleDidLoad() {
	effChart = new google.visualization.AreaChart(document.getElementById('eff_chart'));
	submitRequest()
}

$( document ).ready(function() {
    effGraphMax = 0
	
	google.load("visualization", "1", {packages:["corechart"], "callback" : googleDidLoad});

	$(".input").on("change", submitRequest)
		
	
	$("#removeMotorRow").on("click", function() {
		if ($("#motors tr").length > 1) {
			$('#motors tr:last').remove()
			submitRequest()
		}
	})
	$("#addMotorRow").on("click", addAMotorRow)
	
	
	$("#tabs").tabs({
    activate: function(event, ui) {
		update_funcs[ui.newPanel.attr("id").substr(5)]()
		
    }
	}).css({
	   'min-height': '700px',
	   'overflow': 'auto'
	});
	
    $("#input").accordion({ collapsible: true, active: false });
	
	
	update_funcs = [draw_eff, draw_perf, draw_epa]
});









