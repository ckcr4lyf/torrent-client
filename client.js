"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var net_1 = require("net");
var functions_1 = require("./functions");
var events_1 = require("events");
var peer = /** @class */ (function (_super) {
    __extends(peer, _super);
    function peer(ip, port, metadata, peerId) {
        var _this = _super.call(this) || this;
        _this.connect = function () {
            _this.client.connect(_this.port, _this.ip, function () {
                console.log("[TCP] Conneted to remote @ " + _this.ip + ":" + _this.port);
                _this.client.write(functions_1.handshakeMessage(_this.torrentMetadata.infohash, _this.peerId));
                console.log("[TCP] Sent Bittorrent Handshake...");
            });
        };
        _this.handleRecvData = function (data) {
            if (data.length <= 4) {
                //Probably bitfield or some shit. Lets just ignore it.
                return;
            }
            if (!_this.recvHandshake) {
                if (data.length >= 68) {
                    var protocolLength = data.readInt8(0);
                    if (protocolLength != 19) {
                        return; //kill?
                    }
                    var protocolName = data.subarray(1, 20).toString();
                    if (protocolName != "BitTorrent protocol") {
                        return; //kill?
                    }
                    //We ignore the reserved bytes 21 - 28 cause fuck it.
                    var infoHash = data.subarray(28, 48).toString('hex');
                    if (infoHash != _this.torrentMetadata.infohash) {
                        return; //kill?
                    }
                    var peerId = data.subarray(48, 68).toString('hex');
                    //Not sure what to do with this for now.
                    //Anyway valid handshake. Lets go
                    _this.recvHandshake = true;
                    _this.emit('HSC'); //Hand Shake Complete - let the controller know we got a legit peer to ask shit from
                }
                else {
                    return; //kill?
                }
            }
            var messageLength = data.subarray(0, 4).readInt32BE(0);
            var messageId = data.readInt8(4);
            if (messageLength == 1 && messageId == 1) {
                //Unchoked
                _this.choked = false;
                console.log("[BT] Unchoked by peer!");
            }
        };
        _this.ip = ip;
        _this.port = port;
        _this.client = new net_1.Socket();
        _this.torrentMetadata = metadata;
        _this.peerId = peerId;
        _this.recvHandshake = false;
        _this.choked = true;
        return _this;
    }
    return peer;
}(events_1.EventEmitter));
