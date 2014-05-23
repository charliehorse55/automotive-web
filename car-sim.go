package main

import (
	"github.com/charliehorse55/automotiveSim"
	"net/http"
	"io/ioutil"
	"log"
	"encoding/json"
	"os"
	"fmt"
	"time"
	"math"
)


const gravity = 9.81

type LimitReason struct {
	Reason string
	Start time.Duration
	Index int
}

type simulationResult struct {
    Accel100 string
    QuarterMile string
    TopSpeed string
	TopSpeedAccelTime string
	TopSpeedEff string
    PeakG string
	Limits []LimitReason
	AccelProfile []float64
	AccelProfileTimes []float64
	
	Economy map[string]string
        
	Efficiency map[string][]float64
	Speeds []float64
    // Wh/km vs speed
    // Efficiency *automotiveSim.PowerUse
}

var DriveSchedules map[string]automotiveSim.Schedule

func runSim(data []byte) (*simulationResult, error) {	
    vehicle, err  := automotiveSim.Parse(data)
	if err != nil {
		return nil, err
	}
	
    //run an acceleration simulation
	accel, err := vehicle.RunAccelerationProfile() 
	if err != nil { 
		return nil, err
	}
    
    var response simulationResult
    response.TopSpeed = fmt.Sprintf("%3.0f kph", math.Floor(accel.TopSpeed*3.6))
	response.Accel100 = fmt.Sprintf("%5.2fs", accel.Accel100)
	response.QuarterMile = fmt.Sprintf("Quarter Mile: %5.2fs", accel.QuarterMile)
	response.TopSpeedAccelTime = fmt.Sprintf("%5.2fs", accel.AccelTop)
    response.PeakG = fmt.Sprintf("%4.2fg", accel.PeakAccel/gravity)	
        
	//create the accel profile between t=0 and t=QuarterMile
	ap := make([]float64, 200)
	times := make([]float64, len(ap))
	for i := range ap {
		times[i] = (accel.QuarterMile/float64(len(ap)))*float64(i)
		index := int(times[i]*100)
		ap[i] = accel.Profile[index]*3.6
	}
	response.AccelProfile = ap
	response.AccelProfileTimes = times
		
	response.Limits = make([]LimitReason, len(accel.Limits))
	for i := range response.Limits {
		response.Limits[i].Reason = accel.Limits[i].Reason
		response.Limits[i].Start = accel.Limits[i].Start
		index := int((accel.Limits[i].Start.Seconds()/accel.QuarterMile)*float64(len(ap)))
		if index > (len(ap) - 1) {
			index = -1
		}
		response.Limits[i].Index = index
	}
	
	
	done := make(chan int, len(DriveSchedules))
	response.Economy = make(map[string]string)
	for name,schedule := range DriveSchedules {
		go func(name string, schedule automotiveSim.Schedule) {
			result, err := schedule.Run(vehicle)
			if err != nil {
				response.Economy[name] = fmt.Sprintf("Failed")
			} else {
				response.Economy[name] = fmt.Sprintf("%4.2f L/100km", ((result.Energy/3.6)/89)/result.Distance)
			}
			done<-1
		}(name, schedule)
	}
	for i := 0; i < len(DriveSchedules); i++ {
		<-done
	}
	
    highSpeed := 150
	topSpeedKph := int(accel.TopSpeed*3.6)
    if topSpeedKph < highSpeed {
        highSpeed = topSpeedKph
    }
	
	lowSpeed := highSpeed/5
	speedLen := (highSpeed - lowSpeed) + 1
	speeds := make([]float64, speedLen)
	for i := 0; i < speedLen; i++ {
		speeds[i] = float64(i + lowSpeed)/3.6 //convert kph to m/s for simulator
	}

	response.Efficiency, err = vehicle.EfficiencyAtSpeeds(speeds)
	if err != nil {
		return nil, err
	}
	response.Speeds = speeds
	return &response, nil
} 

type errorResult struct {
	Error string
}

func handler(w http.ResponseWriter, r *http.Request) {
    body, err := ioutil.ReadAll(r.Body)
    if err != nil {
        log.Printf("Failed to read request: %v\n", err)
		return
    }
	
	start := time.Now()
	
	var toSend interface{}
	toSend, err = runSim(body)
	if err != nil {
		toSend = &errorResult{Error:err.Error()}
	} 
	
	fmt.Printf("Took %8.3fs to handle request\n", time.Since(start).Seconds())
    // log.Printf("Handling request:\n%s\n\n", string(body))
			
    data, err := json.Marshal(toSend)
    if err != nil {
        log.Printf("Failed to marshal data: %v\n", toSend)
        return
    }
    
    w.Write(data)
}

func readSchedules(path string) error {
	DriveSchedules = make(map[string]automotiveSim.Schedule)
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
		
		DriveSchedules[file.Name()] = schedule
	}
	return nil
}

func main() {
	err := readSchedules("schedules/")
	if err != nil {
		log.Fatal(err)
	}
    http.HandleFunc("/simulate", handler)
    http.Handle("/", http.FileServer(http.Dir(".")))
    log.Fatal(http.ListenAndServe(":"+os.Getenv("PORT"), nil))
}
