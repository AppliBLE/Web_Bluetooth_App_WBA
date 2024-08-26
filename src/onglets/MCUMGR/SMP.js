// ******************************************************************************
// * @file    SMP.js
// * @author  MCD Application Team
// *
//  ******************************************************************************
// * @attention
// *
// * Copyright (c) 2022-2023 STMicroelectronics.
// * All rights reserved.
// *
// * This software is licensed under terms that can be found in the LICENSE file
// * in the root directory of this software component.
// * If no LICENSE file comes with this software, it is provided AS-IS.
// *
//  ******************************************************************************
import React, { useState, useEffect } from 'react';
// import * as CBOR from 'cbor';
//import * as CBOR from 'cbor-web';
// Inclure la bibliothèque CBOR
const CBOR = require('./cbor');












// Opcodes
const MGMT_OP_READ = 0;
const MGMT_OP_READ_RSP = 1;
const MGMT_OP_WRITE = 2;
const MGMT_OP_WRITE_RSP = 3;

// Groups
const MGMT_GROUP_ID_OS = 0;
const MGMT_GROUP_ID_IMAGE = 1;
const MGMT_GROUP_ID_STAT = 2;
const MGMT_GROUP_ID_CONFIG = 3;
const MGMT_GROUP_ID_LOG = 4;
const MGMT_GROUP_ID_CRASH = 5;
const MGMT_GROUP_ID_SPLIT = 6;
const MGMT_GROUP_ID_RUN = 7;
const MGMT_GROUP_ID_FS = 8;
const MGMT_GROUP_ID_SHELL = 9;

// OS group
const OS_MGMT_ID_ECHO = 0;
const OS_MGMT_ID_CONS_ECHO_CTRL = 1;
const OS_MGMT_ID_TASKSTAT = 2;
const OS_MGMT_ID_MPSTAT = 3;
const OS_MGMT_ID_DATETIME_STR = 4;
const OS_MGMT_ID_RESET = 5;

// Image group
const IMG_MGMT_ID_STATE = 0;
const IMG_MGMT_ID_UPLOAD = 1;
const IMG_MGMT_ID_FILE = 2;
const IMG_MGMT_ID_CORELIST = 3;
const IMG_MGMT_ID_CORELOAD = 4;
const IMG_MGMT_ID_ERASE = 5;

class MCUManager {
    constructor(di = {}) {
        this.SERVICE_UUID = '8d53dc1d-1db7-4cd3-868b-8a527460aa84';
        this.CHARACTERISTIC_UUID = 'da2e7828-fbce-4e01-ae9e-261174997c48';
        this._mtu = 140;
        this._device = null;
        this._service = null;
        this._characteristic = null;
        this._connectCallback = null;
        this._connectingCallback = null;
        this._disconnectCallback = null;
        this._messageCallback = null;
        this._imageUploadProgressCallback = null;
        this._uploadIsInProgress = false;
        this._buffer = new Uint8Array();
        this._logger = di.logger || { info: console.log, error: console.error };
        this._seq = 0;
        this._userRequestedDisconnect = false;
    }
    async _requestDevice(filters) {
        const params = {
            acceptAllDevices: true,
            optionalServices: [this.SERVICE_UUID]
        };
        if (filters) {
            params.filters = filters;
            params.acceptAllDevices = false;
        }
        return navigator.bluetooth.requestDevice(params);
    }
    async connect() {
        try {
            this._connect(0);
        } catch (error) {
            this._logger.error(error);
            await this._disconnected();
            return;
        }
    }
    _connect() {
        setTimeout(async () => {
            try {
                await this._connected();
                if (this._uploadIsInProgress) {
                    this._uploadNext();
                }
            } catch (error) {
                console.log(" Catch Error..... ");
                this._logger.error(error);
                await this._disconnected();
            }
        }, 1000);
    }
    disconnect() {
        this._userRequestedDisconnect = true;
        return this._device.gatt.disconnect();
    }
    onConnecting(callback) {
        this._connectingCallback = callback;
        return this;
    }
    onConnect(callback) {
        this._connectCallback = callback;
        return this;
    }
    onDisconnect(callback) {
        this._disconnectCallback = callback;
        return this;
    }
    onMessage(callback) {
        this._messageCallback = callback;
        return this;
    }
    onImageUploadProgress(callback) {
        this._imageUploadProgressCallback = callback;
        return this;
    }
    onImageUploadFinished(callback) {
        this._imageUploadFinishedCallback = callback;
        return this;
    }
    async _connected() {
        console.log("############");
        console.log("#_CONNECTED#");
        console.log("############");
        if (this._connectCallback) {
            this._connectCallback();
        }
    }

    async _disconnected() {
        this._logger.info('Disconnected.');
        if (this._disconnectCallback) this._disconnectCallback();
        this._device = null;
        this._service = null;
        this._characteristic = null;
        this._uploadIsInProgress = false;
        this._userRequestedDisconnect = false;
    }
    get name() {
        return this._device && this._device.name;
    }
    async _sendMessage(op, group, id, data) {
        const _flags = 0;
        let encodedData = [];
        if (typeof data !== 'undefined') {
            encodedData = [...new Uint8Array(CBOR.encode(data))];
        }
        const length_lo = encodedData.length & 255;
        const length_hi = encodedData.length >> 8;
        const group_lo = group & 255;
        const group_hi = group >> 8;
        const message = [op, _flags, length_hi, length_lo, group_hi, group_lo, this._seq, id, ...encodedData];
        console.log("=+++ Send Message ++++=")
        console.log("EncodedData: ", encodedData);
        console.log('Operation:', op);
        console.log('Flags:', _flags);
        console.log('Length High:', length_hi);
        console.log('Length Low:', length_lo);
        console.log('Group High:', group_hi);
        console.log('Group Low:', group_lo);
        console.log('Sequence:', this._seq);
        console.log('ID:', id);
        console.log("=++++++++++++++++++++=")

        //console.log('>' + message.map(x => x.toString(16).padStart(2, '0')).join(' '));
        await this._characteristic.writeValueWithoutResponse(Uint8Array.from(message));
        this._seq = (this._seq + 1) % 256;
    }
    _notification(event) {
        const message = new Uint8Array(event.target.value.buffer);
        //console.log(message);
        //console.log('<' + [...message].map(x => x.toString(16).padStart(2, '0')).join(' '));
        this._buffer = new Uint8Array([...this._buffer, ...message]);
        const messageLength = this._buffer[2] * 256 + this._buffer[3];
        if (this._buffer.length < messageLength + 8) return;
        this._processMessage(this._buffer.slice(0, messageLength + 8));
        this._buffer = this._buffer.slice(messageLength + 8);
    }
    _processMessage(message) {
        const [op, _flags, length_hi, length_lo, group_hi, group_lo, _seq, id] = message;
        const data = CBOR.decode(message.slice(8).buffer);
        const length = length_hi * 256 + length_lo;
        const group = group_hi * 256 + group_lo;
        console.log("===Process Message===")
        console.log('Operation:', op);
        console.log('Flags:', _flags);
        console.log('Sequence:', _seq);
        console.log("group : ", group);
        console.log("length : ", length);
        console.log("data : ", data);
        console.log("id : ", id);
        console.log("====================")



        if (group === MGMT_GROUP_ID_IMAGE && id === IMG_MGMT_ID_UPLOAD && (data.rc === 0 || data.rc === undefined) && data.off) {
            this._uploadOffset = data.off;
            this._uploadNext();
            return;
        }
        if (this._messageCallback) this._messageCallback({ op, group, id, data, length });
    }
    cmdReset() {
        return this._sendMessage(MGMT_OP_WRITE, MGMT_GROUP_ID_OS, OS_MGMT_ID_RESET);
    }

    cmdImageState() {
        return this._sendMessage(MGMT_OP_READ, MGMT_GROUP_ID_IMAGE, IMG_MGMT_ID_STATE);
    }
    cmdImageErase() {
        return this._sendMessage(MGMT_OP_WRITE, MGMT_GROUP_ID_IMAGE, IMG_MGMT_ID_ERASE, {});
    }
    cmdImageTest(hash) {
        return this._sendMessage(MGMT_OP_WRITE, MGMT_GROUP_ID_IMAGE, IMG_MGMT_ID_STATE, { hash, confirm: false });
    }
    cmdImageConfirm(hash) {
        return this._sendMessage(MGMT_OP_WRITE, MGMT_GROUP_ID_IMAGE, IMG_MGMT_ID_STATE, { hash, confirm: true });
    }
    _hash(image) {
        return crypto.subtle.digest('SHA-256', image);
    }
    async _uploadNext() {
        if (this._uploadOffset >= this._uploadImage.byteLength) {
            this._uploadIsInProgress = false;
            this._imageUploadFinishedCallback();
            return;
        }

        const nmpOverhead = 8;
        const message = { data: new Uint8Array(), off: this._uploadOffset };
        if (this._uploadOffset === 0) {
            message.len = this._uploadImage.byteLength;
            message.sha = new Uint8Array(await this._hash(this._uploadImage));
        }
        this._imageUploadProgressCallback({ percentage: Math.floor(this._uploadOffset / this._uploadImage.byteLength * 100) });

        const length = this._mtu - CBOR.encode(message).byteLength - nmpOverhead;

        message.data = new Uint8Array(this._uploadImage.slice(this._uploadOffset, this._uploadOffset + length));

        this._uploadOffset += length;

        this._sendMessage(MGMT_OP_WRITE, MGMT_GROUP_ID_IMAGE, IMG_MGMT_ID_UPLOAD, message);
    }
    async cmdUpload(image, slot = 0) {
        if (this._uploadIsInProgress) {
            this._logger.error('Upload is already in progress.');
            return;
        }
        this._uploadIsInProgress = true;

        this._uploadOffset = 0;
        this._uploadImage = image;
        this._uploadSlot = slot;

        this._uploadNext();

    }
    async imageInfo(image) {
        // https://interrupt.memfault.com/blog/mcuboot-overview#mcuboot-image-binaries

        const info = {};
        const view = new Uint8Array(image);

        // check header length
        if (view.length < 32) {
            throw new Error('Invalid image (too short file)');
        }

        // check MAGIC bytes 0x96f3b83d
        if (view[0] !== 0x3d || view[1] !== 0xb8 || view[2] !== 0xf3 || view[3] !== 0x96) {
            throw new Error('Invalid image (wrong magic bytes)');
        }

        // check load address is 0x00000000
        if (view[4] !== 0x00 || view[5] !== 0x00 || view[6] !== 0x00 || view[7] !== 0x00) {
            throw new Error('Invalid image (wrong load address)');
        }

        const headerSize = view[8] + view[9] * 2 ** 8;

        // check protected TLV area size is 0
        //if (view[10] !== 0x00 || view[11] !== 0x00) {
        //    throw new Error('Invalid image (wrong protected TLV area size)');
        //}

        const imageSize = view[12] + view[13] * 2 ** 8 + view[14] * 2 ** 16 + view[15] * 2 ** 24;
        info.imageSize = imageSize;

        // check image size is correct
        if (view.length < imageSize + headerSize) {
            throw new Error('Invalid image (wrong image size)');
        }

        // check flags is 0x00000000
        //if (view[16] !== 0x00 || view[17] !== 0x00 || view[18] !== 0x00 || view[19] !== 0x00) {
        //    throw new Error('Invalid image (wrong flags)');
        //}

        const version = `${view[20]}.${view[21]}.${view[22] + view[23] * 2 ** 8}`;
        info.version = version;

        info.hash = [...new Uint8Array(await this._hash(image.slice(0, imageSize + 32)))].map(b => b.toString(16).padStart(2, '0')).join('');

        return info;
    }
}





const SMP = (props) => {

    useEffect(() => {
        const script = document.createElement('script');
        script.src = "js/cbor.js";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);


    // Initialisation de MCUManager
    const mcumgr = new MCUManager();


    useEffect(() => {
        const initialize = async () => {
            await mcumgr.connect();
        };
        initialize();
    }, []);

    // Initialization of Bluetooth characteristics
    props.allCharacteristics.forEach(element => {
        switch (element.characteristic.uuid) {
            case "da2e7828-fbce-4e01-ae9e-261174997c48":
                const IndicateCharacteristic = element;

                mcumgr._service = mcumgr.SERVICE_UUID;
                mcumgr._characteristic = element.characteristic;
                console.log(mcumgr._characteristic);
                IndicateCharacteristic.characteristic.oncharacteristicvaluechanged = mcumgr._notification.bind(mcumgr);
                IndicateCharacteristic.characteristic.startNotifications();
                console.log("Characteristic UUID SMP - Enable Notifications ");

                break;

            default:
                console.log("# No characteristics found..");

        }
        // Hide the info element on startup
        document.getElementById("readmeInfo").style.display = "none";

    });



    useEffect(() => {

        let file = null;
        let fileData = null;
        let images = [];

        const resetButton = document.getElementById('button-reset');
        const imageStateButton = document.getElementById('button-image-state');
        const eraseButton = document.getElementById('button-erase');
        const testButton = document.getElementById('button-test');
        const confirmButton = document.getElementById('button-confirm');
        const imageList = document.getElementById('image-list');
        const fileInfo = document.getElementById('file-info');
        const fileStatus = document.getElementById('file-status');
        const fileImage = document.getElementById('file-image');
        const fileUpload = document.getElementById('file-upload');
        const progressBar = document.getElementById('progress-bar');
        const progressBarContainer = document.getElementById('progress-container');

        mcumgr.onConnect(() => {
            mcumgr.cmdImageState();
            progressBarContainer.style.display = 'none';
        });

        mcumgr.onMessage(({ op, group, id, data, length }) => {
            switch (group) {
                case MGMT_GROUP_ID_OS:
                    switch (id) {
                        case OS_MGMT_ID_ECHO:
                            alert(data.r);
                            break;
                        case OS_MGMT_ID_TASKSTAT:
                            console.table(data.tasks);
                            break;
                        case OS_MGMT_ID_MPSTAT:
                            console.log(data);
                            break;
                    }
                    break;
                case MGMT_GROUP_ID_IMAGE:
                    switch (id) {
                        case IMG_MGMT_ID_STATE:
                            images = data.images;
                            let imagesHTML = '';
                            images.forEach(image => {
                                const statusClass = image.active ? 'status-active' : 'status-standby';
                                const tableClass = image.active ? 'table-active' : 'table-standby';
                                const thClass = image.active ? 'th-active' : 'th-standby';
                                imagesHTML += `<div class="image ${image.active ? 'active' : 'standby'}">`;
                                imagesHTML += `<h2><span class="${statusClass}"> Slot #${image.slot} ${image.active ? 'ACTIVE' : 'STANDBY'}</span></h2>`;

                                imagesHTML += `<table class="center-table ${tableClass}">`;
                                const hashStr = Array.from(image.hash).map(byte => byte.toString(16).padStart(2, '0')).join('');
                                imagesHTML += `<tr><th class="${thClass}">Version</th><td>v${image.version}</td></tr>`;
                                imagesHTML += `<tr><th class="${thClass}">Bootable</th><td>${image.bootable}</td></tr>`;
                                imagesHTML += `<tr><th class="${thClass}">Confirmed</th><td>${image.confirmed}</td></tr>`;
                                imagesHTML += `<tr><th class="${thClass}">Pending</th><td>${image.pending}</td></tr>`;
                                imagesHTML += `<tr><th class="${thClass}">Hash</th><td>${hashStr}</td></tr>`;
                                imagesHTML += '</table>';
                                imagesHTML += '</div>';
                            });
                            imageList.innerHTML = imagesHTML;

                            testButton.disabled = !(data.images.length > 1 && data.images[1].pending === false);
                            confirmButton.disabled = !(data.images.length > 0 && data.images[0].confirmed === false);
                            break;
                    }
                    break;
                default:
                    console.log('Unknown group');
                    break;
            }
        });

        mcumgr.onImageUploadProgress(({ percentage }) => {
            //fileStatus.innerText = `Uploading... ${percentage}%`;
            fileStatus.style.display = 'none';
            progressBar.style.width = `${percentage}%`;
            progressBar.innerText = `${percentage}%`;
        });

        mcumgr.onImageUploadFinished(() => {
            fileStatus.innerText = 'Upload complete';
            fileInfo.innerHTML = '';
            fileImage.value = '';
            progressBar.style.width = '100%';
            progressBar.innerText = '100%';
            mcumgr.cmdImageState();

            setTimeout(() => {
                progressBarContainer.style.display = 'none';
            }, 2000);
        });

        fileImage.addEventListener('change', () => {
            file = fileImage.files[0];
            fileData = null;
            const reader = new FileReader();
            reader.onload = async () => {
                fileData = reader.result;
                try {
                    const info = await mcumgr.imageInfo(fileData);
                    let table = `<table class="table-newImage center-table">`;
                    table += `<tr><th>Version</th><td>v${info.version}</td></tr>`;
                    table += `<tr><th>Hash</th><td>${info.hash}</td></tr>`;
                    table += `<tr><th>File Size</th><td>${fileData.byteLength} bytes</td></tr>`;
                    table += `<tr><th>Size</th><td>${info.imageSize} bytes</td></tr>`;
                    table += `</table>`;

                    fileStatus.innerText = 'Ready to upload';
                    fileInfo.innerHTML = table;
                    fileUpload.disabled = false;
                } catch (e) {
                    fileInfo.innerHTML = `ERROR: ${e.message}`;
                }
            };
            reader.readAsArrayBuffer(file);
        });

        fileUpload.addEventListener('click', event => {
            fileUpload.disabled = true;
            progressBarContainer.style.display = 'block';
            event.stopPropagation();
            if (file && fileData) {
                mcumgr.cmdUpload(fileData);
                progressBar.style.width = '0%';
                progressBar.innerText = '0%';
            }
        });

        resetButton.addEventListener('click', async () => {
            await mcumgr.cmdReset();
        });

        imageStateButton.addEventListener('click', async () => {
            await mcumgr.cmdImageState();
        });

        eraseButton.addEventListener('click', async () => {
            await mcumgr.cmdImageErase();
        });

        testButton.addEventListener('click', async () => {
            if (images.length > 1 && images[1].pending === false) {
                await mcumgr.cmdImageTest(images[1].hash);
            }
        });

        confirmButton.addEventListener('click', async () => {
            if (images.length > 0 && images[0].confirmed === false) {
                await mcumgr.cmdImageConfirm(images[0].hash);
            }
        });


    },);

    return (
        <div className="container-fluid">
            <div className="container">
                <div id="image-list"></div>
                <div>
                    <button id="button-image-state" type="submit" className="defaultButton SMP-Button-Margin"><i className="bi-arrow-down-circle"></i> Refresh</button>
                    <button id="button-erase" type="submit" className="defaultButton SMP-Button-Margin"><i className="bi-eraser-fill"></i> Erase</button>
                    <button id="button-test" type="submit" className="defaultButton SMP-Button-Margin" disabled><i className="bi-question-square"></i> Test</button>
                    <button id="button-confirm" type="submit" className="defaultButton SMP-Button-Margin" disabled><i className="bi-check2-square"></i> Confirm</button>
                    <button id="button-reset" type="submit" className="defaultButton SMP-Button-Margin"><i className="bi-arrow-clockwise"></i> Reset</button>
                </div>
                <hr />
                <h3>Image Upload</h3>
                <div className="form-group">
                    <input type="file" class="form-control" id="file-image" />
                </div>
                <div className="image">
                    <div class="form-group">
                        <div id="file-status">Select image file</div>
                        <div id="file-info"></div>
                    </div>
                    <div class="progress" id="progress-container">
                        <div id="progress-bar" class="progress-bar"> </div>
                    </div>
                    <button className="defaultButton SMP-Button-Margin" id="file-upload" disabled><i className="bi-upload"></i> Upload</button>


                </div>

            </div>
        </div>
    );
};
export default SMP;