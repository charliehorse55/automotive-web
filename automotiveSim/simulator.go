package automotiveSim

import "math"

type SimulatorState struct {
    Vehicle *Vehicle
    
    Time float64
    Speed float64
    Distance float64
    Coulombs float64
    Interval float64
    Acceleration float64
    PowerUse float64
    topMotorSpeed float64
}


func InitSimulation(vehicle *Vehicle) *SimulatorState {
    var state SimulatorState
    state.Vehicle = vehicle
    state.Interval = 0.001; // 1ms default interval
    state.topMotorSpeed = vehicle.MotorShaftSpeedLimit()
    return &state
}

func (state *SimulatorState)Tick(accel float64) {    
    vehicle := state.Vehicle
    
    //clamp the accel to what the tires can provide
    max := vehicle.Tires.Friction * 9.81
    if accel > max {
        accel = max
    } else if accel < -max {
        accel = -max
    }
    
    //make sure we are not accelerating over the max motor RPM
    if state.Speed + (accel * state.Interval) > state.topMotorSpeed {
        accel = (state.topMotorSpeed - state.Speed)/state.Interval
    }
    
    drag := vehicle.Drag(state.Speed)
    
    // calculate the force to achieve desired acceleration
    force := (accel * vehicle.Weight) + drag
    
    // limit the force to what the motors can provide
    maxForce := vehicle.PeakForce(state.Speed)
    if math.Abs(force) > maxForce {
        force = math.Copysign(maxForce, force)
    }
    
    //recalculate the maximum acceleration using the actual force available
    accel = (force - drag)/vehicle.Weight
    
    //linerally interpolate the speed
    speed := state.Speed + (accel/2)
    
    //calculate battery draw
    power := (force * speed)/(vehicle.ElectricalEff * vehicle.DrivetrainEff)
    power += vehicle.Accessory
    
    state.Coulombs += vehicle.Battery.ampsAtPower(power) * state.Interval
    
    state.Distance += speed * state.Interval
    state.Speed += accel * state.Interval
    state.Time += state.Interval
    
    state.PowerUse = power
    state.Acceleration = accel
    
    return
}

func (state *SimulatorState)energyUsed() float64 {
    return state.Coulombs * state.Vehicle.Battery.NominalVoltage
}