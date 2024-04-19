// ******************************************************************************
// * @file    WifiCommissioning.js
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


const WifiCommissioning = (props) => {
    let WiFi_Control;
    let WiFi_Configure;
    let WiFi_AP_list;
    let Monitoring;
    var ssids;
    var ssids;
    var selectedSsid;

    props.allCharacteristics.map(element => {
        switch (element.characteristic.uuid) {
            case "0000fe9b-8e22-4541-9d4c-21edae82ed19":
              WiFi_Control = element;
            break;
            case "0000fe9c-8e22-4541-9d4c-21edae82ed19":
              WiFi_Configure = element;
            break;
            case "0000fe9d-8e22-4541-9d4c-21edae82ed19":
              WiFi_AP_list = element;
            break;
            case "0000fe9e-8e22-4541-9d4c-21edae82ed19":
              Monitoring = element;
            break;
            default:
            console.log("# No characteristics found..");
        }
    });
    

    document.getElementById("readmeInfo").style.display = "none";

    //Write Wifi_Control to start scan WiFi
    async function ScanRequestButtonClick() {
      let myWord = new Uint8Array(1);
      myWord[0] = 0x1;

      try {
          await WiFi_Control.characteristic.writeValue(myWord);
          createLogElement(myWord, 1, "Start scanning");
      }
      catch (error) {
          console.log('2 : Argh! ' + error);
      }

      WiFi_AP_list.characteristic.startNotifications();
      WiFi_AP_list.characteristic.oncharacteristicvaluechanged = notif_Ap_List_Handler;

      console.log("Notification enabled");
    }


    // Send SSID and pwd to connect
    async function ConnectRequestButtonClick() {
      let encoder = new TextEncoder();
      let wifiSelectedBytes = encoder.encode(document.getElementById("Wifi_selected").value);
      
      let myWord = new Uint8Array(1+ wifiSelectedBytes.length);

      
      //Send SSiD
      myWord.set([0x01], 0);
      myWord.set(wifiSelectedBytes, 1);
      

      try {
        await WiFi_Configure.characteristic.writeValue(myWord);
        //createLogElement(myWord, 1, "Start scanning");
        console.log("SSID send : " + myWord);
      }
        catch (error) {
        console.log('2 : Argh! ' + error);
      }
      

      // Send pwd 
      wifiSelectedBytes = encoder.encode(document.getElementById("pwd_text").value);

      let pwd = new Uint8Array(2 + wifiSelectedBytes.length);
      
      pwd.set([0x02], 0);
      pwd.set(wifiSelectedBytes, 1);

      try {
        await WiFi_Configure.characteristic.writeValue(pwd);
        //createLogElement(myWord, 1, "Start scanning");
        console.log("pwd send : " + pwd);
      }
        catch (error) {
        console.log('2 : Argh! ' + error);
      }

      //Connect Request
      
    }


    function afficherWifi() {
      var wifiList = document.getElementById("wifiList");
      wifiList.innerHTML = ""; // Effacer le contenu précédent
    
      for (var i = 0; i < ssids.length; i++) {
        console.log(ssids);
        var ssid = String.fromCharCode.apply(null, ssids[i].ssid);
        var wifiItem = document.createElement("div");
        wifiItem.className = "wifiItem";
        wifiItem.textContent = ssid + " (Canal: " + ssids[i].channel + ", Signal: " + ssids[i].signal + ")";
        wifiItem.onclick = function(ssid,security) {
          
          return function() {
            // Ajouter la logique de sélection ici
            selectedSsid = ssid;
            document.getElementById("Wifi_selected").value = ssid;
            console.log("SSID sélectionné : " + ssid);
            console.log(security);
            updateSecurityModes(security);
          };
        }(ssid, ssids[i].security);
        wifiList.appendChild(wifiItem);
      }
    }

    const SECURITY_MODES = {
      //0: 'WLAN_SECURITY_WEP',
      1: 'WLAN_SECURITY_WPA_PSK',
      2: 'WLAN_SECURITY_WPA_EAP',
      3: 'WLAN_SECURITY_WPA2_PSK',
      4: 'WLAN_SECURITY_WPA2_EAP',
      5: 'WLAN_SECURITY_WPA3',
      6: 'WLAN_SECURITY_OWE',
      //7: 'WLAN_SECURITY_DPP',
      //8: 'WLAN_SECURITY_PSK_SHA256',
      9: 'WLAN_SECURITY_WPA3_EAP',
      //10: 'WLAN_SECURITY_SAE_PK',
      //11: 'WLAN_SECURITY_SAE_H2E'
    };

    function updateSecurityModes(securityByte) {
      var securitySelect = document.getElementById('security_mode');
      securitySelect.innerHTML = ''; // Effacer les options précédentes
    
      // Générer les options basées sur les bits de sécurité
      for (var bit = 0; bit < 12; bit++) {
        if (securityByte & (1 << bit)) { // Si le bit est à 1
          var modeName = SECURITY_MODES[bit];
          if (modeName) {
            var option = document.createElement('option');
            option.value = modeName;
            option.textContent = modeName;
            securitySelect.appendChild(option);
          }
        }
      }
    }

    function notif_Ap_List_Handler(event){
      console.log("Notification received");
      var buf = new Uint8Array(event.target.value.buffer);
      
      createLogElement(buf, 1, "FanControl Status NOTIFICATION RECEIVED");
      
      console.log(buf);

      if (!ssids) {
        ssids = []; // Initialize
      }

      var buf_channel = [];
      var buf_signal_level = [];
      var buf_sec_flag = [];
      var buf_name = [];
      
      var i=1;
      buf_channel = buf[i];
      i = i + 1;
      buf_signal_level = buf[i] + (buf[i+1] << 8);
      if (buf_signal_level & 0x8000) {
        buf_signal_level = buf_signal_level - 0x10000;
      }
      i = i + 2;
      buf_sec_flag = buf[i] + (buf[i+1] << 8) + (buf[i+2] << 16) + (buf[i+3] << 24);
      i = i + 4;
      console.log(i);
      
      //var i=8;
      while (buf[i] > 0){
        buf_name[i-8] = buf[i];
        i++;
      }


      console.log(buf_name);
      //ssids.push(buf_name);

      ssids.push({
        ssid: buf_name,
        channel: buf_channel,
        signal: buf_signal_level,
        security: buf_sec_flag
      });

      ssids.sort(function(a, b) {
        return b.signal - a.signal; // Compare les niveaux de signal
      });

      afficherWifi()
    }




    const popoverScanButton = (
      <Popover id="popover-trigger-hover-focus" title="Popover bottom">
        <strong>Info :</strong> Start scanning WiFi <br />
      </Popover>
    );
    
    const popoverConnectionButton = (
      <Popover id="popover-trigger-hover-focus" title="Popover bottom">
        <strong>Info :</strong> Connect to the WiFi selected<br />
      </Popover>
    );

    return (
      <div className="container-fluid">
        <div className="container">
    
          <div className="row justify-content-center mt-3">
            <div className="col-xs-12 col-sm-12 col-md-6 col-lg-4 m-2 mb-6">
              <div className="d-flex flex-row">
                <button className="defaultButton w-100" type="button" onClick={ScanRequestButtonClick} id="scanButton">Wi-Fi Scan Request</button>
                <span>
                  <OverlayTrigger
                    trigger={["hover", "focus"]}
                    placement="bottom"
                    overlay={popoverScanButton}
                  >
                    <img className="iconInfo" src={iconInfo} alt="Info icon" />
                  </OverlayTrigger>
                </span>
              </div>
              <div className="mt-3">
                <label htmlFor="Wifi_selected">WiFi Selected : </label>
                <input type="text" id="Wifi_selected" value="Select your wifi" readOnly style={{backgroundColor: "#f2f2f2"}}/>
              </div>
              <div className="mt-3">
                <label htmlFor="pwd_text">Password : </label>
                <input type="text" id="pwd_text" />
              </div>
              <div className="mt-3">
                <label htmlFor="security_mode">Security Mode : </label>
                <select id="security_mode" className="form-control">
                </select>
              </div>
              <div className="d-flex flex-row mt-3">
                <button className="defaultButton w-100" type="button" onClick={ConnectRequestButtonClick} id="connectButton">Wi-Fi Connection Request</button>
                <span>
                  <OverlayTrigger
                    trigger={["hover", "focus"]}
                    placement="bottom"
                    overlay={popoverConnectionButton}
                  >
                    <img className="iconInfo" src={iconInfo} alt="Info icon" />
                  </OverlayTrigger>
                </span>
              </div>
            </div>
            <div className="d-grid col-xs-12 col-sm-12 col-md-6 col-lg-4 m-2">
              <div className="wifiListContainer">
                <div className="wifiList" id="wifiList"></div>
              </div>
            </div>
          </div>
    
        </div>
      </div>
    );


};

export default WifiCommissioning;