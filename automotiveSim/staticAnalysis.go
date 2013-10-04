package automotiveSim

import "math"


func (pack *BatteryPack)ampsAtPower(power float64) float64  {
    return (2 * power) / (pack.NominalVoltage  + math.Sqrt(pack.NominalVoltage*pack.NominalVoltage - 4*power*pack.InternalResistance))

}

func (pack *BatteryPack)maxPower() float64 {
    return pack.NominalVoltage*pack.NominalVoltage/(4*pack.InternalResistance)
}

func airDensity(temperature float64) float64 {
    return (100000/((temperature+273.15)*287.058)) //ideal gas law
}

func (vehicle *Vehicle)Drag(speed float64) float64 {
    force := 0.5 * vehicle.CdA * speed * speed * airDensity(vehicle.ExternalTemp) //aero
    force += vehicle.Weight * 9.81 * vehicle.Tires.RollingResistance           //tires
    return force
}

func (vehicle *Vehicle)PowerUse(speed float64) float64 {
    return (vehicle.Drag(speed) * speed)/(vehicle.ElectricalEff * vehicle.DrivetrainEff) + vehicle.Accessory
}

// Maximize the function E = P/v
func (vehicle *Vehicle)MostEfficientSpeed() float64 {
    return math.Cbrt((vehicle.Accessory*vehicle.DrivetrainEff*vehicle.ElectricalEff)/(vehicle.CdA*airDensity(vehicle.ExternalTemp)))
}

//the fastest the vehicle can possibly go without exceeding the redline of any of it's motors
func (vehicle *Vehicle)MotorShaftSpeedLimit() float64 {
    topSpeed := 1e12; //3300c!
    for _,motor := range vehicle.Motors {
        motorSpeedLimit := vehicle.Tires.Radius * (motor.MaxShaftSpeed/motor.Gearing)
        if motorSpeedLimit < topSpeed {
            topSpeed = motorSpeedLimit
        }
    }
    return topSpeed
}

// computes the torque available from a motor at a given speed
func (motor *Motor)Torque(shaftSpeed float64, peak bool) float64 {
    maxTorque := motor.ContinuousTorque
    maxPower := motor.ContinuousPower
    if peak {
        maxTorque = motor.PeakTorque
        maxPower = motor.PeakPower
    }

    power := maxTorque * shaftSpeed
    if power > maxPower {
        return maxPower/shaftSpeed
    } else {
        return maxTorque
    }
}

func (vehicle *Vehicle)force(speed float64, peak bool) float64 {
    torque := 0.0
    wheelSpeed := speed/vehicle.Tires.Radius
    
    for _,motor := range vehicle.Motors {
        shaftSpeed := wheelSpeed * motor.Gearing
        torque += motor.Torque(shaftSpeed, peak) * motor.Gearing
    }
    return torque/vehicle.Tires.Radius * vehicle.DrivetrainEff
}

//maximum force the vehicle can exert on the road at given speed
func (vehicle *Vehicle)PeakForce(speed float64) float64 {
    return vehicle.force(speed, true)
}

func (vehicle *Vehicle)ContinuousForce(speed float64) float64 {
    return vehicle.force(speed, false)
}

func (vehicle *Vehicle)CanMoveAtSpeed(speed float64) bool {
    if speed > vehicle.MotorShaftSpeedLimit() {
        return false
    }
    if vehicle.Drag(speed) > vehicle.ContinuousForce(speed) {
        return false
    }
    return true
}

