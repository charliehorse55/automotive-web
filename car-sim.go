package main

import (
	"github.com/charliehorse55/automotiveSim"
	"net/http"
	"io/ioutil"
	"log"
	"encoding/json"
	"os"
	"fmt"
)


const gravity = 9.81

type PowerUse struct {
	Speed float64	   // kph
	Efficiency float64 // Wh/km
}

type simulationResult struct {
    Accel100 string
    QuarterMile string
    TopSpeed string
	TopSpeedAccelTime string
	TopSpeedEff string
    PeakG string
	
	Economy map[string]string
        
    // Wh/km vs speed
    Efficiency *automotiveSim.PowerDraw
}

var DriveSchedules []automotiveSim.Schedule

func removeSource(name string, p *automotiveSim.PowerDraw) {
	//find the index to remove
	index := -1
	for i,source := range p.Sources {
		if name == source {
			index = i
			break
		}
	}
	if index == -1 {
		return
	}
	//remove that source from the name list
	p.Sources = append(p.Sources[:index], p.Sources[index+1:]...) 
	
	for i := range p.Magnitude {
		for j := index; j < len(p.Sources); j++ {
			p.Magnitude[i][j] = p.Magnitude[i][j+1]
		}
	}
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
	accel, err := vehicle.RunAccelerationProfile() 
	if err != nil { return }
    
    var response simulationResult
    response.TopSpeed = fmt.Sprintf("%3.0f kph", accel.TopSpeed*3.6)
	response.Accel100 = fmt.Sprintf("%5.2fs", accel.Accel100)
	response.QuarterMile = fmt.Sprintf("%5.2fs", accel.QuarterMile)
	response.TopSpeedAccelTime = fmt.Sprintf("%5.2fs", accel.AccelTop)
    response.PeakG = fmt.Sprintf("%4.2fg", accel.PeakAccel/gravity)
        
	response.Economy = make(map[string]string)
	for _,schedule := range DriveSchedules {
		result, err := schedule.Run(vehicle)
		if err != nil {
			response.Economy[schedule.Name] = fmt.Sprintf("Failed")
		} else {
			energy := 0.0
			for _,p := range result.Power {
				energy += p * schedule.Interval
			}
			response.Economy[schedule.Name] = fmt.Sprintf("%4.1f Wh/km", energy/result.Distance)
		}
	}
	
    highSpeed := 150
    if int(accel.TopSpeed*3.6) < highSpeed {
        highSpeed = int(accel.TopSpeed*3.6)
    }
	lowSpeed := highSpeed/5
	speedLen := (highSpeed - lowSpeed) + 1
	speeds := make([]float64, speedLen)
	for i := 0; i < speedLen; i++ {
		speeds[i] = float64(i + lowSpeed)/3.6 //convert kph to m/s for simulator
	}

	response.Efficiency, err = vehicle.PowerAtSpeeds(speeds)
	if err != nil {
		fmt.Printf("Failed to calculate PowerAtSpeeds: %v\n", err)
		return
	}
	
	removeSource("Acceleration", response.Efficiency)
	
	//convert from power values to Wh/km
	for i := range response.Efficiency.Magnitude {
		for j := 0; j < len(response.Efficiency.Sources); j++ {
			response.Efficiency.Magnitude[i][j] /= speeds[i]
		}
	}
		
    data, err := json.Marshal(response)
    if err != nil {
        log.Printf("Failed to marshal data: %v\n", response)
        return
    }
    
    w.Write(data)
}

func readSchedules(path string) error {
	files, err := ioutil.ReadDir(path)
	if err != nil {
		return err
	}
	for _,file := range files {
		if file.IsDir() {
			continue
		}
		
		//read in the file
		b, err := ioutil.ReadFile(path + "/" + file.Name())
		if err != nil { return err }
		
		//parse the json
		var schedule automotiveSim.Schedule
		err = json.Unmarshal(b, &schedule)
		if err != nil { return err }
		
		DriveSchedules = append(DriveSchedules, schedule)
	}
	return nil
}

func main() {
	readSchedules("schedules/")
    http.HandleFunc("/simulate", handler)
    http.Handle("/", http.FileServer(http.Dir(".")))
    log.Fatal(http.ListenAndServe(":"+os.Getenv("PORT"), nil))
}
