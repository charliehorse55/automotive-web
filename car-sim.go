package main

import "github.com/charliehorse55/automotiveSim"
import "net/http"
import "io/ioutil"
import "log"
import "math"
import "encoding/json"
import "os"

type simulationResult struct {
    Accel100 float64
    QuarterMile float64
    TopSpeed float64
    Speed []float64
    Power []float64
}


func handler(w http.ResponseWriter, r *http.Request) {
    body, err := ioutil.ReadAll(r.Body)
    if err != nil {
        log.Fatal(err)
    }
    
    vehicle, err  := automotiveSim.Parse(body)
    if err != nil {
        return
    }
        
    //run an acceleration simulation
    sim := automotiveSim.InitSimulation(vehicle)
    
    var result simulationResult
    
    //top speed is reached once acceleration is less than 0.01 m/s^2
    for i := 0; ; i++ {
        //record current vehicle speed for the graph
        if (i % 100) == 0 {
            result.Speed = append(result.Speed, sim.Speed)
            result.Power = append(result.Power, sim.PowerUse)
        }
        
        //request to accelerate much faster than is possible
        sim.Tick(10000)
        
        //have he accelerated past 100 kph?
        if sim.Speed > (100/3.6) && result.Accel100 == 0 {
            result.Accel100 = sim.Time
        }
        
        //quarter mile in meteres
        if sim.Distance > 402.33600 && result.QuarterMile == 0 {
            result.QuarterMile = sim.Time
        }
        
        //top speed
        if sim.Acceleration < 0.01 && result.TopSpeed == 0 {
            result.TopSpeed = sim.Speed
            
            
            //we can't accelerate to that speed if it's higher than our top speed!
            if result.TopSpeed < (100/3.6) {
                result.Accel100 = math.NaN()
            }
        }
    
        
        //we are done with this simulation
        if result.TopSpeed != 0 && result.Accel100 != 0 && result.QuarterMile != 0 {
            break
        }
    }
    
    data, err := json.Marshal(result)
    if err != nil {
        return
    }
    
    w.Write(data)
}

func main() {
    http.HandleFunc("/simulate", handler)
    http.Handle("/files/", http.StripPrefix("/files/", http.FileServer(http.Dir("."))))
    log.Fatal(http.ListenAndServe(":"+os.Getenv("PORT"), nil))
}
