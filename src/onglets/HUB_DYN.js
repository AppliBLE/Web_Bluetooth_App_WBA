// ******************************************************************************
// * @file    HUB_DYN.js
// * @author  MCD Application Team
// *
//  ******************************************************************************
//  * @attention
//  *
//  * Copyright (c) 2022-2023 STMicroelectronics.
//  * All rights reserved.
//  *
//  * This software is licensed under terms that can be found in the LICENSE file
//  * in the root directory of this software component.
//  * If no LICENSE file comes with this software, it is provided AS-IS.
//  *
//  ******************************************************************************
import React, { useState } from 'react';
import iconInfo from '../images/iconInfo.svg';
import { createLogElement } from "../components/Header";
import { OverlayTrigger, Popover } from 'react-bootstrap';
import Zigbee from '../images/Zigbee.png';
import chaud from '../images/chaud.png';
import froid from '../images/froid.PNG';
import mifroid from '../images/mifroid.PNG';
import michaud from '../images/michaud.PNG';


const HUB_DYN = (props) => {
  let ReportedCharacteristic;
  let JoinCharacteristic;
  props.allCharacteristics.map(element => {
    switch (element.characteristic.uuid) {
      case "0000fe92-8e22-4541-9d4c-21edae82ed19":
        ReportedCharacteristic = element;
        ReportedCharacteristic.characteristic.stopNotifications();
        break;
        case "0000fe91-8e22-4541-9d4c-21edae82ed19":
          JoinCharacteristic = element;
            break;
      default:
        console.log("# No characteristics found..");
    }
  });
  document.getElementById("readmeInfo").style.display = "none";

  const [numCards, setNumCards] = useState(5);

  const handleNumCardsChange = (event) => {
    var test = event.target.value;
    if (test < 1) {
      event.target.value = 1;
    } else if (test > 10) {
      event.target.value = 10;
    }
    setNumCards(event.target.value);
  }

  function displayImage(j, imageName) {
    // Récupération de l'élément HTML où afficher l'image
    
    const container = document.getElementById(`${j}myImage`);
    if (!container) {
        console.error("Element with ID 'myImage' not found in HTML document.");
        return;
    }
    // Création de l'élément HTML pour l'image
    const img = document.createElement('img');
    img.src = imageName;
    img.style.position = 'absolute';
    img.style.width = '50px';
    img.style.height = '100px';
    img.style.left = '1000px';
    // Ajout de l'image au conteneur
    container.appendChild(img);
}
  //Notify ON/OFF Button
  async function onNotifyButtonClick() {
    let notifStatus = document.getElementById('notifyButton').innerHTML;

    if (notifStatus === "Notify OFF") {
      console.log('Notification ON');
      //Start Notif
      ReportedCharacteristic.characteristic.startNotifications();
      ReportedCharacteristic.characteristic.oncharacteristicvaluechanged = notifHandler;
      document.getElementById('notifyButton').innerHTML = "Notify ON"
      createLogElement(ReportedCharacteristic, 3, "REPORT ENABLE NOTIFICATION ");
    } else {
      //Stop Notif
      ReportedCharacteristic.characteristic.stopNotifications();
      console.log('Notification OFF');
      document.getElementById('notifyButton').innerHTML = "Notify OFF"
      createLogElement(ReportedCharacteristic, 3, "REPORT DISABLE NOTIFICATION ");
    }
  }

  const onJoinButtonClick = async () => {
    const myWord = new Uint8Array([]);
    ;
    try {
        await JoinCharacteristic.characteristic.writeValue(myWord);
        createLogElement(myWord, 1, "join");
    } catch (error) {
        console.log('Argh! ' + error);
    }
  }

  function notifHandler(event) {
    console.log("Notification received");
    var buf = new Uint8Array(event.target.value.buffer);
    let bufSize = (buf.byteLength) / 4;
    console.log(buf);
    console.log(bufSize);
    createLogElement(buf, 1, "NOTIFICATION RECEIVED");
    if (buf[0] == 1) {
      console.log('Anomaly detected');
    } else {
      for (var j = 0; j < bufSize; j++) {
        var valeur = buf[3 + 4 * j];

        if (buf[3 + 4 * j] > 127) { valeur = -(256 - buf[3 + 4 * j]); }
        document.getElementById(`${j}sensorName`).textContent = "SENSOR " + parseInt(j + 1);
        document.getElementById(`${j}sensorId`).textContent = "Sensor ID (Zigbee ntwrk adresse device) : 0x" + buf[4 * j].toString(16) + buf[1 + 4 * j].toString(16);
        document.getElementById(`${j}temperature`).textContent = "Temperature : " + valeur + "°C";
       
        if (valeur < 20) {
          displayImage(j, froid);
        } else 
        
        if (valeur >= 20 && valeur < 22) {
          displayImage(j, mifroid);
        } else 
        
        if (valeur >= 22 && valeur < 25) {
          displayImage(j, michaud);
        } else {
          displayImage(j, chaud);
        }               
      }
    }
  }

  // Tooltips
  function generateCards() {
    var cardsContainer = document.getElementById("cards-container");
    cardsContainer.innerHTML = ""; // effacer les cartes précédentes
    for (var i = 0; i < numCards; i++) {

      var card = `
            <div id="${i}sensorName">SENSOR UNKNOW</div>
            <div className="col-xs-6 col-sm-6 col-md-4 col-lg-4 m-2"></div>
            <div id="${i}myImage"></div>
            
            <div class="card-body">
              <p class="card-text" id="${i}name"> </p>
              <p class="card-text" id="${i}sensorId">Sensor ID (Zigbee ntwrk adresse device) : UNKNOW</p>
              <p class="card-text" id="${i}temperature">Temperature value in Celcius : UNKNOW</p>   
              </div>
              <button class="btn btn-primary" id="${i}renameBtn" onclick=
              "
              document.getElementById('${i}renameBtn').classList.add('d-none');
              document.getElementById('${i}renameForm').classList.remove('d-none');
              document.getElementById('${i}newName').focus();
              "
            >Rename</button>       
            <div class="card-footer">
              <small class="text-muted"></small>
            </div>
            
            <div id='${i}renameForm' class="d-none">
            <label>
              <form onsubmit=
              "
              var newName = document.getElementById('${i}newName').value;
              if (newName !== '') 
                  {
                  console.log(newName);
                  document.getElementById('${i}name').innerHTML = newName;
                  document.getElementById('${i}renameBtn').classList.remove('d-none');
                  document.getElementById('${i}renameForm').classList.add('d-none');
                  } 
                return false;
                ">
                <input type="text" id="${i}newName" placeholder="Enter a new name">
                <button type="submit">Rename</button>
                <button type="button" onclick=
                  "
                  document.getElementById('${i}renameBtn').classList.remove('d-none');
                  document.getElementById('${i}renameForm').classList.add('d-none');
                  "
                  >Cancel</button>
              </form>
              </label>
            </div>
            `;

      cardsContainer.innerHTML += card;
    }
    document.getElementById("numCards").innerText = numCards; // mettre à jour la valeur affichée
    ReportedCharacteristic.characteristic.startNotifications();
    ReportedCharacteristic.characteristic.oncharacteristicvaluechanged = notifHandler;
    document.getElementById('notifyButton').innerHTML = "Notify ON";
  }

  const popoverNotifyButton = (
    <Popover id="popover-trigger-hover-focus" title="Popover bottom">
      <strong>Info :</strong> Enable the reception of notifications from the connected device. <br />
      Example : <br />
      Enable the notifications then push SW1.
    </Popover>
  );

  return (
    <div className="container-fluid">
      <img className="Zigbee" src={Zigbee} style={{ width: '200px', height: '50px' }}></img>
      <div className="container">
        <div className='row justify-content-center mt-3'>
          <div className='d-grid col-xs-6 col-sm-6 col-md-4 col-lg-4 m-2' >

            <div className='d-flex flex-row'>
              <button className="defaultButton w-100" type="button" onClick={onNotifyButtonClick} id="notifyButton">Notify OFF</button><div id="containerimg"></div>
              <button className="defaultButton w-100" type="button" onClick={onJoinButtonClick} id="JoinButton">Join</button><div id="containerimg"></div>
              <span>
                <OverlayTrigger
                  trigger={['hover', 'focus']}
                  placement="bottom"
                  overlay={popoverNotifyButton}>
                  <img className="iconInfo" src={iconInfo}></img>
                </OverlayTrigger>
              </span>
            </div>
            
            <div className="row justify-content-center mt-3">
              <div className="col-xs-6 col-sm-6 col-md-4 col-lg-4 m-2"></div>
                <div className="input-group">
                  <span className="d-flex flex-row"></span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={numCards}
                    onChange={handleNumCardsChange}
                  />
                  
                    <div className="d-flex flex-row">
                      <button className="defaultButton" class="container-fluid" type="button" onClick={generateCards}>Number of sensor</button>
                    </div>

                </div>
            </div>
            

            <div className='row justify-content-center mt-3'>
              <div className='col-xs-6 col-sm-6 col-md-4 col-lg-4 m-2'></div>
              <span className="container-fluid" >Set number of sensor :</span>
                <p class="container-fluid" id='numCards' >UNKNOW</p>
            </div>
          </div>
  
        </div>

        <div className="card text-dark bg-light mb-3">
          <div class="container-fluid" style={{ position: "relative" }}>
            <div id='cards-container'></div>
          </div>
        </div>

      </div>
    </div>
  );


};

export default HUB_DYN;