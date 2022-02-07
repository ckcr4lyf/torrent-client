"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var fs_1 = require("fs");
var writePiece = function (pieceIndex, pieces, fileMap, metadata) { return __awaiter(void 0, void 0, void 0, function () {
    var pieceSize, mainOffset, fileIndex, fileObject, bytesWritten, writeOffset, i, fileSeek, bytesToWrite, fileHandle;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                pieceSize = pieces[pieceIndex].size;
                mainOffset = pieceIndex * metadata.pieceSize;
                fileIndex = -1;
                fileObject = null;
                bytesWritten = 0;
                _a.label = 1;
            case 1:
                if (!(bytesWritten < pieceSize)) return [3 /*break*/, 5];
                writeOffset = mainOffset + bytesWritten;
                //Find the file which corresponds to this writeOffset
                for (i = 0; i < fileMap.length; i++) {
                    fileObject = fileMap[i];
                    if (fileObject.offset <= writeOffset && (fileObject.offset + fileObject.size) > writeOffset) {
                        fileIndex = i;
                        break;
                    }
                }
                if (fileIndex == -1) {
                    //Wtf
                    return [3 /*break*/, 5];
                }
                fileSeek = writeOffset - fileObject.offset;
                bytesToWrite = fileObject.size - fileSeek;
                if (bytesToWrite > pieceSize - bytesWritten) {
                    //We dont have that many bytes. Write as much as we can
                    bytesToWrite = pieceSize - bytesWritten;
                }
                //Write to the file
                console.log("[I/O] Wrtiting Piece #" + pieceIndex + " to file " + fileObject.name);
                return [4 /*yield*/, fs_1.promises.open(fileObject.name, 'a+')];
            case 2:
                fileHandle = _a.sent();
                return [4 /*yield*/, fileHandle.write(pieces[pieceIndex].data, bytesWritten, bytesToWrite, fileSeek)];
            case 3:
                _a.sent();
                return [4 /*yield*/, fileHandle.close()];
            case 4:
                _a.sent();
                console.log("[I/O] Finished Wrtiting Piece #" + pieceIndex + " to file " + fileObject.name + "!");
                pieces[pieceIndex].written = true;
                return [3 /*break*/, 1];
            case 5: return [2 /*return*/];
        }
    });
}); };
var blockRequestMessage = function (pieceIndex, pieceOffset, dataSize) {
    var message = Buffer.alloc(17); //4 bytes size, 1 byte BT msg, 4bytes piece index, 4bytes offset, 4bytes length
    message.writeInt32BE(13, 0); //We know its 13 bytes length
    message.writeInt8(6, 4);
    message.writeInt32BE(pieceIndex, 5);
    message.writeInt32BE(pieceOffset, 9);
    message.writeInt32BE(pieceOffset, 13);
    return message;
};
function handshakeMessage(infoHash, peerId) {
    var protoLen = Buffer.alloc(1, 19);
    var protocolName = Buffer.from("BitTorrent protocol");
    var reserved = Buffer.from("0000000000100005", 'hex');
    var message = Buffer.concat([protoLen, protocolName, reserved, Buffer.from(infoHash, 'hex'), Buffer.from(peerId, 'hex')]);
    return message;
}
exports.handshakeMessage = handshakeMessage;
var interestedMessage = function () {
    return Buffer.from("0000000102", 'hex');
};
