function TableButtons(table, addRow, removeRow) {
    addRow.click({table:table}, AddRow)
    removeRow.click({table:table}, RemoveRow)
}

function AddRow(event) {
    var table = event.data.table
	var row = table.find('tr:last').clone()
	row.find(".name").val("")
	table.append(row)
};

function RemoveRow(event) {
    var table = event.data.table
    if (table.find("tr").length > 1) {
        table.find('tr:last').remove()
    }
}


function good_input(box) {
	cell = box.parent()
	if (cell.hasClass("invalid_format")) {
		cell.removeClass("invalid_format")
	}
}

function bad_input(box) {
	cell = box.parent()
	cell.addClass("invalid_format")
}

function checkInput(element, units) {
	try {
		var value = (new Qty(element.val())).to(units).scalar;
		good_input(element)
		return value
	}
	catch (e) {
		bad_input(element)
		valid = 0
		return null
	}
}

function draw_eff() {
	var graphArray = [['Speed (kph)']];
	
	var length = 0;
	var numPowerSources = 0;
	for(var propt in currData.Efficiency) {
		graphArray[0].push(propt)
		length = currData.Efficiency[propt].length
		numPowerSources++;
	}
	
	var max = 0
	for (var i = 0; i < length; i++) {
		var point = [ currData.Speeds[i]*3.6 ]
		var total = 0
		for(var propt in currData.Efficiency) {
			var effValue = currData.Efficiency[propt][i]/3.6
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
	for(var i = 0; i < numPowerSources; i++) {
	    effFormater.format(graphData, i + 1);
	}
	
	speedFormatter.format(graphData, 0)
	
	options = {
		isStacked: true,
		areaOpacity:1.0,
		animation:{
			duration: 1000,
			easing: 'out'
	    	},
			chartArea: {
				width: '75%', 
				height: '80%',
				left:70,
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
	var data = new google.visualization.DataTable();
	data.addColumn('number', 'Time'); // Implicit domain label col.
	data.addColumn('number', 'Speed'); // Implicit series 1 data col.
	data.addColumn({type:'string', role:'annotation'}); // annotation role col.
	data.addColumn({type:'string', role:'annotationText'}); // annotationText col.
	var len = currData.AccelProfile.length;
	for(var i = 0; i < len; i++) {
		data.addRow([currData.AccelProfileTimes[i], currData.AccelProfile[i], null, null]);
	}
	
	for (var i = 0; i < currData.Limits.length; i++) {
		var index = currData.Limits[i].Index
		if (index != -1) {
			data.setCell(index, 2, "L");
			data.setCell(index, 3, currData.Limits[i].Reason);
		}
	}
	
	timeFormatter.format(data, 0);
	speedFormatter.format(data, 1);

	
	options = {
		animation:{
			duration: 1000,
			easing: 'out'
	    	},
			legend: {position: 'none'},
			chartArea: {
				width: '80%', 
				height: '90%',
				top:10,
			},
	    	vAxis:{
			viewWindow:{
				max:currData.AccelProfile[currData.AccelProfile.length]*1.2
			},
	    		baseline:0,
	    		title:"Speed (kph)"
	    	},
	    	hAxis:{
	    		title:"Time (s)"
	    	},
	    	// legend:{
	    	// 	position:"none"
	    	// }
			annotations: {
			  textStyle: {
				  fontSize: 28,
				  bold: true,
				  // italic: true,
				  // color: '#871b47',     // The color of the text.
				  // auraColor: '#d799ae', // The color of the text outline.
				  opacity: 0.8          // The transparency of the text.
				}
			}
	    };
	
	
	perfChart.draw(data, options);

	//update the list of limiting reasons
	var newEntry = ""
	var len = currData.Limits.length
	for (var i = 0; i < len; i++) {
		newEntry += "[" + (currData.Limits[i].Start/1e9).toFixed(2) + "s] " + currData.Limits[i].Reason + "<br>"
	}
	$("#limitingReasons").html(newEntry)

}

function draw_epa() {
	
	$("#tabs-2").html(JSON.stringify(currData.Economy))
}

function displayResult(data, textStatus, jqXHR) {
	if (data.hasOwnProperty("Error")) {
		setErrorMessage(data.Error)
		return
	}
	clearErrorMessage()
	
	currData = data
	
	console.log(data.PowerUse)
	
	//update all of the elements that match the response from the server
	var outputs = $("#output").find("*")
	var len = outputs.length
	for (var i = 0; i < len; i++ ) {
		var id = outputs[i].id
		if (data.hasOwnProperty(id)) {
			outputs.eq(i).html(data[id])
		}
	}
	
	//update the currently selected tab
	update_funcs[$('#tabs').tabs('option','active')]()
}

function setErrorMessage(inMessage) {
	var errHeader = $('#errorMessage');
	errHeader.html("<span>error: </span>" + inMessage);
	errHeader.show();
}

function clearErrorMessage() {
	var errHeader = $('#errorMessage');
	errHeader.hide();
}

function submitRequest() {
	updateMotorList()
	
	//process the motors
	var rows = $("#motors tr")
	var vehicle = {}
	valid = 1
	vehicle.Battery = {}
	var motors = {}
	rows.each(function(){
		var motor = {};
		$this = $(this)
		var nameField = $this.find(".name")
		motor.Name = nameField.val();
		if (motors.hasOwnProperty(motor.Name)) {
			bad_input(nameField)
			valid = 0
		} else {
			good_input(nameField)
		}
		motor.Peak = {}
		motor.Peak.Torque = checkInput($this.find(".peakTorque"), "N m");
		motor.Peak.Power = checkInput($this.find(".peakPower"), "W");
		motor.Continuous = {}
		motor.Continuous.Torque = checkInput($this.find(".continuousTorque"), "N m");
		motor.Continuous.Power = checkInput($this.find(".continuousPower"), "W");
		motor.MaxShaftSpeed = checkInput($this.find(".maxShaftSpeed"), "rad/s");
		motor.Efficiency = 0.95;
		motors[motor.Name] = motor;
	} );
	
	//battery specs
	var battery = {}
	battery.CellVoltage = checkInput($("#nomVolt"), "V");
	battery.CellResistance = checkInput($("#intResistance"), "Ohm");
	battery.CellCoulomb = checkInput($("#capacity"), "C") * $("#drainDepth").val();
	battery.CellMaxCurrent = checkInput($("#crate"), "1") * (battery.CellCoulomb/3600);
	battery.Series = checkInput($("#seriesCell"), "1");
	battery.Parallel = checkInput($("#parallelCell"), "1");
	vehicle.Battery = battery
	
	//tires
	var tires = {}
	tires.Grip = checkInput($("#Friction"), "1");
	tires.RollingResistance = checkInput($("#RollingResistance"), "1");
	tires.Radius = checkInput($("#Radius"), "m");
		
	var body = {}
	body.Weight = checkInput($("#Weight"), "kg");
	body.CdA = checkInput($("#CdA"), "1");
	body.Drives = []
	body.FreeWheels = [];
	
	$("#drives tr").each(function(){ 
		var drive = {}
		$this = $(this)
		drive.Name = $this.find(".name").val();
		if (drive.Name == '') {
			return
		}
		drive.WeightDistribution
		drive.Gearing = checkInput($this.find(".gearing"), "1");
		drive.Efficiency = checkInput($this.find(".efficiency"), "1");
		drive.WeightDistribution = checkInput($this.find(".weightDist"), "1");
		drive.Tires = tires
		motorName = $this.find(".motorList").val() 
		
		if(motors.hasOwnProperty(motorName)) {
			drive.Motor = motors[motorName]
			body.Drives.push(drive)
		} else {
			body.FreeWheels.push(drive)
		}	
	})
	
	vehicle.Body = body;
	
	vehicle.Ambient = {
		Temperature:checkInput($("#Temperature"), "tempK"),
		Pressure:checkInput($("#Pressure"), "Pa"),
	}
	
	//misc
	vehicle.Accessory = checkInput($("#Accessory"), "W");
	
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

function setDriveRow(row, state) {
	row.find(".efficiency").prop("disabled", state);
	row.find(".gearing").prop("disabled", state);
}

function updateMotorList() {
	var options = ["None"]
	$("#motors tr").each(function() {
    	var motorName = $(this).find(".name").val();
		if(motorName === "") {
			return
		}
		options.push(motorName);
	})
		
		
	var selectorHTML = []
	$.each(options, function(index, value) {
		selectorHTML.push('<option value="'+ value +'">'+ value +'</option>')
	})
	selectorHTML = selectorHTML.join("")
		
	$('.motorList').each(function() {
		var sel = $(this);
		var selected = sel.find(":selected").val();
		sel.empty();
		sel.html(selectorHTML)
		var row = sel.closest('tr');
		if(sel.find("option[value='" + selected +  "']").length > 0 && selected != "None") {
			sel.val(selected);
			setDriveRow(row, false);
		} else {
			sel.val("None");
			setDriveRow(row, true);
		}
	})
}

function googleDidLoad() {
	effChart = new google.visualization.AreaChart(document.getElementById('eff_chart'));
	perfChart = new google.visualization.LineChart(document.getElementById('accel_chart'));
    effFormater = new google.visualization.NumberFormat({pattern:'###.# Wh/km'});
    speedFormatter = new google.visualization.NumberFormat({pattern:'###.## kph'});
    timeFormatter = new google.visualization.NumberFormat({pattern:'###.##s', fractionDigits:2});
	
	submitRequest()
}

$( document ).ready(function() {
	updateMotorList()
    effGraphMax = 0
	
	google.load("visualization", "1", {packages:["corechart", "annotationchart"], "callback" : googleDidLoad});

	$(".input").on("change", submitRequest)
				
	var addMotor = $("#addMotorRow")
	var remMotor = $("#removeMotorRow")
    TableButtons($("#motors"), addMotor, remMotor)
	addMotor.click(updateMotorList)
	remMotor.click(updateMotorList)
	
    TableButtons($("#drives"), $("#addDriveRow"), $("#removeDriveRow"))
	
	
	update_funcs = [draw_eff, draw_perf, draw_epa]

	$("#tabs").tabs({
    activate: function(event, ui) {
		update_funcs[ui.newPanel.attr("id").substr(5)]()
		
    }
	}).css({
	   'min-height': '700px',
	   'overflow': 'auto'
	});
	
    $("#input-tabs").accordion({ collapsible: true, active: false });
	
	//default to a YASA-400 on front axle
	$('.motorList').first().val("Yasa 400")
});









