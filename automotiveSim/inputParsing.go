package automotiveSim

import "encoding/json"
import "fmt"

type Motor struct {
    PeakTorque float64
    ContinuousTorque float64
    PeakPower float64
    ContinuousPower float64
    MaxShaftSpeed float64
    Gearing float64
}

type BatteryPack struct {
    NominalVoltage float64
    InternalResistance float64
    Coulomb float64
    Series uint
    Parallel uint
    CellVoltage float64
    CellResistance float64
    CellCoulomb float64
}

type Tire struct {
    Friction float64
    RollingResistance float64
    Radius float64
}

type Vehicle struct {
    Motors []Motor
    Weight float64
    CdA float64
    Accessory float64
    ExternalTemp float64
    Tires Tire
    Battery BatteryPack
    ElectricalEff float64
    DrivetrainEff float64
}

func (b *BatteryPack)Init() {
    b.NominalVoltage = b.CellVoltage * float64(b.Series)
    b.Coulomb = b.CellCoulomb * float64(b.Parallel)
    b.InternalResistance = b.CellResistance*float64(b.Series) / float64(b.Parallel)
}

func Parse(vehicleJSON interface{}) (*Vehicle, error) {    
    var data []byte
    switch t := vehicleJSON.(type) {
        default:
            return nil, fmt.Errorf("Unexpected type: %T", t)
        
        case []byte:
            data = t
        
        case string:
            data = []byte(t)
    }
    
    var vehicle Vehicle
    err := json.Unmarshal(data, &vehicle)
    if err != nil {
        return nil, err
    }
    
    vehicle.Battery.Init()
    
    return &vehicle, nil
}

