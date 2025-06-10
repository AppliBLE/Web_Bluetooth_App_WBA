import React, { useState, useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import { createLogElement } from "../components/Header";
import HRlogo from '../images/HRlogo.png';

Chart.register(...registerables);

const PulseOximeter = (props) => {
    const GRAPH_MAX_LABELS = 25;
    let GHSP_Characteristic_Write_Indicate;
    let LHO_Characteristic_Notify_Indicate;
    let oxygenSaturationDataSet = [];
    let oxygenSaturationTime = [];
    
    const oxygenSaturationChartContainer = useRef(null);
    const [oxygenSaturationChartInstance, setOxygenSaturationChartInstance] = useState(null);
    const [heartRateValue, setHeartRateValue] = useState(0); // State pour afficher le Heart Rate en direct

    useEffect(() => {
        if (oxygenSaturationChartContainer && oxygenSaturationChartContainer.current) {
            const newOxygenSaturationChartInstance = new Chart(oxygenSaturationChartContainer.current, {
                type: "line",
                data: {
                    labels: [],
                    datasets: [{
                        borderColor: '#03234B', // Couleur bleue pour le graphique
                        backgroundColor: '#F8F9FA',
                        data: oxygenSaturationDataSet,
                    }],
                },
                options: {
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Pulse Oximeter Chart',
                            font: { size: 20 },
                        },
                    },
                },
            });
            setOxygenSaturationChartInstance(newOxygenSaturationChartInstance);
        }
    }, [oxygenSaturationChartContainer]);

    const updateChart = (oxygenSaturationValue) => {
        const currentTime = new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        });

        if (oxygenSaturationDataSet.length >= GRAPH_MAX_LABELS) {
            oxygenSaturationDataSet.pop();
            oxygenSaturationDataSet.unshift(oxygenSaturationValue);
            oxygenSaturationTime.pop();
            oxygenSaturationTime.unshift(currentTime);
        } else {
            oxygenSaturationDataSet.unshift(oxygenSaturationValue);
            oxygenSaturationTime.unshift(currentTime);
        }

        if (oxygenSaturationChartInstance) {
            oxygenSaturationChartInstance.data.datasets[0].data = oxygenSaturationDataSet;
            oxygenSaturationChartInstance.data.labels = oxygenSaturationTime;
            oxygenSaturationChartInstance.update();
        }
    };

    props.allCharacteristics.map(element => {
        switch (element.characteristic.uuid) {
            case "00002bf4-0000-1000-8000-00805f9b34fb":
                GHSP_Characteristic_Write_Indicate = element;
                GHSP_Characteristic_Write_Indicate.characteristic.startNotifications();
                break;
            case "00002b8b-0000-1000-8000-00805f9b34fb":
                LHO_Characteristic_Notify_Indicate = element;
                LHO_Characteristic_Notify_Indicate.characteristic.startNotifications();
                break;
            default:
                console.log("# No characteristics found..");
        }
    });

    async function onStartMeasurementClick() {
        let myWord = new Uint8Array(1);
        myWord[0] = 0x1;

        try {
            await GHSP_Characteristic_Write_Indicate.characteristic.writeValue(myWord);
            createLogElement(myWord, 1, "Start Measure");
        }
        catch (error) {
            console.log('Error: ' + error);
        }

        console.log('Start Heart Rate and Oximeter Measurement');
        LHO_Characteristic_Notify_Indicate.characteristic.oncharacteristicvaluechanged = notifHandler;
    }

    function notifHandler(event) {
        console.log("Notification Received");
        var buf = new Uint8Array(event.target.value.buffer);
        console.log(buf);
        
        const oxygenSaturation = (buf[32] | (buf[33] << 8) | (buf[34] << 16) | (buf[35] << 24));
        const heartRate = (buf[buf.length - 4] | (buf[buf.length - 3] << 8) | (buf[buf.length - 2] << 16) | (buf[buf.length - 1] << 24));

        setHeartRateValue(heartRate); // Met à jour la valeur du Heart Rate
        updateChart(oxygenSaturation); // Met à jour le graphique du Pulse Oximeter
    }

    return (
        <div className="container-fluid">
            <div className='row justify-content-center mt-3 mb-3'>
                <div className='d-grid col-xs-6 col-sm-6 col-md-4 col-lg-4 m-2'>
                    <button className="defaultButton w-100" type="button" onClick={onStartMeasurementClick} id="startButton">Start Measurement</button>
                </div>
            </div>
            <div className="row justify-content-center">
                <div className="col-12 text-center mb-3">
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        color: '#03234B',
                        padding: '10px',
                        borderRadius: '5px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        display: 'inline-block', 
                        width: 'auto',
                    }}>
                     <img className="appsLogo" src={HRlogo} style={{ marginRight: '10px' }}></img>
                        {heartRateValue} bpm
                    </div>
                </div>
            </div>
            <div className="card text-dark bg-light mb-3">
                <div className="card-body">
                    <div style={{ height: "400px", width: "100%" }}>  
                        <canvas ref={oxygenSaturationChartContainer}></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PulseOximeter;