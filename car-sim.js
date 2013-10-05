function addAMotorRow() {
	$("#motors").append($('#motors tr:last').clone())
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

function displayResult(data, textStatus, jqXHR) {

	$("#accel100").html(data.Accel100.toFixed(2) + "s")
	$("#quarterMile").html(data.QuarterMile.toFixed(2) + "s")
	$("#topSpeed").html((data.TopSpeed*3.6).toFixed(0) + " kph")
	var length = data.Speed.length
	var speed = []
	var power = []
	for (i = 0; i < length; i++) {
		speed.push([i*0.1, data.Speed[i]*3.6])
		power.push([i*0.1, data.Power[i]/1000])
	}
	var options = {
		title: "Acceleration Profile",
		seriesDefaults:{ 
			showMarker:false, 
			shadow:false
		},
		series:[ {label:"Speed (kph)"}, {label:"Power (kW)", yaxis:"y2axis"}],
		axesDefaults : {
			labelRenderer: $.jqplot.CanvasAxisLabelRenderer
		},
		axes: {
       		xaxis: {
	        	label: "Time (s)",
	        	pad: 0
	        },
	        yaxis: {
	        	label: "Speed (kph)",
				pad: 0
			},
			y2axis: {
	        	label: "Mechanical Power (kW)",
				pad: 0
			}
      	},
		legend: {
			show: true,
			location: 'se',
		}

	} 
	$("#chartdiv").empty()
 	$.jqplot('chartdiv', [speed, power], options);
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

$( document ).ready(function() {
	for (var i = 0; i < 3; i++) {
		addAMotorRow()
	}
	
	$("#removeMotorRow").on("click", function() {
		if ($("#motors tr").length > 1) {
			$('#motors tr:last').remove();
		}
	})
	$("#addMotorRow").on("click", addAMotorRow)
	$("#submitRequest").on("click", submitRequest)
});









