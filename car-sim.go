package main

import "github.com/charliehorse55/automotiveSim"
import "net/http"
import "io/ioutil"
import "log"
import "encoding/json"
import "os"
import "fmt"

const gravity = 9.81

type simulationResult struct {
    Accel100 string
    QuarterMile string
    TopSpeed string
	TopSpeedAccelTime string
	TopSpeedEff string
    PeakG string
	
	Economy map[string]float64
        
    // Wh/km vs speed
    Efficiency []float64
}

var DriveSchedules []automotiveSim.Schedule

func handler(w http.ResponseWriter, r *http.Request) {
    body, err := ioutil.ReadAll(r.Body)
    if err != nil {
        log.Fatal(err)
    }
    
    vehicle, err  := automotiveSim.Parse(body)
	if err != nil { return }
        
    //run an acceleration simulation
	accel, err := vehicle.RunAccelerationProfile() 
	if err != nil { return }
    
    var response simulationResult
    response.TopSpeed = fmt.Sprintf("%3.0f kph", accel.TopSpeed*3.6)
	response.Accel100 = fmt.Sprintf("%5.2fs", accel.Accel100)
	response.QuarterMile = fmt.Sprintf("%5.2fs", accel.QuarterMile)
	response.TopSpeedAccelTime = fmt.Sprintf("%5.2fs", accel.AccelTop)
    response.PeakG = fmt.Sprintf("%4.2fg", accel.PeakAccel/gravity)
    
    //calculate wh/km from 30 to 150 km/hr
    // effSpeed := 150
    // if int(accel.TopSpeed*3.6) < effSpeed {
    //     effSpeed  = int(accel.TopSpeed*3.6)
    // }
    
	response.Economy = make(map[string]float64)
	for _,schedule := range DriveSchedules {
		result, err := schedule.Run(vehicle)
		if err != nil { return }
		
		energy := 0.0
		for _,p := range result.Power {
			energy += p * schedule.Interval
		}
		response.Economy[schedule.Name] = energy/result.Distance
	}
    data, err := json.Marshal(response)
    if err != nil {
        log.Printf("Failed to marshal data: %v\n", response)
        return
    }
	fmt.Printf("Response: %v\n", string(data))
    
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
    http.Handle("/files/", http.StripPrefix("/files/", http.FileServer(http.Dir("."))))
    log.Fatal(http.ListenAndServe(":"+os.Getenv("PORT"), nil))
}
