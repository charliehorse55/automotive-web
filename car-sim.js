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

function displayResult(data, textStatus, jqXHR) {

	//update all of the elements that match the response from the server
	var outputs = $("#output").find("*")
	var len = outputs.length
	for (var i = 0; i < len; i++ ) {
		var id = outputs[i].id
		if (data.hasOwnProperty(id)) {
			outputs.eq(i).html(data[id])
		}
	}	
	
	var length = data.Speed.length
	var graphArray = [
          ['Time (s)', 'Speed (kph)', 'Battery Power (kW)']
    ];

	for (i = 0; i < length; i++) {
		graphArray.push([i*0.1, data.Speed[i]*3.6, data.Power[i]/1000])
	}
	var graphData = google.visualization.arrayToDataTable(graphArray)
    var speedFormatter = new google.visualization.NumberFormat({pattern:'###.## kph'});
	speedFormatter.format(graphData, 1)
	var options = {
		title: 'Acceleration to Top Speed',
		animation:{
			duration: 1000,
			easing: 'out'
    	},
    	vAxis:{
    		baseline:0
    	},
    	hAxis:{
    		title:"Time (s)"
    	}
    };
	accelChart.draw(graphData, options);

	length = data.Efficiency.length
	graphArray = [
          ['Speed (kph)', 'Energy Consumption (Wh/km)']
    ];
	
	var max = 0
	for (i = 0; i < length; i++) {
		if (data.Efficiency[i] > max) {
			max = data.Efficiency[i]
		}
		graphArray.push([i+30, data.Efficiency[i]])
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
    var effFormater = new google.visualization.NumberFormat({pattern:'###.##'});
    effFormater.format(graphData, 1);
	speedFormatter.format(graphData, 0)
	
	options = {
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
    	legend:{
    		position:"none"
    	}
    };


	effChart.draw(graphData, options);
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
	accelChart = new google.visualization.LineChart(document.getElementById('accel_chart'));
	effChart = new google.visualization.LineChart(document.getElementById('eff_chart'));
	submitRequest()
}

$( document ).ready(function() {
    effGraphMax = 0
	
	google.load("visualization", "1", {packages:["corechart"], "callback" : googleDidLoad});

	$(".input").on("change", submitRequest)
		


	for (var i = 0; i < 3; i++) {
		$("#motors").append($('#motors tr:last').clone())
	}
	
	$("#removeMotorRow").on("click", function() {
		if ($("#motors tr").length > 1) {
			$('#motors tr:last').remove()
			submitRequest()
		}
	})
	$("#addMotorRow").on("click", addAMotorRow)
	
});









